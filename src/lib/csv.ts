export function csvCell(value: unknown): string {
  const text = Array.isArray(value) ? value.join("|") : value === null || value === undefined ? "" : String(value)
  return `"${text.replace(/"/g, '""')}"`
}
