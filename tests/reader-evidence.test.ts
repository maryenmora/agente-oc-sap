import { afterEach, describe, expect, test } from "bun:test"
import { readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { readPackage } from "../src/domain/package-reader"
import { generateEvidence } from "../src/domain/evidence"
import { removeTestProject, testProject } from "./helpers"

const directories: string[] = []
afterEach(async () => Promise.all(directories.splice(0).map(removeTestProject)))

describe("lectura y evidencia", () => {
  test("lee y normaliza los documentos oficiales", async () => {
    const directory = await testProject(); directories.push(directory)
    const paquete = await readPackage(directory, "sol-005")
    expect(paquete.cotizacion?.total).toBe(3200000)
    expect(paquete.factura).toEqual({ numero: "FC-88231", fecha: "2026-08-10", total: 3200000 })
  })

  test("reporta cotización ausente como null", async () => {
    const directory = await testProject(); directories.push(directory)
    await Bun.file(join(directory, "fixtures", "reto-03", "solicitudes", "sol-001", "cotizacion.txt")).delete()
    const paquete = await readPackage(directory, "sol-001")
    expect(paquete.cotizacion).toBeNull()
    expect(paquete.faltantes).toContain("cotizacion.pdf")
  })

  test("devuelve error legible para JSON malformado", async () => {
    const directory = await testProject(); directories.push(directory)
    await writeFile(join(directory, "fixtures", "reto-03", "solicitudes", "sol-001", "solicitud.json"), "{")
    expect(readPackage(directory, "sol-001")).rejects.toThrow("JSON malformado")
  })

  test("genera TXT con encabezados y SHA-256", async () => {
    const directory = await testProject(); directories.push(directory)
    const result = await generateEvidence(directory, "sol-001", await readPackage(directory, "sol-001"))
    const text = await readFile(result.ruta, "utf8")
    expect(text).toContain("De: mlopez@periferia-ficticia.com")
    expect(text).toContain("Para: juan.camargo@periferia-ficticia.com")
    expect(text).toContain(`SHA-256: ${result.sha256}`)
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/)
  })
})
