export type LlmToolCall = {
  id: string
  name: string
  arguments: unknown
  rawArguments?: string
  invalidArguments?: boolean
}

export type LlmMessage = {
  role: "system" | "user" | "assistant" | "tool"
  content: string
  toolCallId?: string
  toolCalls?: LlmToolCall[]
}

export type LlmTool = {
  name: string
  description: string
  inputSchema: unknown
}

export type LlmResponse = {
  content: string
  toolCalls: LlmToolCall[]
  usageTokens?: number
}

export interface LlmAdapter {
  enviar(messages: LlmMessage[], tools: LlmTool[]): Promise<LlmResponse>
}
