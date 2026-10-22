# Implementación

## Fase 2

- Stack: Bun, TypeScript estricto y Zod.
- Fixtures copiados a `fixtures/reto-03` sin modificar originales.
- Dominio: lectura, normalización, maestros, RC1–RC10, evidencia, payload y autorización.
- Herramientas: `oc_leer_paquete`, `oc_validar`, `oc_generar_evidencia`, `oc_construir_payload`, `oc_crear`.
- Integraciones: `SapAdapter`, mock JSONL e interfaz `LlmAdapter`.

## Fase 3

- API: `POST /api/chat`, `GET /api/sessions/:id`, `GET /api/health`.
- Runtime: sesiones en memoria, confirmaciones por sesión, logs de herramientas, límites de turnos/tokens.
- LLM: adaptador OpenAI-compatible por variables de entorno; modo local determinista sin credenciales; protocolo verificado con servidor HTTP local simulado.
- UI: React/Vite con historial, carga, errores, tool calls, estado de OC y confirmación/rechazo.

Decisión clave: el LLM no emite autorización; el backend conserva las verificaciones de sesión, validación y payload de Fase 2.
