import { afterEach, describe, expect, test } from "bun:test"
import { OpenAiCompatibleAdapter } from "../src/llm/openai-compatible"

let server: ReturnType<typeof Bun.serve> | null = null
afterEach(() => { server?.stop(); server = null })

describe("proveedor HTTP OpenAI-compatible simulado", () => {
  test("valida orden assistant tool_calls y resultado tool con el id correspondiente", async () => {
    let requestCount = 0
    server = Bun.serve({ port: 0, fetch: async (request) => {
      requestCount += 1
      const body = await request.json() as { messages: Array<{ role: string; tool_calls?: Array<{ id: string }>; tool_call_id?: string }> }
      if (requestCount === 1) return Response.json({ choices: [{ message: { content: "", tool_calls: [{ id: "call-1", function: { name: "oc_leer_paquete", arguments: "{\"caso\":\"sol-001\"}" } }] } }], usage: { total_tokens: 4 } })
      expect(body.messages.at(-2)?.role).toBe("assistant")
      expect(body.messages.at(-2)?.tool_calls?.[0]?.id).toBe("call-1")
      expect(body.messages.at(-1)?.role).toBe("tool")
      expect(body.messages.at(-1)?.tool_call_id).toBe("call-1")
      return Response.json({ choices: [{ message: { content: "completo" } }], usage: { total_tokens: 6 } })
    } })
    const adapter = new OpenAiCompatibleAdapter({ apiKey: "test-key", baseUrl: `http://127.0.0.1:${server.port}/v1`, model: "test", timeoutMs: 500 })
    const first = await adapter.enviar([{ role: "user", content: "hola" }], [])
    const second = await adapter.enviar([
      { role: "user", content: "hola" },
      { role: "assistant", content: first.content, toolCalls: first.toolCalls },
      { role: "tool", content: "{\"ok\":true}", toolCallId: "call-1" },
    ], [])
    expect(second.content).toBe("completo")
    expect(requestCount).toBe(2)
  })
})
