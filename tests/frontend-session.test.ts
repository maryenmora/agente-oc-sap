import { describe, expect, test } from "bun:test"
import { createApi } from "../src/server"
import { AgentRuntime } from "../src/agent/runtime"
import { removeTestProject, testProject } from "./helpers"

describe("estabilidad de sesión del frontend", () => {
  test("persiste el identificador por pestaña con sessionStorage", async () => {
    const source = await Bun.file(`${import.meta.dir}/../web/src/App.tsx`).text()
    expect(source).toContain('"agente-oc-sap.session-id"')
    expect(source).toContain("window.sessionStorage.getItem")
    expect(source).toContain("window.sessionStorage.setItem")
    expect(source).not.toContain("window.localStorage.getItem")
  })

  test("la sesión pendiente puede recuperarse por API después de recargar", async () => {
    const directory = await testProject()
    try {
      const runtime = new AgentRuntime(directory, { llm: null, maxIterations: 25, maxTokensPerSession: 20_000 })
      const api = createApi(directory, runtime)
      await api.fetch(new Request("http://local/api/chat", { method: "POST", body: JSON.stringify({ sessionId: "tab-a", message: "Procesa sol-004" }) }))
      const response = await api.fetch(new Request("http://local/api/sessions/tab-a"))
      const restored = await response.json() as { pendingConfirmation: { caso: string }; messages: unknown[] }
      expect(restored.pendingConfirmation.caso).toBe("sol-004")
      expect(restored.messages).toHaveLength(2)
    } finally {
      await removeTestProject(directory)
    }
  })

  test("dos sesiones no comparten confirmación ni permiten cruzar de caso", async () => {
    const directory = await testProject()
    try {
      const runtime = new AgentRuntime(directory, { llm: null, maxIterations: 25, maxTokensPerSession: 20_000 })
      const api = createApi(directory, runtime)
      const post = async (sessionId: string, message: string) => api.fetch(new Request("http://local/api/chat", { method: "POST", body: JSON.stringify({ sessionId, message }) }))
      await post("tab-a", "Procesa sol-004")
      const other = await post("tab-b", "Confirmo RC5 de sol-004")
      const otherData = await other.json() as { data: { resultado: string; numero_oc: string | null } }
      expect(otherData.data.resultado).toBe("pendiente_confirmacion")
      expect(otherData.data.numero_oc).toBeNull()
      const crossed = await post("tab-a", "Procesa sol-006")
      const crossedData = await crossed.json() as { data: { resultado: string } }
      expect(crossedData.data.resultado).toBe("pendiente_confirmacion")
      const session = runtime.sessions.get("tab-a")
      expect(session?.pendingConfirmation?.caso).toBe("sol-004")
    } finally {
      await removeTestProject(directory)
    }
  })
})
