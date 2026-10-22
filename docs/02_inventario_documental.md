# 02. Inventario documental

## 1. Criterio de clasificación

- **Previsto en el PRD**: artefacto requerido o descrito por el proceso objetivo.
- **Disponible físicamente**: archivo comprobado en `reto-03/`.
- **Pendiente de generar**: salida esperada de una implementación futura.
- **No aplica a todos los casos**: documento condicional, como la factura.

Los fixtures representan adjuntos binarios mediante JSON o texto. No hay archivos `.xlsx`, `.pdf` o `.eml` originales; esta normalización es deliberada según el PRD.

## 2. Inventario de documentos del proceso

| Documento | Propósito | Responsable | Campos principales | Origen de la información | Validaciones requeridas | Salida esperada |
|---|---|---|---|---|---|---|
| Correo de solicitud | Transportar el paquete e identificar remitente, asunto, fecha y adjuntos declarados. | Solicitante | `id`, `de`, `para`, `asunto`, `fecha`, `cuerpo`, `adjuntos` | Buzón de compras; fixture `correo.json` | JSON legible; campos mínimos; coherencia entre adjuntos declarados y archivos normalizados | Objeto `correo` normalizado y lista de faltantes |
| Solicitud de compra | Definir necesidad, proveedor, imputación y valores de la compra. | Solicitante | `solicitud_id`, solicitante, proveedor, NIT opcional, descripción, centro, subárea, cantidad, valores, moneda, IVA opcional, pago opcional, fecha | Excel en operación; fixture `solicitud.json` | Estructura y tipos; RC1, RC3, RC4, RC6, RC7 y RC10 | Objeto `solicitud` normalizado; fuente principal del payload |
| Cotización | Sustentar proveedor, ítems, precio, moneda y vigencia ofertada. | Proveedor; adjunta el solicitante | Referencia, fecha, proveedor, NIT, ítems, subtotal, IVA, total, validez | PDF en operación; fixture `cotizacion.txt` | Extracción de total/moneda/NIT; RC5; faltante genera confirmación | Objeto `cotizacion` o `null`; confirmación si falta o difiere más de 2 % |
| Aprobación | Evidenciar autorización previa del gasto. | Líder aprobador | `de`, `para`, `fecha`, `asunto`, `cuerpo`, copia opcional | Correo del líder; fixture `aprobacion.json` | Existencia, palabra “Aprobado”, pertenencia al centro, tope y fecha; RC2, RC3 y RC9 | Objeto `aprobacion`; evidencia TXT/PDF con hash |
| Factura | Detectar si la compra ya fue facturada antes de solicitar la OC. | Proveedor; adjunta el solicitante | Número, fecha de emisión, vendedor, adquiriente, conceptos y total | Factura del proveedor; fixture `factura.txt` solo en `sol-005` | Extracción de número, fecha y total; RC8 compara fecha con solicitud | Objeto `factura` o `null`; marca `retroactiva` y confirmación |
| Maestro de proveedores | Verificar existencia/actividad y completar datos SAP por defecto. | Administración de datos / SAP | `codigo_sap`, NIT, nombre, pago por defecto, IVA por defecto, activo | SAP en producción; fixture `proveedores.json` | RC1; coincidencia por NIT o nombre normalizado; RC6 y RC7 para derivados | Proveedor validado y derivados trazables |
| Maestro de centros de costo y aprobadores | Validar imputación, subárea, autoridad y tope. | Finanzas / Administración de datos | Centro, nombre, subáreas, aprobadores, email, nombre, tope | Sistema maestro en producción; fixture `centros-costo.json` | RC2, RC3 y RC4 | Resultado de autorización o bloqueo |
| Maestro de indicadores de IVA | Validar o describir el código tributario aplicable. | Finanzas / Impuestos | Código, descripción, tasa | SAP o maestro tributario; fixture `indicadores-iva.json` | Código derivado o informado debe existir; el PRD no asigna una RC independiente para esta existencia | Código de IVA para posición de OC |
| Maestro de condiciones de pago | Validar o describir el código de pago. | Finanzas / Cuentas por pagar | Código, descripción, días | SAP; fixture `condiciones-pago.json` | Código derivado o informado debe existir; RC7 regula la derivación | Código de condición de pago para OC |
| Evidencia de aprobación | Preservar la aprobación en formato auditable. | Agente; consume Auditoría | De, para, fecha, asunto, cuerpo, SHA-256 | `aprobacion.json` normalizada | Contenido completo; hash reproducible | `out/<caso>/aprobacion.txt` P0 y `aprobacion.pdf` P1 |
| Payload de OC | Representar la orden antes de enviarla a SAP. | Herramienta `oc_construir_payload` | Referencia, sociedad, organización, proveedor, moneda, pago, aprobador, posiciones, excepciones | Solicitud, cotización, maestros y derivados | Esquema `zod`; descripción máx. 40; códigos y tipos permitidos; trazabilidad | Objeto `OrdenCompra` listo para adaptador |
| Trazabilidad por campo | Demostrar el origen de cada valor del payload. | Agente / herramienta | Campo, valor, fuente (`solicitud`, `cotizacion`, `maestro.*`, `derivado`) | Proceso de construcción | Todo valor debe tener fuente autorizada | `out/<caso>/trazabilidad.json` |
| Registro de órdenes SAP simulado | Persistir OC creadas y soportar idempotencia. | Adaptador SAP simulado | Número, fecha, referencia y payload | Resultado de `oc_crear` | Secuencia desde `4500000001`; unicidad por `solicitud_id` | `out/sap/ordenes.jsonl` |
| Registro de control | Auditar cada intento y medir retroactividad. | Backend/orquestador como responsabilidad propuesta; el PRD no asigna propietario técnico | `solicitud_id`, resultado, número, retroactiva, bloqueos, confirmaciones, `ts` | Cada intento exitoso, bloqueado, pendiente, rechazado o idempotente | Registro aun cuando no se invoque `oc_crear`; categorías consistentes | `out/control.csv` |
| Log de herramientas | Registrar la ejecución visible del agente. | Backend del agente | Sesión, herramienta, argumentos, resultado resumido, fecha | Ciclo del agente | No exponer secretos; correlación con sesión | `out/log.jsonl` e historial de chat |
| Mensaje de confirmación | Obtener decisión humana ante una excepción controlable. | Agente; responde analista | Código, detalle, valores comparados y pregunta explícita | Resultado de RC5, RC6, RC8 o RC9 | No continuar sin respuesta afirmativa inequívoca | Estado pendiente o `confirmado = true` |
| Mensaje de bloqueo o excepción | Explicar por qué no se creó la OC y qué hacer. | Agente | Tipo, causa, regla o error, acción sugerida | Validación o error tipado | Diferenciar regla de negocio de fallo técnico/documental | Respuesta legible y registro de intento |

