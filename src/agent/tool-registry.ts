import { z } from "zod"
import { join } from "node:path"
import * as oc from "../tools/oc"
import type { ToolContext } from "../tools/types"
import { parseToolResult } from "../tools/types"
import type { LlmTool, LlmToolCall } from "../llm/adapter"
import { appendText, outRoot } from "../lib/files"
import type { ToolCallView } from "./types"

type RegisteredTool = { description: string; args: z.ZodType; execute: (args: never, context: ToolContext) => Promise<string> }

const processCaseArgs = z.object({
  caso: z.string().regex(/^sol-\d{3}$/).describe("Caso que el backend debe validar y procesar"),
})

const internalRegistry: Record<string, RegisteredTool> = {
  oc_leer_paquete: oc.leer_paquete,
  oc_validar: oc.validar,
  oc_generar_evidencia: oc.generar_evidencia,
  oc_construir_payload: oc.construir_payload,
  oc_crear: oc.crear,
}

const llmRegistry: Record<string, RegisteredTool> = {
  oc_leer_paquete: oc.leer_paquete,
  oc_validar: oc.validar,
  oc_procesar_caso: {
    description: "Solicita al backend aplicar controles y crear la OC solo cuando la sesión tenga autorización válida.",
    args: processCaseArgs,
    async execute() {
      return JSON.stringify({ ok: true, data: { accion: "backend" } })
    },
  },
}

export function llmTools(): LlmTool[] {
  return Object.entries(llmRegistry).map(([name, tool]) => ({ name, description: tool.description, inputSchema: z.toJSONSchema(tool.args, { io: "input" }) }))
}

export function isBackendProcessCall(call: LlmToolCall): boolean {
  return call.name === "oc_procesar_caso"
}

export function parseProcessCase(call: LlmToolCall): { ok: true; caso: string } | { ok: false; error: string } {
  if (call.invalidArguments) return { ok: false, error: "Argumentos JSON inválidos" }
  const parsed = processCaseArgs.safeParse(call.arguments)
  return parsed.success ? { ok: true, caso: parsed.data.caso } : { ok: false, error: parsed.error.issues.map((issue) => issue.message).join(", ") }
}

export async function executeTool(name: string, rawArgs: unknown, ctx: ToolContext, callId: string = crypto.randomUUID(), allowInternal = true, invalidArguments = false): Promise<ToolCallView> {
  const tool = allowInternal ? internalRegistry[name] : llmRegistry[name]
  if (!tool || (!allowInternal && name === "oc_procesar_caso")) {
    const result = { ok: false, error: "Herramienta no permitida" }
    await log(ctx, name, rawArgs, result)
    return { id: callId, name, arguments: {}, status: "failed", result }
  }
  if (invalidArguments) {
    const result = { ok: false, error: "Argumentos JSON inválidos" }
    await log(ctx, name, rawArgs, result)
    return { id: callId, name, arguments: {}, status: "failed", result }
  }
  const parsed = tool.args.safeParse(rawArgs)
  if (!parsed.success) {
    const result = { ok: false, error: `Argumentos inválidos: ${parsed.error.issues.map((issue) => issue.message).join(", ")}` }
    await log(ctx, name, rawArgs, result)
    return { id: callId, name, arguments: (rawArgs ?? {}) as Record<string, unknown>, status: "failed", result }
  }
  const result = parseToolResult(await tool.execute(parsed.data as never, ctx))
  await log(ctx, name, parsed.data, result)
  return { id: callId, name, arguments: parsed.data as Record<string, unknown>, status: result.ok ? "completed" : "failed", result }
}

export async function logBackendTool(ctx: ToolContext, call: LlmToolCall, result: unknown): Promise<void> {
  await log(ctx, call.name, call.arguments, result)
}

async function log(ctx: ToolContext, name: string, args: unknown, result: unknown): Promise<void> {
  await appendText(join(outRoot(ctx.directory), "log.jsonl"), `${JSON.stringify({ ts: new Date().toISOString(), sessionId: ctx.sessionId, tool: name, args, result })}\n`)
}
