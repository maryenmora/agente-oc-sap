# 12. Matriz de estado real de HU — Fase 3 / 3.5 / 3.6 / 3.7

| HU / capacidad | Estado | Evidencia |
|---|---|---|
| HU-1 Lectura desde chat y herramientas visibles | Implementado y probado visualmente | E2E React de seis casos, logs y pruebas |
| HU-2 RC1–RC10, bloqueos y confirmaciones | Implementado y probado visualmente | RC1, RC2, RC5, RC6 y RC8 visibles; suite de reglas cubre RC1–RC10 |
| HU-3 Payload, trazabilidad y vista previa | Implementado y probado visualmente | Panel React, preview JSON, derivados y pruebas de contrato |
| HU-4 Evidencia TXT P0 | Implementado y probado | Fase 2 integrada y payload con hash visualizado |
| HU-4 PDF P1 | Pendiente | Fuera de alcance |
| HU-5 Creación autorizada, SAP mock e idempotencia | Implementado y probado visualmente | `sol-001`, `sol-004`, `sol-006`, archivos y control CSV |
| HU-6 Error y continuidad de sesión | Implementado y probado visualmente/local | `sol-999`, tool failure, timeout simulado y pruebas |
| Ciclo OpenAI-compatible | Implementado y probado con proveedor HTTP simulado | Tool protocol, servidor HTTP local de prueba |
| Conexión proveedor LLM real | Implementado pero no verificado | Requiere configuración externa |
| Frontend React/Vite | Implementado y probado visualmente y con Playwright | Recarga, aislamiento de pestañas, responsive, build, contrato API y 11 escenarios de navegador |

No es un proyecto listo para producción: faltan proveedor LLM real verificado, persistencia durable, autenticación, observabilidad productiva, SAP real, PDF P1 y despliegue.
