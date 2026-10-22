import { afterEach, describe, expect, test } from "bun:test"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { processCase } from "../src/orchestrator/processor"
import { removeTestProject, testProject } from "./helpers"

const directories: string[] = []
afterEach(async () => Promise.all(directories.splice(0).map(removeTestProject)))

describe("orquestador y control", () => {
  test("diferencia pendiente, rechazado y aceptado", async () => {
    const directory = await testProject(); directories.push(directory)
    const pending = await processCase(directory, "sol-004", "session")
    const rejected = await processCase(directory, "sol-004", "session", { acceptedCodes: [], rejected: true, actor: "analista" })
    const accepted = await processCase(directory, "sol-004", "session", { acceptedCodes: ["RC5"], rejected: false, actor: "analista" })
    expect(pending.resultado).toBe("pendiente_confirmacion")
    expect(rejected.resultado).toBe("rechazado")
    expect(accepted.resultado).toBe("exitoso")
  })

  test("bloqueados no crean órdenes y control registra todos los estados", async () => {
    const directory = await testProject(); directories.push(directory)
    await processCase(directory, "sol-002", "session")
    await processCase(directory, "sol-005", "session")
    expect(await Bun.file(join(directory, "out", "sap", "ordenes.jsonl")).exists()).toBeFalse()
    const control = await readFile(join(directory, "out", "control.csv"), "utf8")
    expect(control).toContain("bloqueado")
    expect(control).toContain("pendiente_confirmacion")
  })

  test("sol-001 crea y la repetición es idempotente", async () => {
    const directory = await testProject(); directories.push(directory)
    const first = await processCase(directory, "sol-001", "session")
    const second = await processCase(directory, "sol-001", "session")
    expect(first.resultado).toBe("exitoso")
    expect(second.resultado).toBe("idempotente")
    expect(second.numero_oc).toBe(first.numero_oc)
  })
})
