import { join } from "node:path"
import { z } from "zod"
import { AgentRuntime } from "./agent/runtime"

const ChatSchema = z.object({ sessionId: z.string().min(1), message: z.string().min(1).max(4_000) })

export function createApi(directory: string, runtime = new AgentRuntime(directory)): { fetch(request: Request): Promise<Response> } {
  return {
    async fetch(request) {
      const url = new URL(request.url)
      try {
        if (request.method === "GET" && url.pathname === "/api/health") {
          return json({ ok: true, provider: Bun.env.LLM_API_KEY || Bun.env.OPENAI_API_KEY ? "openai-compatible" : "local-deterministic", model: Bun.env.LLM_MODEL ?? "not-configured" })
        }
        if (request.method === "GET" && url.pathname.startsWith("/api/sessions/")) {
          const id = decodeURIComponent(url.pathname.slice("/api/sessions/".length))
          const session = runtime.sessions.get(id)
          return session ? json(session) : json({ error: "Sesión no encontrada" }, 404)
        }
        if (request.method === "POST" && url.pathname === "/api/chat") {
          const body = ChatSchema.safeParse(await request.json())
          if (!body.success) return json({ error: "Solicitud inválida", details: body.error.issues }, 400)
          return json(await runtime.chat(body.data.sessionId, body.data.message))
        }
        return json({ error: "Ruta no encontrada" }, 404)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error inesperado"
        return json({ error: message }, message.includes("límite") ? 429 : 500)
      }
    },
  }
}

function json(value: unknown, status = 200): Response {
  return Response.json(value, { status, headers: { "cache-control": "no-store" } })
}

if (import.meta.main) {
  const port = Number(Bun.env.PORT ?? 3000)
  const api = createApi(join(import.meta.dir, ".."))
  Bun.serve({ port, fetch: api.fetch })
  console.log(`API disponible en http://localhost:${port}`)
}