## 3. Correspondencia física con los fixtures

| Caso | Correo | Solicitud | Cotización | Aprobación | Factura | Condición diseñada en el PRD |
|---|---:|---:|---:|---:|---:|---|
| `sol-001` | Sí | Sí | Sí | Sí | No | Flujo normal; OC esperada sin intervención humana |
| `sol-002` | Sí | Sí | Sí | Sí | No | Proveedor inexistente; bloqueo RC1 |
| `sol-003` | Sí | Sí | Sí | Sí | No | Aprobador sin autoridad para el centro; bloqueo RC2. RC3 no puede comprobarse para ese remitente dentro de ese centro porque no tiene tope asociado allí. |
| `sol-004` | Sí | Sí | Sí | Sí | No | Cotización COP 26.500.000 vs solicitud COP 25.000.000: diferencia relativa de 6 %, superior al 2 %; confirmación RC5 |
| `sol-005` | Sí | Sí | Sí | Sí | Sí | Factura del 10/08/2026 anterior a solicitud del 27/08/2026; retroactiva y pendiente de confirmación RC8 |
| `sol-006` | Sí | Sí | Sí | Sí | No | Sin NIT, IVA ni pago en solicitud; proveedor localizable por nombre, IVA derivado con confirmación RC6 y pago derivado informado RC7 |

## 4. Maestros físicamente disponibles

| Archivo | Registros observados | Cobertura relevante |
|---|---:|---|
| `maestros/proveedores.json` | 5 | Cuatro activos y uno inactivo; incluye valores por defecto de IVA y pago. No incluye al proveedor de `sol-002`. |
| `maestros/centros-costo.json` | 3 centros | `CC-1010`, `CC-2020`, `CC-3030`; subáreas, cuatro aprobadores y topes. |
| `maestros/indicadores-iva.json` | 3 | `C0` 0 %, `C1` 19 %, `C2` 5 %. |
| `maestros/condiciones-pago.json` | 4 | `Z000`, `Z015`, `Z030`, `Z060`. |

## 5. Archivos previstos pero no disponibles como originales o resultados

- No están disponibles los adjuntos binarios `solicitud.xlsx`, `cotizacion.pdf`, `aprobacion.eml` ni `factura.pdf`; existen únicamente sus equivalentes normalizados de prueba.
- No existe un maestro separado denominado “matriz de aprobación”; la matriz está embebida en `centros-costo.json` mediante `aprobadores` y `tope`.
- No existe factura para `sol-001`, `sol-002`, `sol-003`, `sol-004` ni `sol-006`; es correcto porque el campo es opcional y el caso retroactivo es `sol-005`.
- No existen todavía evidencia generada, payloads, trazabilidad, órdenes simuladas, `control.csv` ni `log.jsonl`; son salidas de una implementación futura.
- No existe implementación que permita afirmar que los documentos fueron procesados o validados.

## 6. Observaciones de calidad documental

1. Los seis correos declaran adjuntos coherentes con sus archivos normalizados; `sol-005` declara además factura.
2. Los asuntos de varios correos terminan truncados, pero el identificador de caso permanece presente.
3. Las cotizaciones expresan NIT con dígito de verificación y separadores, mientras los maestros y solicitudes usan el número base; la normalización del NIT debe definirse antes de comparar.
4. El PRD exige conservar la referencia de cotización en el payload, pero el paquete normalizado de la sección 7.2 no declara un campo específico de referencia. La extracción desde la primera línea de `cotizacion.txt` debe formalizarse durante el diseño.
5. El payload exige `evidencia_sha256`, pero el contrato enumera `oc_construir_payload` antes de `oc_generar_evidencia`; el flujo implementable debe generar primero la evidencia o definir un payload preliminar y otro final.
6. `oc_crear` recibe `caso`, `payload` y `confirmado?`, pero no recibe el resultado de validación; debe definirse cómo verifica de forma confiable que `apta = true` sin depender solo del LLM.
7. HU-5 exige registrar intentos bloqueados y pendientes aunque `oc_crear` no deba ejecutarse en esos estados; la responsabilidad de escribir `control.csv` debe asignarse explícitamente al validador, al orquestador o a una herramienta de control.
8. Los maestros de IVA y pago existen, pero RC1–RC10 no definen de forma explícita qué hacer si un código informado no aparece en esos maestros; se requiere aclaración antes de producción.
