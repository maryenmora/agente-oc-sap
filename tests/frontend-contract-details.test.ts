import { afterEach, describe, expect, test } from "bun:test"
import { createApi } from "../src/server"
import { removeTestProject, testProject } from "./helpers"

const directories: string[] = []
afterEach(async () => Promise.all(directories.splice(0).map(removeTestProject)))

describe("contrato de datos para el panel React", () => {
  test("incluye payload, derivados y detalle de bloqueo", async () => {
    const directory = await testProject(); directories.push(directory)
    const api = createApi(directory)
    const call = async (id: string, message: string) => api.fetch(new Request("http://local/api/chat", { method: "POST", body: JSON.stringify({ sessionId: id, message }) }))
    const first = await call("one", "Procesa sol-001")
    const success = await first.json() as { data: { payload: unknown } }
    expect(success.data.payload).toBeDefined()
    const second = await call("two", "Procesa sol-003")
    const blocked = await second.json() as { data: { detalle_bloqueos: Array<{ codigo: string; detalle: string }> } }
    expect(blocked.data.detalle_bloqueos[0]).toEqual({ codigo: "RC2", detalle: "El remitente no es aprobador del centro de costo" })
    const third = await call("three", "Procesa sol-006")
    const derived = await third.json() as { data: { derivados: { indicador_iva: string; condiciones_pago: string } } }
    expect(derived.data.derivados).toMatchObject({ indicador_iva: "C1", condiciones_pago: "Z030" })
  })
})
