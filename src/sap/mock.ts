import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { z } from "zod"
import type { OrdenCompra } from "../domain/schemas"
import type { SapAdapter } from "./adapter"
import { fixturesRoot, outRoot, appendText, readJson } from "../lib/files"
import { ProveedorSchema } from "../domain/masters"
import { normalizeNit } from "../lib/normalization"

const StoredOrderSchema = z.object({
  numero_oc: z.string(),
  fecha: z.string(),
  orden: z.unknown(),
})

type StoredOrder = z.infer<typeof StoredOrderSchema>

export class MockSapAdapter implements SapAdapter {
  constructor(private readonly directory: string) {}

  private ordersPath(): string {
    return join(outRoot(this.directory), "sap", "ordenes.jsonl")
  }

  private async orders(): Promise<StoredOrder[]> {
    try {
      const content = await readFile(this.ordersPath(), "utf8")
      return content.split(/\r?\n/).filter(Boolean).map((line) => StoredOrderSchema.parse(JSON.parse(line)))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return []
      throw error
    }
  }

  async consultarProveedor(nit: string): Promise<{ codigo_sap: string; activo: boolean } | null> {
    const providers = z.array(ProveedorSchema).parse(await readJson(join(fixturesRoot(this.directory), "maestros", "proveedores.json")))
    const found = providers.find((item) => normalizeNit(item.nit) === normalizeNit(nit))
    return found ? { codigo_sap: found.codigo_sap, activo: found.activo } : null
  }

  async buscarOrdenPorReferencia(solicitudId: string): Promise<{ numero_oc: string } | null> {
    const found = (await this.orders()).find((item) => {
      const order = item.orden as OrdenCompra
      return order.referencia.solicitud_id === solicitudId
    })
    return found ? { numero_oc: found.numero_oc } : null
  }

  async crearOrden(orden: OrdenCompra): Promise<{ numero_oc: string; fecha: string }> {
    const existing = await this.buscarOrdenPorReferencia(orden.referencia.solicitud_id)
    if (existing) {
      const stored = (await this.orders()).find((item) => item.numero_oc === existing.numero_oc)
      return { numero_oc: existing.numero_oc, fecha: stored?.fecha ?? new Date().toISOString() }
    }
    const orders = await this.orders()
    const numero_oc = String(4500000001 + orders.length)
    const fecha = new Date().toISOString()
    await appendText(this.ordersPath(), `${JSON.stringify({ numero_oc, fecha, orden })}\n`)
    return { numero_oc, fecha }
  }
}
