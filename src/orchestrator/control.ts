import { access, readFile } from "node:fs/promises"
import { join } from "node:path"
import type { Validacion } from "../domain/schemas"
import { appendText, outRoot, writeText } from "../lib/files"
import { csvCell } from "../lib/csv"

export type ControlResult = "exitoso" | "bloqueado" | "pendiente_confirmacion" | "rechazado" | "idempotente" | "excepcion"

export type ControlEntry = {
  solicitud_id: string
  resultado: ControlResult
  numero_oc: string | null
  retroactiva: boolean
  bloqueos: string[]
  confirmaciones: string[]
  ts: string
}

export class ControlRecorder {
  constructor(private readonly directory: string) {}

  private path(): string {
    return join(outRoot(this.directory), "control.csv")
  }

  async record(entry: ControlEntry): Promise<void> {
    try {
      await access(this.path())
    } catch {
      await writeText(this.path(), "solicitud_id,resultado,numero_oc,retroactiva,bloqueos,confirmaciones,ts\n")
    }
    const row = [entry.solicitud_id, entry.resultado, entry.numero_oc, entry.retroactiva, entry.bloqueos, entry.confirmaciones, entry.ts]
      .map(csvCell)
      .join(",")
    await appendText(this.path(), `${row}\n`)
  }

  async text(): Promise<string> {
    return readFile(this.path(), "utf8")
  }
}

export function entryFromValidation(solicitudId: string, resultado: ControlResult, validation: Validacion, numeroOc: string | null = null): ControlEntry {
  return {
    solicitud_id: solicitudId,
    resultado,
    numero_oc: numeroOc,
    retroactiva: validation.retroactiva,
    bloqueos: validation.bloqueos.map((item) => item.codigo),
    confirmaciones: validation.confirmaciones.map((item) => item.codigo),
    ts: new Date().toISOString(),
  }
}
