import { z } from "zod"

export const CorreoSchema = z.object({
  id: z.string().min(1),
  de: z.string().min(1),
  asunto: z.string(),
  fecha: z.string().min(1),
})

export const SolicitudSchema = z.object({
  solicitud_id: z.string().min(1),
  solicitante: z.string().min(1),
  proveedor_nombre: z.string().min(1),
  proveedor_nit: z.string().min(1).optional(),
  descripcion: z.string().min(1),
  centro_costo: z.string().min(1),
  subarea: z.string().min(1),
  cantidad: z.number().finite().positive(),
  valor_unitario: z.number().finite().nonnegative(),
  valor_total: z.number().finite().nonnegative(),
  moneda: z.enum(["COP", "USD"]),
  indicador_iva: z.string().min(1).optional(),
  condiciones_pago: z.string().min(1).optional(),
  fecha_solicitud: z.string().min(1),
})

export const CotizacionSchema = z.object({
  referencia: z.string().nullable(),
  proveedor: z.string().min(1),
  nit: z.string().nullable(),
  total: z.number().finite().nonnegative(),
  moneda: z.string().min(1),
  validez_hasta: z.string().nullable(),
  texto: z.string(),
})

export const AprobacionSchema = z.object({
  de: z.string().min(1),
  para: z.string().min(1),
  fecha: z.string().min(1),
  asunto: z.string(),
  cuerpo: z.string(),
  aprobado: z.boolean(),
  texto: z.string(),
})

export const FacturaSchema = z.object({
  numero: z.string().min(1),
  fecha: z.string().min(1),
  total: z.number().finite().nonnegative(),
})

export const PaqueteSchema = z.object({
  correo: CorreoSchema,
  solicitud: SolicitudSchema,
  cotizacion: CotizacionSchema.nullable(),
  aprobacion: AprobacionSchema.nullable(),
  factura: FacturaSchema.nullable(),
  faltantes: z.array(z.string()),
})

export const HallazgoSchema = z.object({
  codigo: z.string().min(1),
  detalle: z.string().min(1),
})

export const DerivadosSchema = z.object({
  proveedor_codigo_sap: z.string().optional(),
  proveedor_nit: z.string().optional(),
  proveedor_nombre: z.string().optional(),
  indicador_iva: z.string().optional(),
  condiciones_pago: z.string().optional(),
})

export const ValidacionSchema = z.object({
  apta: z.boolean(),
  bloqueos: z.array(HallazgoSchema),
  confirmaciones: z.array(HallazgoSchema),
  derivados: DerivadosSchema,
  retroactiva: z.boolean(),
})

export const PosicionSchema = z.object({
  numero: z.number().int().positive().refine((value) => value % 10 === 0),
  descripcion: z.string().min(1).max(40),
  cantidad: z.number().finite().positive(),
  unidad: z.enum(["UN", "H", "MES"]),
  precio_unitario: z.number().finite().nonnegative(),
  centro_costo: z.string().min(1),
  subarea: z.string().min(1),
  indicador_iva: z.string().min(1),
})

export const OrdenCompraSchema = z.object({
  referencia: z.object({
    solicitud_id: z.string().min(1),
    correo_id: z.string().min(1),
    cotizacion_ref: z.string().nullable(),
  }),
  sociedad: z.literal("1000"),
  organizacion_compras: z.literal("1000"),
  proveedor: z.object({
    codigo_sap: z.string().min(1),
    nit: z.string().min(1),
    nombre: z.string().min(1),
  }),
  moneda: z.enum(["COP", "USD"]),
  condiciones_pago: z.string().min(1),
  aprobador: z.object({
    email: z.string().min(1),
    fecha_aprobacion: z.string().min(1),
    evidencia_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  }),
  posiciones: z.array(PosicionSchema).min(1),
  excepciones: z.array(z.object({
    codigo: z.string().min(1),
    detalle: z.string().min(1),
    confirmado_por: z.string().nullable(),
  })),
})

export type Solicitud = z.infer<typeof SolicitudSchema>
export type Paquete = z.infer<typeof PaqueteSchema>
export type Hallazgo = z.infer<typeof HallazgoSchema>
export type Derivados = z.infer<typeof DerivadosSchema>
export type Validacion = z.infer<typeof ValidacionSchema>
export type OrdenCompra = z.infer<typeof OrdenCompraSchema>
