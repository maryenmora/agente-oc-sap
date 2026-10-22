import { afterEach, describe, expect, test } from "bun:test"
import { createApi } from "../src/server"
import { removeTestProject, testProject } from "./helpers"

const directories: string[] = []
afterEach(async () => Promise.all(directories.splice(0).map(removeTestProject)))

describe("contrato frontend-backend", () => {
  test("la respuesta contiene historial, herramientas y estado consumido por React", async () => {
    const directory = await testProject(); directories.push(directory)
    const api = createApi(directory)
    const response = await api.fetch(new Request("http://local/api/chat", { method: "POST", body: JSON.stringify({ sessionId: "ui", message: "Procesa sol-005" }) }))
    const body = await response.json() as { session: { messages: Array<{ data?: Record<string, unknown> }>; pendingConfirmation: { codes: string[] } }; toolCalls: unknown[] }
    expect(body.session.messages.at(-1)?.data?.retroactiva).toBeTrue()
    expect(body.session.pendingConfirmation.codes).toEqual(["RC8"])
    expect(body.toolCalls).toHaveLength(2)
  })
})
