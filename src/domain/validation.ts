import type { Maestros, Proveedor } from "./masters"
import { MaestrosSchema } from "./masters"
import type { Hallazgo, Paquete, Validacion } from "./schemas"
import { ValidacionSchema } from "./schemas"
import { dateKey, normalizeEmail, normalizeName, normalizeNit } from "../lib/normalization"

function add(target: Hallazgo[], codigo: string, detalle: string): void {
  target.push({ codigo, detalle })
}

function findProvider(paquete: Paquete, maestros: Maestros): Proveedor | undefined {
  const requestedNit = paquete.solicitud.proveedor_nit
  if (requestedNit) {
    const nit = normalizeNit(requestedNit)
    return maestros.proveedores.find((item) => normalizeNit(item.nit) === nit)
  }
  const name = normalizeName(paquete.solicitud.proveedor_nombre)
  return maestros.proveedores.find((item) => normalizeName(item.nombre) === name)
}

export function validatePackage(paquete: Paquete, input: Maestros): Validacion {
  const maestros = MaestrosSchema.parse(input)
  const bloqueos: Hallazgo[] = []
  const confirmaciones: Hallazgo[] = []
  const derivados: Validacion["derivados"] = {}
  const proveedor = findProvider(paquete, maestros)
  const centro = maestros.centrosCosto.find((item) => item.centro_costo === paquete.solicitud.centro_costo)
  const aprobador = paquete.aprobacion && centro
    ? centro.aprobadores.find((item) => normalizeEmail(item.email) === normalizeEmail(paquete.aprobacion?.de ?? ""))
    : undefined

  if (!proveedor || !proveedor.activo) {
    add(bloqueos, "RC1", proveedor ? "El proveedor está inactivo" : "El proveedor no existe en el maestro")
  } else {
    derivados.proveedor_codigo_sap = proveedor.codigo_sap
    derivados.proveedor_nit = proveedor.nit
    derivados.proveedor_nombre = proveedor.nombre
  }

  if (!paquete.aprobacion || !paquete.aprobacion.aprobado || !aprobador) {
    add(bloqueos, "RC2", !paquete.aprobacion ? "Falta la aprobación" : !paquete.aprobacion.aprobado ? "La evidencia no contiene Aprobado" : "El remitente no es aprobador del centro de costo")
  }

  if (aprobador && paquete.solicitud.valor_total > aprobador.tope) {
    add(bloqueos, "RC3", `El valor ${paquete.solicitud.valor_total} supera el tope ${aprobador.tope}`)
  }

  if (!centro || !centro.subareas.includes(paquete.solicitud.subarea)) {
    add(bloqueos, "RC4", "La subárea no pertenece al centro de costo")
  }

  if (!paquete.cotizacion) {
    add(confirmaciones, "RC5", "No hay cotización; se requiere confirmación")
  } else if (paquete.solicitud.valor_total === 0) {
    add(bloqueos, "RC5_DATOS", "El valor total no puede ser cero para comparar la cotización")
  } else if (paquete.cotizacion.moneda !== paquete.solicitud.moneda) {
    add(bloqueos, "RC5_DATOS", "La moneda de la cotización no coincide con la solicitud")
  } else {
    const difference = Math.abs(paquete.cotizacion.total - paquete.solicitud.valor_total) / paquete.solicitud.valor_total
    if (difference > 0.02) {
      add(confirmaciones, "RC5", `Solicitud ${paquete.solicitud.valor_total}; cotización ${paquete.cotizacion.total}; diferencia ${(difference * 100).toFixed(2)} %`)
    }
  }

  if (!paquete.solicitud.indicador_iva) {
    if (proveedor?.indicador_iva_default && maestros.indicadoresIva.some((item) => item.codigo === proveedor.indicador_iva_default)) {
      derivados.indicador_iva = proveedor.indicador_iva_default
      add(confirmaciones, "RC6", `Indicador IVA derivado: ${proveedor.indicador_iva_default}`)
    } else {
      add(bloqueos, "RC6_DATOS", "No fue posible derivar un indicador de IVA válido")
    }
  } else if (!maestros.indicadoresIva.some((item) => item.codigo === paquete.solicitud.indicador_iva)) {
    add(bloqueos, "RC6_DATOS", "El indicador de IVA no existe en el maestro")
  }

  if (!paquete.solicitud.condiciones_pago) {
    if (proveedor?.condiciones_pago_default && maestros.condicionesPago.some((item) => item.codigo === proveedor.condiciones_pago_default)) {
      derivados.condiciones_pago = proveedor.condiciones_pago_default
    } else {
      add(bloqueos, "RC7_DATOS", "No fue posible derivar una condición de pago válida")
    }
  } else if (!maestros.condicionesPago.some((item) => item.codigo === paquete.solicitud.condiciones_pago)) {
    add(bloqueos, "RC7_DATOS", "La condición de pago no existe en el maestro")
  }

  const retroactiva = Boolean(paquete.factura && dateKey(paquete.factura.fecha) < dateKey(paquete.solicitud.fecha_solicitud))
  if (retroactiva) add(confirmaciones, "RC8", `Factura ${paquete.factura?.numero} anterior a la solicitud`)

  if (paquete.aprobacion && dateKey(paquete.aprobacion.fecha) < dateKey(paquete.solicitud.fecha_solicitud)) {
    add(confirmaciones, "RC9", "La aprobación es anterior a la solicitud")
  }

  const calculated = paquete.solicitud.cantidad * paquete.solicitud.valor_unitario
  if (Math.abs(calculated - paquete.solicitud.valor_total) > 1) {
    add(bloqueos, "RC10", `Cantidad por valor unitario es ${calculated}, no ${paquete.solicitud.valor_total}`)
  }

  return ValidacionSchema.parse({ apta: bloqueos.length === 0, bloqueos, confirmaciones, derivados, retroactiva })
}
