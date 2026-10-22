import { afterEach, describe, expect, test } from "bun:test"
import { access, readFile } from "node:fs/promises"
import { join } from "node:path"
import { readPackage } from "../src/domain/package-reader"
import { loadMasters } from "../src/domain/master-loader"
import { validatePackage } from "../src/domain/validation"
import { generateEvidence } from "../src/domain/evidence"
import { buildPayload } from "../src/domain/payload"
import { issueAuthorization } from "../src/domain/authorization"
import { oc_crear } from "../src/tools/oc"
import { parseToolResult } from "../src/tools/types"
import { removeTestProject, testProject } from "./helpers"

const directories: string[] = []
afterEach(async () => Promise.all(directories.splice(0).map(removeTestProject)))

async function authorized(directory: string, caso = "sol-001", codes: string[] = []) {
  const paquete = await readPackage(directory, caso)
  const validation = validatePackage(paquete, await loadMasters(directory))
  const evidence = await generateEvidence(directory, caso, paquete)
  const built = await buildPayload(directory, caso, paquete, validation, evidence.sha256, codes, "tester")
  await issueAuthorization(directory, caso, built.payload, validation, codes, "tester", "session")
  return { paquete, validation, built }
}

describe("payload, autorización y creación", () => {
  test("genera payload con hash y trazabilidad", async () => {
    const directory = await testProject(); directories.push(directory)
    const { built } = await authorized(directory)
    expect(built.payload.aprobador.evidencia_sha256).toMatch(/^[a-f0-9]{64}$/)
    expect(built.payload.posiciones[0]?.descripcion.length).toBeLessThanOrEqual(40)
    expect(await Bun.file(built.trazabilidadRuta).exists()).toBeTrue()
  })

  test("impide crear sin autorización backend", async () => {
    const directory = await testProject(); directories.push(directory)
    const paquete = await readPackage(directory, "sol-001")
    const validation = validatePackage(paquete, await loadMasters(directory))
    const evidence = await generateEvidence(directory, "sol-001", paquete)
    const built = await buildPayload(directory, "sol-001", paquete, validation, evidence.sha256)
    const result = parseToolResult(await oc_crear.execute({ caso: "sol-001", payload: built.payload }, { directory, sessionId: "session" }))
    expect(result.ok).toBeFalse()
  })

  test("impide crear con confirmación pendiente", async () => {
    const directory = await testProject(); directories.push(directory)
    const paquete = await readPackage(directory, "sol-004")
    const validation = validatePackage(paquete, await loadMasters(directory))
    const evidence = await generateEvidence(directory, "sol-004", paquete)
    const built = await buildPayload(directory, "sol-004", paquete, validation, evidence.sha256)
    expect(issueAuthorization(directory, "sol-004", built.payload, validation, [], null, "session")).rejects.toThrow("confirmaciones pendientes")
  })

  test("crea e implementa idempotencia", async () => {
    const directory = await testProject(); directories.push(directory)
    const { built } = await authorized(directory)
    const first = parseToolResult<{ numero_oc: string; idempotente: boolean }>(await oc_crear.execute({ caso: "sol-001", payload: built.payload }, { directory, sessionId: "session" }))
    const second = parseToolResult<{ numero_oc: string; idempotente: boolean }>(await oc_crear.execute({ caso: "sol-001", payload: built.payload }, { directory, sessionId: "session" }))
    expect(first.ok && first.data.numero_oc).toBe("4500000001")
    expect(second.ok && second.data.idempotente).toBeTrue()
    const lines = (await readFile(join(directory, "out", "sap", "ordenes.jsonl"), "utf8")).trim().split("\n")
    expect(lines).toHaveLength(1)
  })

  test("detecta payload alterado después de autorizar", async () => {
    const directory = await testProject(); directories.push(directory)
    const { built } = await authorized(directory)
    built.payload.posiciones[0]!.precio_unitario += 1
    const result = parseToolResult(await oc_crear.execute({ caso: "sol-001", payload: built.payload }, { directory, sessionId: "session" }))
    expect(result.ok).toBeFalse()
    expect(access(join(directory, "out", "sap", "ordenes.jsonl"))).rejects.toThrow()
  })
})
