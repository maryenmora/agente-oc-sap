import type { ZodType } from "zod"

export type ToolContext = {
  directory: string
  sessionId: string
}

export type ToolDefinition<TArgs> = {
  description: string
  args: ZodType<TArgs>
  execute(args: TArgs, ctx: ToolContext): Promise<string>
}

export type ToolSuccess<T> = { ok: true; data: T }
export type ToolFailure = { ok: false; error: string }
export type ToolResult<T> = ToolSuccess<T> | ToolFailure

export function success<T>(data: T): string {
  return JSON.stringify({ ok: true, data } satisfies ToolSuccess<T>)
}

export function failure(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return JSON.stringify({ ok: false, error: message } satisfies ToolFailure)
}

export function parseToolResult<T>(value: string): ToolResult<T> {
  return JSON.parse(value) as ToolResult<T>
}
