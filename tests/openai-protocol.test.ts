import { afterEach, describe, expect, test } from "bun:test"
import { OpenAiCompatibleAdapter } from "../src/llm/openai-compatible"

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })

describe("protocolo OpenAI-compatible", () => {
  test("preserva assistant tool_calls antes de tool results", async () => {
    let body: Record<string, unknown> = {}
    globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
      body = JSON.parse(String(init?.body)) as Record<string, unknown>
      return Response.json({ choices: [{ message: { content: "fin" } }], usage: { total_tokens: 5 } })
    }) as unknown as typeof fetch
    const adapter = new OpenAiCompatibleAdapter({ apiKey: "secret", baseUrl: "http://local/v1", model: "m", timeoutMs: 500 })
    await adapter.enviar([
      { role: "user", content: "hola" },
      { role: "assistant", content: "", toolCalls: [{ id: "call-1", name: "oc_leer_paquete", arguments: { caso: "sol-001" } }] },
      { role: "tool", content: "{\"ok\":true}", toolCallId: "call-1" },
    ], [])
    const messages = body.messages as Array<Record<string, unknown>>
    expect(messages[1]?.tool_calls).toBeDefined()
    expect(messages[2]?.tool_call_id).toBe("call-1")
  })

  test("marca JSON inválido de argumentos sin lanzar", async () => {
    globalThis.fetch = (async () => Response.json({ choices: [{ message: { tool_calls: [{ id: "bad", function: { name: "oc_leer_paquete", arguments: "{" } }] } }] })) as unknown as typeof fetch
    const adapter = new OpenAiCompatibleAdapter({ apiKey: "secret", baseUrl: "http://local/v1", model: "m", timeoutMs: 500 })
    const response = await adapter.enviar([], [])
    expect(response.toolCalls[0]?.invalidArguments).toBeTrue()
    expect(response.toolCalls[0]?.rawArguments).toBe("{")
  })

  test("timeout traduce AbortError a error legible", async () => {
    globalThis.fetch = ((_input: string | URL | Request, init?: RequestInit) => new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))))) as unknown as typeof fetch
    const adapter = new OpenAiCompatibleAdapter({ apiKey: "secret", baseUrl: "http://local/v1", model: "m", timeoutMs: 1 })
    expect(adapter.enviar([], [])).rejects.toThrow("Tiempo de espera")
  })
})
