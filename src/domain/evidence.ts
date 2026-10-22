import { createHash } from "node:crypto"
import { join } from "node:path"
import type { Paquete } from "./schemas"
import { outRoot, writeText } from "../lib/files"

export async function generateEvidence(directory: string, caso: string, paquete: Paquete): Promise<{ ruta: string; sha256: string }> {
  if (!paquete.aprobacion) throw new Error("No existe aprobación para generar evidencia")
  const content = [
    `De: ${paquete.aprobacion.de}`,
    `Para: ${paquete.aprobacion.para}`,
    `Fecha: ${paquete.aprobacion.fecha}`,
    `Asunto: ${paquete.aprobacion.asunto}`,
    "",
    paquete.aprobacion.cuerpo,
  ].join("\n")
  const sha256 = createHash("sha256").update(content).digest("hex")
  const ruta = join(outRoot(directory), caso, "aprobacion.txt")
  await writeText(ruta, `${content}\n\nSHA-256: ${sha256}\n`)
  await writeText(join(outRoot(directory), caso, "evidencia.json"), `${JSON.stringify({ sha256 })}\n`)
  return { ruta, sha256 }
}
