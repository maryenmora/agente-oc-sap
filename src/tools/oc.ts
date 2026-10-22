import { z } from "zod"
import { join } from "node:path"
import { readPackage } from "../domain/package-reader"
import { loadMasters } from "../domain/master-loader"
import { validatePackage } from "../domain/validation"
import { generateEvidence } from "../domain/evidence"
import { buildPayload, payloadDigest } from "../domain/payload"
import { readAuthorization, validationDigest } from "../domain/authorization"
import { OrdenCompraSchema, PaqueteSchema, DerivadosSchema } from "../domain/schemas"
import { MockSapAdapter } from "../sap/mock"
import { outRoot, readJson } from "../lib/files"
import { failure, success, type ToolDefinition } from "./types"

const CasoArgs = z.object({
  caso: z.string().describe("Nombre de la carpeta del caso en fixtures/reto-03/solicitudes/"),
})

const LeerPaqueteArgs = CasoArgs

const ValidarArgs = z.object({
  caso: z.string().describe("Nombre del caso que se valida"),
  paquete: PaqueteSchema.describe("Paquete normalizado devuelto por oc_leer_paquete"),
})

const GenerarEvidenciaArgs = CasoArgs

const ConstruirPayloadArgs = z.object({
  caso: z.string().describe("Nombre del caso procesado"),
  paquete: PaqueteSchema.describe("Paquete normalizado y validado"),
  derivados: DerivadosSchema.describe("Valores derivados por oc_validar"),
  confirmados: z.array(z.string()).default([]).describe("Códigos de confirmación aceptados explícitamente"),
  confirmado_por: z.string().nullable().default(null).describe("Identificador de sesión o actor que confirmó"),
})

const CrearArgs = z.object({
  caso: z.string().describe("Nombre del caso autorizado"),
  payload: OrdenCompraSchema.describe("Orden de compra validada con Zod"),
  confirmado: z.boolean().optional().describe("Compatibilidad con el contrato PRD; la autorización persistida prevalece"),
})

export const leer_paquete: ToolDefinition<z.infer<typeof LeerPaqueteArgs>> = {
  description: "Lee y normaliza el paquete documental de una solicitud de compra.",
  args: LeerPaqueteArgs,
  async execute(args, ctx) {
    try {
      return success(await readPackage(ctx.directory, args.caso))
    } catch (error) {
      return failure(error)
    }
  },
}

export const validar: ToolDefinition<z.infer<typeof ValidarArgs>> = {
  description: "Aplica de forma determinista RC1 a RC10 contra los maestros de compras.",
  args: ValidarArgs,
  async execute(args, ctx) {
    try {
      return success(validatePackage(args.paquete, await loadMasters(ctx.directory)))
    } catch (error) {
      return failure(error)
    }
  },
}

export const generar_evidencia: ToolDefinition<z.infer<typeof GenerarEvidenciaArgs>> = {
  description: "Genera la evidencia TXT de aprobación y calcula su hash SHA-256.",
  args: GenerarEvidenciaArgs,
  async execute(args, ctx) {
    try {
      return success(await generateEvidence(ctx.directory, args.caso, await readPackage(ctx.directory, args.caso)))
    } catch (error) {
      return failure(error)
    }
  },
}

export const construir_payload: ToolDefinition<z.infer<typeof ConstruirPayloadArgs>> = {
  description: "Construye y valida el payload SAP con evidencia y trazabilidad por campo.",
  args: ConstruirPayloadArgs,
  async execute(args, ctx) {
    try {
      const freshPackage = await readPackage(ctx.directory, args.caso)
      if (freshPackage.solicitud.solicitud_id !== args.paquete.solicitud.solicitud_id) throw new Error("El paquete no corresponde al caso")
      const validation = validatePackage(freshPackage, await loadMasters(ctx.directory))
      if (!validation.apta) throw new Error("La solicitud tiene bloqueos y no puede construir payload")
      if (JSON.stringify(validation.derivados) !== JSON.stringify(args.derivados)) throw new Error("Los derivados no coinciden con la validación vigente")
      const evidence = z.object({ sha256: z.string().regex(/^[a-f0-9]{64}$/) }).parse(await readJson(join(outRoot(ctx.directory), args.caso, "evidencia.json")))
      const result = await buildPayload(ctx.directory, args.caso, freshPackage, validation, evidence.sha256, args.confirmados, args.confirmado_por)
      return success({ ...result.payload, trazabilidad_ruta: result.trazabilidadRuta })
    } catch (error) {
      return failure(error)
    }
  },
}

export const crear: ToolDefinition<z.infer<typeof CrearArgs>> = {
  description: "Crea una OC autorizada en SAP simulado o devuelve la existente de forma idempotente.",
  args: CrearArgs,
  async execute(args, ctx) {
    try {
      const payload = OrdenCompraSchema.parse(args.payload)
      const paquete = await readPackage(ctx.directory, args.caso)
      const validation = validatePackage(paquete, await loadMasters(ctx.directory))
      if (!validation.apta) throw new Error("La validación vigente contiene bloqueos")
      const authorization = await readAuthorization(ctx.directory, args.caso)
      if (authorization.solicitud_id !== payload.referencia.solicitud_id) throw new Error("La autorización no corresponde a la solicitud")
      if (authorization.session_id !== ctx.sessionId) throw new Error("La autorización pertenece a otra sesión")
      if (authorization.validation_digest !== validationDigest(validation)) throw new Error("La validación cambió después de autorizar")
      if (authorization.payload_digest !== payloadDigest(payload)) throw new Error("El payload cambió después de autorizar")
      const required = validation.confirmaciones.map((item) => item.codigo)
      if (!required.every((code) => authorization.confirmed_codes.includes(code))) throw new Error("Hay confirmaciones pendientes")
      const sap = new MockSapAdapter(ctx.directory)
      const existing = await sap.buscarOrdenPorReferencia(payload.referencia.solicitud_id)
      if (existing) {
        const result = await sap.crearOrden(payload)
        return success({ ...result, idempotente: true })
      }
      const result = await sap.crearOrden(payload)
      return success({ ...result, idempotente: false })
    } catch (error) {
      return failure(error)
    }
  },
}

export const oc_leer_paquete = leer_paquete
export const oc_validar = validar
export const oc_generar_evidencia = generar_evidencia
export const oc_construir_payload = construir_payload
export const oc_crear = crear
