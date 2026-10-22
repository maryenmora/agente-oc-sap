export type ToolCall = { id: string; name: string; arguments: Record<string, unknown>; status: "completed" | "failed"; result: unknown }
export type Message = { id: string; role: "user" | "assistant"; content: string; createdAt: string; toolCalls?: ToolCall[]; data?: Record<string, unknown> }
export type Pending = { caso: string; codes: string[]; details: Array<{ codigo: string; detalle: string }> }
export type Session = { id: string; messages: Message[]; pendingConfirmation: Pending | null }
export type ChatResponse = { reply: string; toolCalls: ToolCall[]; needsConfirmation: boolean; session: Session; data?: Record<string, unknown> }

export async function fetchHealth(): Promise<{ ok: boolean; provider: string; model: string }> {
  const response = await fetch("/api/health")
  if (!response.ok) throw new Error("API no disponible")
  return await response.json() as { ok: boolean; provider: string; model: string }
}

export async function fetchSession(sessionId: string): Promise<Session | null> {
  const response = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`)
  if (response.status === 404) return null
  if (!response.ok) throw new Error("No fue posible recuperar la sesión")
  return await response.json() as Session
}

export async function sendMessage(sessionId: string, message: string): Promise<ChatResponse> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId, message }),
  })
  const body = await response.json() as ChatResponse | { error: string }
  if (!response.ok) throw new Error("error" in body ? body.error : "Error del servidor")
  return body as ChatResponse
}
