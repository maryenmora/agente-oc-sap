export function normalizeNit(value: string): string {
  const digits = value.replace(/\D/g, "")
  return digits.length > 9 ? digits.slice(0, -1) : digits
}

export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function parseMoney(value: string): number {
  const normalized = value.replace(/[^0-9,.-]/g, "").replace(/\./g, "").replace(",", ".")
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) {
    throw new Error(`Monto no numérico: ${value}`)
  }
  return parsed
}

export function dateKey(value: string): string {
  const match = value.match(/^\d{4}-\d{2}-\d{2}/)
  if (!match) {
    throw new Error(`Fecha inválida: ${value}`)
  }
  return match[0]
}

export function addDays(date: string, days: number): string {
  const value = new Date(`${dateKey(date)}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

export function inferUnit(description: string): "UN" | "H" | "MES" {
  const normalized = normalizeName(description)
  if (normalized.includes("hora") || normalized.includes("bolsa")) return "H"
  if (normalized.includes("mes") || normalized.includes("mensual")) return "MES"
  return "UN"
}

export function shortText(value: string): string {
  return value.length <= 40 ? value : value.slice(0, 40)
}
