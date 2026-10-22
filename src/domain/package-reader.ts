import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { z } from "zod"
import { AprobacionSchema, CorreoSchema, FacturaSchema, PaqueteSchema, SolicitudSchema, CotizacionSchema, type Paquete } from "./schemas"
import { addDays, normalizeNit, parseMoney } from "../lib/normalization"
import { fixturesRoot, readJson } from "../lib/files"

const CorreoFixtureSchema = CorreoSchema.extend({
  para: z.string(),
  cuerpo: z.string(),
  adjuntos: z.array(z.string()),
  nota_fixture: z.string().optional(),
})

const AprobacionFixtureSchema = z.object({
  de: z.string(),
  para: z.string(),
  cc: z.array(z.string()).optional(),
  fecha: z.string(),
  asunto: z.string(),
  cuerpo: z.string(),
})

function parseCotizacion(texto: string): z.infer<typeof CotizacionSchema> {
  const reference = texto.match(/^COTIZACIÓN\s+(.+)$/m)?.[1]?.trim() ?? null
  const date = texto.match(/^Fecha:\s*(\d{4}-\d{2}-\d{2})$/m)?.[1]
  const provider = texto.match(/^Proveedor:\s*(.+)$/m)?.[1]?.trim()
  const nit = texto.match(/^NIT:\s*(.+)$/m)?.[1]?.trim() ?? null
  const totalLine = texto.match(/^TOTAL(?:\s*\(IVA incluido\))?:\s*([A-Z]{3})\s*([\d.,]+)$/m)
  const validityDays = texto.match(/Validez de la oferta:\s*(\d+)\s*días/i)?.[1]
  if (!provider || !totalLine) {
    throw new Error("Cotización malformada: faltan proveedor o total")
  }
  return CotizacionSchema.parse({
    referencia: reference,
    proveedor: provider,
    nit: nit ? normalizeNit(nit) : null,
    total: parseMoney(totalLine[2] ?? ""),
    moneda: totalLine[1],
    validez_hasta: date && validityDays ? addDays(date, Number(validityDays)) : null,
    texto,
  })
}

function parseFactura(texto: string): z.infer<typeof FacturaSchema> {
  const numero = texto.match(/^FACTURA.+No\.\s*(.+)$/m)?.[1]?.trim()
  const fecha = texto.match(/^Fecha de emisión:\s*(\d{4}-\d{2}-\d{2})$/m)?.[1]
  const total = texto.match(/^TOTAL:\s*[A-Z]{3}\s*([\d.,]+)$/m)?.[1]
  if (!numero || !fecha || !total) {
    throw new Error("Factura malformada: faltan número, fecha o total")
  }
  return FacturaSchema.parse({ numero, fecha, total: parseMoney(total) })
}

async function optionalText(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null
    throw error
  }
}

async function optionalJson(path: string): Promise<unknown | null> {
  try {
    return await readJson(path)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null
    throw error
  }
}

export async function readPackage(directory: string, caso: string): Promise<Paquete> {
  if (!/^sol-\d{3}$/.test(caso)) throw new Error("Caso inválido")
  const caseRoot = join(fixturesRoot(directory), "solicitudes", caso)
  const correo = CorreoFixtureSchema.parse(await readJson(join(caseRoot, "correo.json")))
  const solicitud = SolicitudSchema.parse(await readJson(join(caseRoot, "solicitud.json")))
  const [quoteText, approvalValue, invoiceText] = await Promise.all([
    optionalText(join(caseRoot, "cotizacion.txt")),
    optionalJson(join(caseRoot, "aprobacion.json")),
    optionalText(join(caseRoot, "factura.txt")),
  ])
  const faltantes: string[] = []
  if (!quoteText) faltantes.push("cotizacion.pdf")
  if (!approvalValue) faltantes.push("aprobacion.eml")
  const approval = approvalValue ? AprobacionFixtureSchema.parse(approvalValue) : null
  const paquete = {
    correo: CorreoSchema.parse(correo),
    solicitud,
    cotizacion: quoteText ? parseCotizacion(quoteText) : null,
    aprobacion: approval ? AprobacionSchema.parse({
      ...approval,
      aprobado: /\baprobado\b/i.test(approval.cuerpo),
      texto: approval.cuerpo,
    }) : null,
    factura: invoiceText ? parseFactura(invoiceText) : null,
    faltantes,
  }
  return PaqueteSchema.parse(paquete)
}
