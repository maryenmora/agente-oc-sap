import { join } from "node:path"
import type { LlmAdapter, LlmMessage } from "../llm/adapter"
import { configuredLlmAdapter } from "../llm/openai-compatible"
import { executeTool, isBackendProcessCall, llmTools, logBackendTool, parseProcessCase } from "./tool-registry"
import { extractCase } from "./message-parser"
import type { ChatResponse, Session, ToolCallView } from "./types"
import { SessionStore } from "./sessions"
import { processForSession } from "./orchestration"

const promptPath = join(import.meta.dir, "..", "..", "agent", "prompt.md")
type PartialResponse = Omit<ChatResponse, "needsConfirmation" | "session">

export class AgentRuntime {
  readonly sessions = new SessionStore()
  constructor(
    private readonly directory: string,
    private readonly options: { maxIterations: number; maxTokensPerSession: number; llm: LlmAdapter | null } = {
      maxIterations: Number(Bun.env.MAX_TOOL_ITERATIONS ?? 25),
      maxTokensPerSession: Number(Bun.env.MAX_SESSION_TOKENS ?? 20_000),
      llm: configuredLlmAdapter(),
    },
  ) {}

  async chat(sessionId: string, message: string): Promise<ChatResponse> {
    const session = this.sessions.getOrCreate(sessionId)
    this.reserveEstimatedTokens(session, message)
    this.add(session, "user", message)
    try {
      const response = this.options.llm ? await this.withLlm(session, message) : await this.local(session, message)
      this.reserveEstimatedTokens(session, response.reply)
      this.add(session, "assistant", response.reply, response.toolCalls, response.data)
      return { ...response, needsConfirmation: session.pendingConfirmation !== null, session }
    } finally {
      this.sessions.update(session)
    }
  }

  private async local(session: Session, message: string): Promise<PartialResponse> {
    const caseId = session.pendingConfirmation?.caso ?? extractCase(message)
    if (!caseId) return { reply: this.askCase(), toolCalls: [] }
    const calls = session.pendingConfirmation ? [] : await this.readAndValidate(session, caseId)
    if (calls.some((call) => call.status === "failed")) return { reply: "No pude leer o validar el paquete. La sesión continúa disponible para reintentar.", toolCalls: calls }
    const result = await processForSession(this.directory, session, caseId, message)
    return { reply: result.reply, toolCalls: calls, data: result.data }
  }

  private async withLlm(session: Session, message: string): Promise<PartialResponse> {
    const prompt = await Bun.file(promptPath).text()
    const conversation: LlmMessage[] = [{ role: "system", content: prompt }, ...session.messages.map((item) => ({ role: item.role, content: item.content }))]
    const calls: ToolCallView[] = []
    const pendingAtTurnStart = session.pendingConfirmation?.caso ?? null
    const processedThisTurn = new Map<string, { ok: true; data: Record<string, unknown> }>()
    let data: Record<string, unknown> | undefined
    for (let iteration = 0; iteration < this.options.maxIterations; iteration += 1) {
      const response = await this.options.llm!.enviar(conversation, llmTools())
      if (response.usageTokens !== undefined) this.addActualTokens(session, response.usageTokens)
      else this.reserveEstimatedTokens(session, JSON.stringify(conversation))
      if (response.toolCalls.length === 0) {
        return { reply: data ? this.businessReply(data, response.content) : response.content || "No recibí una respuesta del proveedor.", toolCalls: calls, ...(data ? { data } : {}) }
      }
      conversation.push({ role: "assistant", content: response.content, toolCalls: response.toolCalls })
      for (const call of response.toolCalls) {
        const ctx = { directory: this.directory, sessionId: session.id }
        if (isBackendProcessCall(call)) {
          const parsed = parseProcessCase(call)
          const pending = session.pendingConfirmation
          let result: { ok: true; data: Record<string, unknown> } | { ok: false; error: string }
          if (!parsed.ok) result = { ok: false, error: parsed.error }
          else if (pending && pending.caso !== parsed.caso) result = { ok: false, error: `Existe una confirmación pendiente para ${pending.caso}; no aplica a ${parsed.caso}` }
          else {
            const cached = processedThisTurn.get(parsed.caso)
            if (cached) result = cached
            else {
              const allowDecision = pendingAtTurnStart === parsed.caso
              result = { ok: true, data: (await processForSession(this.directory, session, parsed.caso, message, allowDecision)).data }
              processedThisTurn.set(parsed.caso, result)
            }
          }
          if (result.ok) data = result.data
          await logBackendTool(ctx, call, result)
          const view: ToolCallView = { id: call.id, name: call.name, arguments: (call.arguments ?? {}) as Record<string, unknown>, status: result.ok ? "completed" : "failed", result }
          calls.push(view)
          conversation.push({ role: "tool", content: JSON.stringify(result), toolCallId: call.id })
          continue
        }
        const view = await executeTool(call.name, call.arguments, ctx, call.id, false, call.invalidArguments === true)
        calls.push(view)
        conversation.push({ role: "tool", content: JSON.stringify(view.result), toolCallId: call.id })
      }
    }
    throw new Error("Se alcanzó el límite de iteraciones de herramientas")
  }

  private businessReply(data: Record<string, unknown>, modelContent: string): string {
    if (typeof data.narrative === "string") return data.narrative
    const result = data.resultado
    const caso = String(data.caso ?? "el caso")
    if (result === "bloqueado") return `La solicitud ${caso} está bloqueada por ${(data.bloqueos as string[]).join(", ")}. No se creó la OC.`
    if (result === "pendiente_confirmacion") return `La solicitud ${caso} requiere confirmación explícita. No se creó la OC.`
    if (result === "rechazado") return `La confirmación para ${caso} fue rechazada. No se creó la OC.`
    if (result === "exitoso" || result === "idempotente") return `La OC para ${caso} ${result === "idempotente" ? "ya existía" : "fue creada"}. Número: ${String(data.numero_oc)}.`
    return modelContent
  }

  private async readAndValidate(session: Session, caseId: string): Promise<ToolCallView[]> {
    const ctx = { directory: this.directory, sessionId: session.id }
    const read = await executeTool("oc_leer_paquete", { caso: caseId }, ctx)
    if (read.status === "failed") return [read]
    const validate = await executeTool("oc_validar", { caso: caseId, paquete: (read.result as { data: unknown }).data }, ctx)
    return [read, validate]
  }

  private askCase(): string {
    return "Soy el asistente de órdenes de compra SAP. Indícame el caso, por ejemplo: procesa sol-004."
  }

  private reserveEstimatedTokens(session: Session, text: string): void {
    const estimated = Math.ceil(text.length / 3)
    this.ensureTokenBudget(session, estimated)
    session.estimatedTokenCount += estimated
  }

  private addActualTokens(session: Session, tokens: number): void {
    this.ensureTokenBudget(session, tokens)
    session.actualTokenCount += tokens
  }

  private ensureTokenBudget(session: Session, next: number): void {
    if (session.actualTokenCount + session.estimatedTokenCount + next > this.options.maxTokensPerSession) {
      throw new Error("La sesión superó el límite de tokens configurado")
    }
  }

  private add(session: Session, role: "user" | "assistant", content: string, toolCalls?: ToolCallView[], data?: Record<string, unknown>): void {
    session.messages.push({ id: crypto.randomUUID(), role, content, createdAt: new Date().toISOString(), ...(toolCalls?.length ? { toolCalls } : {}), ...(data ? { data } : {}) })
  }
}
