import { describe, expect, test } from "bun:test"
import { OrdenCompraSchema, SolicitudSchema } from "../src/domain/schemas"

describe("esquemas Zod", () => {
  test("rechaza montos no numéricos", () => {
    expect(SolicitudSchema.safeParse({
      solicitud_id: "S", solicitante: "A", proveedor_nombre: "P", descripcion: "D",
      centro_costo: "C", subarea: "S", cantidad: 1, valor_unitario: 1,
      valor_total: "uno", moneda: "COP", fecha_solicitud: "2026-01-01",
    }).success).toBeFalse()
  })

  test("rechaza descripción SAP mayor de 40", () => {
    const result = OrdenCompraSchema.safeParse({
      referencia: { solicitud_id: "S", correo_id: "C", cotizacion_ref: null },
      sociedad: "1000", organizacion_compras: "1000",
      proveedor: { codigo_sap: "1", nit: "1", nombre: "P" }, moneda: "COP", condiciones_pago: "Z030",
      aprobador: { email: "a@b", fecha_aprobacion: "2026-01-01", evidencia_sha256: "a".repeat(64) },
      posiciones: [{ numero: 10, descripcion: "x".repeat(41), cantidad: 1, unidad: "UN", precio_unitario: 1, centro_costo: "C", subarea: "S", indicador_iva: "C1" }],
      excepciones: [],
    })
    expect(result.success).toBeFalse()
  })
})
