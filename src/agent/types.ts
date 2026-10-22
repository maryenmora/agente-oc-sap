export type ToolCallView = {
  id: string
  name: string
  arguments: Record<string, unknown>
  status: "completed" | "failed"
  result: unknown
}

export type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: string
  toolCalls?: ToolCallView[]
  data?: Record<string, unknown>
}

export type PendingConfirmation = {
  caso: string
  codes: string[]
  details: Array<{ codigo: string; detalle: string }>
  acceptedCodes: string[]
}

export type Session = {
  id: string
  messages: ChatMessage[]
  pendingConfirmation: PendingConfirmation | null
  actualTokenCount: number
  estimatedTokenCount: number
  createdAt: string
  updatedAt: string
}

export type ChatResponse = {
  reply: string
  toolCalls: ToolCallView[]
  needsConfirmation: boolean
  session: Session
  data?: Record<string, unknown>
}
