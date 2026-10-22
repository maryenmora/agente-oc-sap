import { processCase, type ConfirmationDecision, type ProcessResult } from "../orchestrator/processor"
import { codesMentioned, acceptsConfirmation, mentionsAllCodes, rejectsConfirmation } from "./message-parser"
import type { PendingConfirmation, Session } from "./types"

export type ConversationOutcome = {
  reply: string
  data: Record<string, unknown>
  recorded: boolean
}

export function decisionFromMessage(pending: PendingConfirmation, message: string, actor: string): ConfirmationDecision | "rejected" | "partial" | "silent" {
  if (rejectsConfirmation(message)) return "rejected"
  if (!acceptsConfirmation(message)) return "silent"
  const mentioned = codesMentioned(message).filter((code) => pending.codes.includes(code))
  const previously = pending.acceptedCodes
  const accepted = pending.codes.length === 1 || mentionsAllCodes(message)
    ? pending.codes
    : [...new Set([...previously, ...mentioned])]
  if (!pending.codes.every((code) => accepted.includes(code))) {
    pending.acceptedCodes = accepted
    return "partial"
  }
  return { acceptedCodes: accepted, rejected: false, actor }
}

export async function processForSession(directory: string, session: Session, caso: string, message: string, allowDecision = true): Promise<ConversationOutcome> {
  const pending = session.pendingConfirmation
  if (pending && pending.caso === caso) {
    const decision = allowDecision ? decisionFromMessage(pending, message, session.id) : "silent"
    if (decision === "silent") {
      const reply = `La solicitud ${caso} sigue pendiente de confirmación para ${pending.codes.join(", ")}. Confirma o rechaza explícitamente.`
      return { reply, data: { caso, resultado: "pendiente_confirmacion", pendingConfirmation: pending, narrative: reply }, recorded: false }
    }
    if (decision === "partial") {
      const missing = pending.codes.filter((code) => !pending.acceptedCodes.includes(code))
      const reply = `Confirmación parcial registrada para ${caso}. Falta confirmar explícitamente: ${missing.join(", ")}. No se creó la OC.`
      return { reply, data: { caso, resultado: "pendiente_confirmacion", pendingConfirmation: pending, narrative: reply }, recorded: false }
    }
    const result = await processCase(directory, caso, session.id, decision === "rejected" ? { acceptedCodes: [], rejected: true, actor: session.id } : decision)
    return outcome(session, result)
  }
  return outcome(session, await processCase(directory, caso, session.id))
}

function outcome(session: Session, result: ProcessResult): ConversationOutcome {
  session.pendingConfirmation = result.resultado === "pendiente_confirmacion"
    ? { caso: result.caso, codes: result.confirmaciones, details: result.detalle_confirmaciones, acceptedCodes: [] }
    : null
  return { reply: replyFor(result), data: result as unknown as Record<string, unknown>, recorded: true }
}

function replyFor(result: ProcessResult): string {
  if (result.resultado === "bloqueado") return `La solicitud ${result.caso} está bloqueada por ${result.bloqueos.join(", ")}. Corrige el paquete o solicita la información requerida; no se creó la OC.`
  if (result.resultado === "rechazado") return `La confirmación para ${result.caso} fue rechazada. No se creó la OC.`
  if (result.resultado === "pendiente_confirmacion") {
    return `La solicitud ${result.caso} requiere confirmación: ${result.detalle_confirmaciones.map((item) => `${item.codigo}: ${item.detalle}`).join(". ")}. Confirma o rechaza explícitamente; no se creó la OC.`
  }
  return `La OC para ${result.caso} ${result.resultado === "idempotente" ? "ya existía" : "fue creada"}. Número: ${result.numero_oc}.`
}
