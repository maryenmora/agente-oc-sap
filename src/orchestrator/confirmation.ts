import type { Validacion } from "../domain/schemas"

export function resolveConfirmations(validation: Validacion, acceptedCodes: string[]): { complete: boolean; pending: string[] } {
  const accepted = new Set(acceptedCodes)
  const pending = validation.confirmaciones.map((item) => item.codigo).filter((code) => !accepted.has(code))
  return { complete: pending.length === 0, pending }
}
