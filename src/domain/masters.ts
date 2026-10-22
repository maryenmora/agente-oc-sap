import { z } from "zod"

export const ProveedorSchema = z.object({
  codigo_sap: z.string(),
  nit: z.string(),
  nombre: z.string(),
  condiciones_pago_default: z.string(),
  indicador_iva_default: z.string(),
  activo: z.boolean(),
})

export const CentroCostoSchema = z.object({
  centro_costo: z.string(),
  nombre: z.string(),
  subareas: z.array(z.string()),
  aprobadores: z.array(z.object({
    email: z.string(),
    nombre: z.string(),
    tope: z.number(),
  })),
})

export const IndicadorIvaSchema = z.object({
  codigo: z.string(),
  descripcion: z.string(),
  tasa: z.number(),
})

export const CondicionPagoSchema = z.object({
  codigo: z.string(),
  descripcion: z.string(),
  dias: z.number(),
})

export const MaestrosSchema = z.object({
  proveedores: z.array(ProveedorSchema),
  centrosCosto: z.array(CentroCostoSchema),
  indicadoresIva: z.array(IndicadorIvaSchema),
  condicionesPago: z.array(CondicionPagoSchema),
})

export type Proveedor = z.infer<typeof ProveedorSchema>
export type Maestros = z.infer<typeof MaestrosSchema>
