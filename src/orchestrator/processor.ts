import { buildPayload } from "../domain/payload"
import { generateEvidence } from "../domain/evidence"
import { issueAuthorization } from "../domain/authorization"
import { loadMasters } from "../domain/master-loader"
import { readPackage } from "../domain/package-reader"
import { validatePackage } from "../domain/validation"
import type { OrdenCompra } from "../domain/schemas"
import { MockSapAdapter } from "../sap/mock"
import { ControlRecorder, entryFromValidation } from "./control"
import { oc_crear } from "../tools/oc"
import { parseToolResult } from "../tools/types"

export type ConfirmationDecision = {
  acceptedCodes: string[]
  rejected: boolean
  actor: string | null
}

export type ProcessResult = {
  caso: string
  apta: boolean
  bloqueos: string[]
  confirmaciones: string[]
  detalle_bloqueos: Array<{ codigo: string; detalle: string }>
  detalle_confirmaciones: Array<{ codigo: string; detalle: string }>
  derivados: Record<string, string | undefined>
  retroactiva: boolean
  resultado: "bloqueado" | "pendiente_confirmacion" | "rechazado" | "exitoso" | "idempotente"
  numero_oc: string | null
  payload?: OrdenCompra
  trazabilidad_ruta?: string
}

export async function processCase(directory: string, caso: string, sessionId: string, decision?: ConfirmationDecision): Promise<ProcessResult> {
  const packageData = await readPackage(directory, caso)
  const validation = validatePackage(packageData, await loadMasters(directory))
  const recorder = new ControlRecorder(directory)
  const base = {
    caso,
    apta: validation.apta,
    bloqueos: validation.bloqueos.map((item) => item.codigo),
    confirmaciones: validation.confirmaciones.map((item) => item.codigo),
    detalle_bloqueos: validation.bloqueos.map(({ codigo, detalle }) => ({ codigo, detalle })),
    detalle_confirmaciones: validation.confirmaciones.map(({ codigo, detalle }) => ({ codigo, detalle })),
    derivados: validation.derivados,
    retroactiva: validation.retroactiva,
  }
  if (!validation.apta) {
    await recorder.record(entryFromValidation(packageData.solicitud.solicitud_id, "bloqueado", validation))
    return { ...base, resultado: "bloqueado", numero_oc: null }
  }
  if (decision?.rejected) {
    await recorder.record(entryFromValidation(packageData.solicitud.solicitud_id, "rechazado", validation))
    return { ...base, resultado: "rechazado", numero_oc: null }
  }
  const required = validation.confirmaciones.map((item) => item.codigo)
  const accepted = decision?.acceptedCodes ?? []
  if (!required.every((code) => accepted.includes(code))) {
    await recorder.record(entryFromValidation(packageData.solicitud.solicitud_id, "pendiente_confirmacion", validation))
    return { ...base, resultado: "pendiente_confirmacion", numero_oc: null }
  }
  const evidence = await generateEvidence(directory, caso, packageData)
  const built = await buildPayload(directory, caso, packageData, validation, evidence.sha256, accepted, decision?.actor ?? null)
  await issueAuthorization(directory, caso, built.payload, validation, accepted, decision?.actor ?? null, sessionId)
  const existing = await new MockSapAdapter(directory).buscarOrdenPorReferencia(packageData.solicitud.solicitud_id)
  const creation = parseToolResult<{ numero_oc: string; fecha: string; idempotente: boolean }>(await oc_crear.execute({ caso, payload: built.payload }, { directory, sessionId }))
  if (!creation.ok) throw new Error(creation.error)
  const resultado = existing ? "idempotente" : "exitoso"
  await recorder.record(entryFromValidation(packageData.solicitud.solicitud_id, resultado, validation, creation.data.numero_oc))
  return { ...base, resultado, numero_oc: creation.data.numero_oc, payload: built.payload, trazabilidad_ruta: built.trazabilidadRuta }
}
