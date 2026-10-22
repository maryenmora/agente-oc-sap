import { createHash } from "node:crypto"
import { join } from "node:path"
import type { Paquete, Validacion, OrdenCompra } from "./schemas"
import { OrdenCompraSchema } from "./schemas"
import { inferUnit, shortText } from "../lib/normalization"
import { outRoot, writeJson } from "../lib/files"

export function payloadDigest(payload: OrdenCompra): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex")
}

export async function buildPayload(
  directory: string,
  caso: string,
  paquete: Paquete,
  validacion: Validacion,
  evidenciaSha256: string,
  confirmedCodes: string[] = [],
  confirmedBy: string | null = null,
): Promise<{ payload: OrdenCompra; trazabilidadRuta: string }> {
  if (!paquete.aprobacion) throw new Error("No existe aprobación para construir el payload")
  const iva = paquete.solicitud.indicador_iva ?? validacion.derivados.indicador_iva
  const payment = paquete.solicitud.condiciones_pago ?? validacion.derivados.condiciones_pago
  const providerCode = validacion.derivados.proveedor_codigo_sap
  const providerNit = paquete.solicitud.proveedor_nit ?? validacion.derivados.proveedor_nit
  const providerName = validacion.derivados.proveedor_nombre ?? paquete.solicitud.proveedor_nombre
  if (!iva || !payment || !providerCode || !providerNit) throw new Error("Faltan derivados obligatorios para construir el payload")

  const payload = OrdenCompraSchema.parse({
    referencia: {
      solicitud_id: paquete.solicitud.solicitud_id,
      correo_id: paquete.correo.id,
      cotizacion_ref: paquete.cotizacion?.referencia ?? null,
    },
    sociedad: "1000",
    organizacion_compras: "1000",
    proveedor: { codigo_sap: providerCode, nit: providerNit, nombre: providerName },
    moneda: paquete.solicitud.moneda,
    condiciones_pago: payment,
    aprobador: {
      email: paquete.aprobacion.de,
      fecha_aprobacion: paquete.aprobacion.fecha,
      evidencia_sha256: evidenciaSha256,
    },
    posiciones: [{
      numero: 10,
      descripcion: shortText(paquete.solicitud.descripcion),
      cantidad: paquete.solicitud.cantidad,
      unidad: inferUnit(paquete.solicitud.descripcion),
      precio_unitario: paquete.solicitud.valor_unitario,
      centro_costo: paquete.solicitud.centro_costo,
      subarea: paquete.solicitud.subarea,
      indicador_iva: iva,
    }],
    excepciones: validacion.confirmaciones.map((item) => ({
      codigo: item.codigo,
      detalle: item.detalle,
      confirmado_por: confirmedCodes.includes(item.codigo) ? confirmedBy : null,
    })),
  })

  const traces = {
    "referencia.solicitud_id": "solicitud.solicitud_id",
    "referencia.correo_id": "correo.id",
    "referencia.cotizacion_ref": "cotizacion.referencia",
    sociedad: "derivado.constante",
    organizacion_compras: "derivado.constante",
    proveedor: "maestro.proveedores",
    moneda: "solicitud.moneda",
    condiciones_pago: paquete.solicitud.condiciones_pago ? "solicitud.condiciones_pago" : "derivado.proveedor",
    aprobador: "aprobacion",
    evidencia_sha256: "derivado.evidencia",
    posiciones: "solicitud",
    indicador_iva: paquete.solicitud.indicador_iva ? "solicitud.indicador_iva" : "derivado.proveedor",
    excepciones: "derivado.validacion",
  }
  const trazabilidadRuta = join(outRoot(directory), caso, "trazabilidad.json")
  await writeJson(trazabilidadRuta, traces)
  return { payload, trazabilidadRuta }
}
