# 09. Matriz de estado real de HU — Backend Fase 2

## 1. Estados

- **Implementado:** existe código y pruebas aprobadas para el alcance P0.
- **Parcial:** parte P0 implementada, pero queda un criterio opcional o una capa posterior.
- **Pendiente:** no se implementó en esta fase.

## 2. Matriz

| HU | Criterio | Estado real | Evidencia |
|---|---|---|---|
| HU-1 | Paquete normalizado con correo, solicitud, cotización, aprobación y factura opcional | Implementado | `package-reader.ts`; pruebas de lectura oficial |
| HU-1 | Adjunto ausente como `null` y nombre del faltante | Implementado | Prueba de cotización ausente |
| HU-2 | RC1–RC10 y salida estructurada | Implementado | `validation.ts`; 10 pruebas focales de reglas |
| HU-2 | Bloqueos, confirmaciones, derivados y retroactividad | Implementado | Demo de seis casos y pruebas del orquestador |
| HU-3 | Payload oficial validado con Zod | Implementado | `schemas.ts`, `payload.ts`, pruebas de esquema/payload |
| HU-3 | Trazabilidad por campo | Implementado | `out/<caso>/trazabilidad.json`; prueba de existencia |
| HU-3 | Vista previa conversacional | Pendiente | El payload está disponible; presentación en chat corresponde a la fase conversacional |
| HU-4 | Evidencia TXT con encabezados, cuerpo y SHA-256 | Implementado | `evidence.ts`; prueba de contenido/hash |
| HU-4 | Evidencia PDF P1 | Pendiente | P1 opcional fuera del P0 solicitado |
| HU-5 | Creación solo con validación y confirmaciones completas | Implementado | Autorización ligada a sesión y digests; pruebas negativas |
| HU-5 | Secuencia desde `4500000001` y JSONL | Implementado | Demo y prueba de creación |
| HU-5 | Idempotencia por `solicitud_id` | Implementado | Demo repite `sol-001`; prueba con una sola línea JSONL |
| HU-5 | Control de intentos exitosos, bloqueados, pendientes, rechazados e idempotentes | Implementado | `ControlRecorder`; pruebas de estados |
| HU-6 | Errores legibles para JSON malformado y datos inválidos | Implementado | Herramientas nunca lanzan; pruebas de JSON y Zod |
| HU-6 | Continuidad de una sesión conversacional tras error | Pendiente | El ciclo LLM y la API se implementarán en la siguiente fase |

## 3. Componentes transversales

| Componente | Estado |
|---|---|
| Herramientas P0 con `description`, argumentos Zod y `execute` JSON | Implementado |
| `SapAdapter` y `MockSapAdapter` | Implementado |
| `demo.ts` sin LLM | Implementado |
| Pruebas unitarias e integración | Implementado |
| Interfaz `LlmAdapter` | Implementada como contrato, sin proveedor |
| API HTTP y ciclo del agente | Pendiente |
| Frontend | Pendiente |
| SAP real | Pendiente por alcance |
