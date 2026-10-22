import { afterEach, describe, expect, test } from "bun:test"
import { configuredLlmAdapter, OpenAiCompatibleAdapter } from "../src/llm/openai-compatible"

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })

describe("adaptador OpenAI-compatible", () => {
  test("no se configura sin credencial, URL y modelo", () => {
    expect(configuredLlmAdapter({})).toBeNull()
  })

  test("envía herramientas y traduce tool calls", async () => {
    let authorization = ""
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      authorization = new Headers(init?.headers).get("authorization") ?? ""
      return Response.json({ choices: [{ message: { content: null, tool_calls: [{ id: "x", function: { name: "oc_leer_paquete", arguments: "{\"caso\":\"sol-001\"}" } }] } }], usage: { total_tokens: 10 } })
    }) as typeof fetch
    const adapter = new OpenAiCompatibleAdapter({ apiKey: "secret", baseUrl: "https://example.test/v1", model: "model", timeoutMs: 1000 })
    const result = await adapter.enviar([{ role: "user", content: "hola" }], [])
    expect(authorization).toBe("Bearer secret")
    expect(result.toolCalls[0]?.arguments).toEqual({ caso: "sol-001" })
  })

  test("propaga errores HTTP sin revelar credencial", async () => {
    globalThis.fetch = (async () => new Response("bad", { status: 401 })) as unknown as typeof fetch
    const adapter = new OpenAiCompatibleAdapter({ apiKey: "secret", baseUrl: "https://example.test/v1", model: "model", timeoutMs: 1000 })
    expect(adapter.enviar([], [])).rejects.toThrow("Proveedor LLM respondió 401")
  })
})
