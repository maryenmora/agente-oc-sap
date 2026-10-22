import type { LlmAdapter, LlmMessage, LlmResponse, LlmTool, LlmToolCall } from "./adapter"

type ProviderToolCall = { id: string; type?: string; function: { name: string; arguments: string } }
type ProviderPayload = {
  choices?: Array<{ message?: { content?: string | null; tool_calls?: ProviderToolCall[] } }>
  usage?: { total_tokens?: number }
}

export class OpenAiCompatibleAdapter implements LlmAdapter {
  constructor(
    private readonly config: { apiKey: string; baseUrl: string; model: string; timeoutMs: number },
  ) {}

  async enviar(messages: LlmMessage[], tools: LlmTool[]): Promise<LlmResponse> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs)
    try {
      const response = await fetch(`${this.config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: { "content-type": "application/json", authorization: `Bearer ${this.config.apiKey}` },
        body: JSON.stringify({
          model: this.config.model,
          messages: messages.map(toProviderMessage),
          tools: tools.map((tool) => ({ type: "function", function: { name: tool.name, description: tool.description, parameters: tool.inputSchema } })),
          tool_choice: "auto",
        }),
      })
      if (!response.ok) throw new Error(`Proveedor LLM respondió ${response.status}`)
      const payload = await response.json() as ProviderPayload
      const message = payload.choices?.[0]?.message
      if (!message) throw new Error("Proveedor LLM no devolvió un mensaje")
      const result: LlmResponse = {
        content: message.content ?? "",
        toolCalls: (message.tool_calls ?? []).map(toToolCall),
      }
      if (payload.usage?.total_tokens !== undefined) result.usageTokens = payload.usage.total_tokens
      return result
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw new Error("Tiempo de espera agotado con el proveedor LLM")
      throw error
    } finally {
      clearTimeout(timeout)
    }
  }
}

function toToolCall(call: ProviderToolCall): LlmToolCall {
  try {
    return { id: call.id, name: call.function.name, arguments: JSON.parse(call.function.arguments) as unknown, rawArguments: call.function.arguments }
  } catch {
    return { id: call.id, name: call.function.name, arguments: {}, rawArguments: call.function.arguments, invalidArguments: true }
  }
}

function toProviderMessage(message: LlmMessage): Record<string, unknown> {
  if (message.role === "tool") return { role: "tool", content: message.content, tool_call_id: message.toolCallId }
  if (message.role === "assistant" && message.toolCalls?.length) {
    return {
      role: "assistant",
      content: message.content || null,
      tool_calls: message.toolCalls.map((call) => ({
        id: call.id,
        type: "function",
        function: { name: call.name, arguments: call.rawArguments ?? JSON.stringify(call.arguments) },
      })),
    }
  }
  return { role: message.role, content: message.content }
}

export function configuredLlmAdapter(env: Record<string, string | undefined> = Bun.env): LlmAdapter | null {
  const apiKey = env.LLM_API_KEY
  const baseUrl = env.LLM_BASE_URL
  const model = env.LLM_MODEL
  if (!apiKey || !baseUrl || !model) return null
  return new OpenAiCompatibleAdapter({ apiKey, baseUrl, model, timeoutMs: Number(env.LLM_TIMEOUT_MS ?? 20_000) })
}
