import { join } from "node:path"
import { CentroCostoSchema, CondicionPagoSchema, IndicadorIvaSchema, MaestrosSchema, ProveedorSchema, type Maestros } from "./masters"
import { fixturesRoot, readJson } from "../lib/files"
import { z } from "zod"

export async function loadMasters(directory: string): Promise<Maestros> {
  const root = join(fixturesRoot(directory), "maestros")
  const [providers, centers, taxes, payments] = await Promise.all([
    readJson(join(root, "proveedores.json")),
    readJson(join(root, "centros-costo.json")),
    readJson(join(root, "indicadores-iva.json")),
    readJson(join(root, "condiciones-pago.json")),
  ])
  return MaestrosSchema.parse({
    proveedores: z.array(ProveedorSchema).parse(providers),
    centrosCosto: z.array(CentroCostoSchema).parse(centers),
    indicadoresIva: z.array(IndicadorIvaSchema).parse(taxes),
    condicionesPago: z.array(CondicionPagoSchema).parse(payments),
  })
}
