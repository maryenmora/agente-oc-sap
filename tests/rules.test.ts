import { beforeAll, describe, expect, test } from "bun:test"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { readPackage } from "../src/domain/package-reader"
import { loadMasters } from "../src/domain/master-loader"
import { validatePackage } from "../src/domain/validation"
import type { Maestros } from "../src/domain/masters"
import type { Paquete } from "../src/domain/schemas"

const directory = joinRoot()
let masters: Maestros
let valid: Paquete

function joinRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..")
}

beforeAll(async () => {
  masters = await loadMasters(directory)
  valid = await readPackage(directory, "sol-001")
})

function codes(validation: ReturnType<typeof validatePackage>, key: "bloqueos" | "confirmaciones"): string[] {
  return validation[key].map((item) => item.codigo)
}

describe("RC1-RC10", () => {
  test("RC1 bloquea proveedor inexistente e inactivo y permite fallback por nombre", async () => {
    expect(codes(validatePackage(await readPackage(directory, "sol-002"), masters), "bloqueos")).toContain("RC1")
    expect(codes(validatePackage(await readPackage(directory, "sol-006"), masters), "bloqueos")).not.toContain("RC1")
    const inactive = structuredClone(valid)
    inactive.solicitud.proveedor_nit = "901777888"
    inactive.solicitud.proveedor_nombre = "Consultores Ágiles S.A.S."
    expect(codes(validatePackage(inactive, masters), "bloqueos")).toContain("RC1")
  })

  test("RC2 bloquea aprobación ausente, no afirmativa o sin autoridad", async () => {
    expect(codes(validatePackage(await readPackage(directory, "sol-003"), masters), "bloqueos")).toContain("RC2")
    const missing = structuredClone(valid); missing.aprobacion = null
    expect(codes(validatePackage(missing, masters), "bloqueos")).toContain("RC2")
  })

  test("RC3 bloquea tope excedido", () => {
    const value = structuredClone(valid)
    value.solicitud.valor_total = 60000000
    value.solicitud.cantidad = 600
    value.solicitud.valor_unitario = 100000
    value.cotizacion = value.cotizacion ? { ...value.cotizacion, total: 60000000 } : null
    expect(codes(validatePackage(value, masters), "bloqueos")).toContain("RC3")
  })

  test("RC4 bloquea subárea ajena", () => {
    const value = structuredClone(valid); value.solicitud.subarea = "Marketing"
    expect(codes(validatePackage(value, masters), "bloqueos")).toContain("RC4")
  })

  test("RC5 pide confirmación por ausencia o diferencia mayor al 2%", async () => {
    expect(codes(validatePackage(await readPackage(directory, "sol-004"), masters), "confirmaciones")).toContain("RC5")
    const value = structuredClone(valid); value.cotizacion = null
    expect(codes(validatePackage(value, masters), "confirmaciones")).toContain("RC5")
  })

  test("RC6 deriva IVA con confirmación", async () => {
    const validation = validatePackage(await readPackage(directory, "sol-006"), masters)
    expect(validation.derivados.indicador_iva).toBe("C1")
    expect(codes(validation, "confirmaciones")).toContain("RC6")
  })

  test("RC7 deriva pago sin confirmación", async () => {
    const validation = validatePackage(await readPackage(directory, "sol-006"), masters)
    expect(validation.derivados.condiciones_pago).toBe("Z030")
    expect(codes(validation, "confirmaciones")).not.toContain("RC7")
  })

  test("RC8 marca retroactividad", async () => {
    const validation = validatePackage(await readPackage(directory, "sol-005"), masters)
    expect(validation.retroactiva).toBeTrue()
    expect(codes(validation, "confirmaciones")).toContain("RC8")
  })

  test("RC9 pide confirmación por aprobación anterior", () => {
    const value = structuredClone(valid)
    if (value.aprobacion) value.aprobacion.fecha = "2026-08-19T10:00:00-05:00"
    expect(codes(validatePackage(value, masters), "confirmaciones")).toContain("RC9")
  })

  test("RC10 bloquea descuadre mayor a una unidad", () => {
    const value = structuredClone(valid); value.solicitud.valor_total += 2
    expect(codes(validatePackage(value, masters), "bloqueos")).toContain("RC10")
  })
})
