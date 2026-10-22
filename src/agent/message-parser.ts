export function extractCase(message: string): string | null {
  return message.match(/\bsol-\d{3}\b/i)?.[0]?.toLowerCase() ?? null
}

export function acceptsConfirmation(message: string): boolean {
  return /\b(confirmo|confirmar|acepto|sí|si|adelante|proceda|procede)\b/i.test(message) && !rejectsConfirmation(message)
}

export function rejectsConfirmation(message: string): boolean {
  return /\b(rechazo|rechazar|no confirmo|cancel[ao]|no proceda|no crear|detener)\b/i.test(message)
}

export function codesMentioned(message: string): string[] {
  return [...new Set([...message.toUpperCase().matchAll(/\bRC(?:10|[1-9])\b/g)].map((match) => match[0]))]
}

export function mentionsAllCodes(message: string): boolean {
  return /\b(todas|todos|todas las confirmaciones)\b/i.test(message)
}
