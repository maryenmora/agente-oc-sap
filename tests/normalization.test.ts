import { describe, expect, test } from "bun:test"
import { dateKey, inferUnit, normalizeName, normalizeNit, parseMoney, shortText } from "../src/lib/normalization"

describe("normalización", () => {
  test("normaliza NIT con separadores y dígito de verificación", () => {
    expect(normalizeNit("900.555.111-2")).toBe("900555111")
    expect(normalizeNit("900555111")).toBe("900555111")
  })

  test("normaliza nombres y dinero", () => {
    expect(normalizeName("Papelería Central Ltda.")).toBe("papeleriacentralltda")
    expect(parseMoney("COP 11.400.000")).toBe(11400000)
  })

  test("normaliza fecha, unidad y texto SAP", () => {
    expect(dateKey("2026-08-21T10:02:00-05:00")).toBe("2026-08-21")
    expect(inferUnit("Bolsa de 100 horas de arquitectura")).toBe("H")
    expect(shortText("x".repeat(45))).toHaveLength(40)
  })
})
