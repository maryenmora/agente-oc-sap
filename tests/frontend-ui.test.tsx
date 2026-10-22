import { GlobalRegistrator } from "@happy-dom/global-registrator"
import { afterAll, describe, expect, test } from "bun:test"

GlobalRegistrator.register()
const { act, fireEvent, render, screen, waitFor } = await import("@testing-library/react")
const { App } = await import("../web/src/App")
afterAll(async () => GlobalRegistrator.unregister())

describe("estados de carga y error de React", () => {
  test("muestra carga durante la solicitud y error legible al fallar", async () => {
    let resolveChat: ((response: Response) => void) | undefined
    globalThis.fetch = ((input: string | URL | Request) => {
      const url = String(input)
      if (url.endsWith("/api/health")) return Promise.resolve(Response.json({ ok: true, provider: "local-deterministic", model: "not-configured" }))
      return new Promise<Response>((resolve) => { resolveChat = resolve })
    }) as typeof fetch
    render(<App />)
    fireEvent.change(screen.getByLabelText("Mensaje"), { target: { value: "Procesa sol-001" } })
    fireEvent.click(screen.getByText("Enviar"))
    expect((await screen.findByRole("status")).textContent).toContain("Procesando con herramientas")
    await act(async () => resolveChat?.(Response.json({ error: "Proveedor no disponible" }, { status: 500 })))
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Proveedor no disponible"))
  })
})
