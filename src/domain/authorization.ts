import { createHash } from "node:crypto"
import { join } from "node:path"
import { z } from "zod"
import type { OrdenCompra, Validacion } from "./schemas"
import { outRoot, readJson, writeJson } from "../lib/files"
import { payloadDigest } from "./payload"

const AuthorizationSchema = z.object({
  caso: z.string(),
  solicitud_id: z.string(),
  payload_digest: z.string(),
  validation_digest: z.string(),
  confirmed_codes: z.array(z.string()),
  confirmed_by: z.string().nullable(),
  session_id: z.string(),
})

export type Authorization = z.infer<typeof AuthorizationSchema>

export function validationDigest(validation: Validacion): string {
  return createHash("sha256").update(JSON.stringify(validation)).digest("hex")
}

export async function issueAuthorization(
  directory: string,
  caso: string,
  payload: OrdenCompra,
  validation: Validacion,
  confirmedCodes: string[],
  confirmedBy: string | null,
  sessionId: string,
): Promise<Authorization> {
  if (!validation.apta) throw new Error("No se puede autorizar una solicitud bloqueada")
  const required = validation.confirmaciones.map((item) => item.codigo)
  if (!required.every((code) => confirmedCodes.includes(code))) {
    throw new Error("Hay confirmaciones pendientes")
  }
  const authorization = AuthorizationSchema.parse({
    caso,
    solicitud_id: payload.referencia.solicitud_id,
    payload_digest: payloadDigest(payload),
    validation_digest: validationDigest(validation),
    confirmed_codes: [...new Set(confirmedCodes)].sort(),
    confirmed_by: confirmedBy,
    session_id: sessionId,
  })
  await writeJson(join(outRoot(directory), caso, "autorizacion.json"), authorization)
  return authorization
}

export async function readAuthorization(directory: string, caso: string): Promise<Authorization> {
  return AuthorizationSchema.parse(await readJson(join(outRoot(directory), caso, "autorizacion.json")))
}
