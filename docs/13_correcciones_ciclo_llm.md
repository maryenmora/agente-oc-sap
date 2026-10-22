# 13. Correcciones y estabilización del ciclo LLM — Fase 3.5

## 1. Fallos encontrados

1. El modo LLM ejecutaba herramientas, pero no emitía la autorización que exige `oc_crear`.
2. Las confirmaciones y el control CSV solo se resolvían correctamente en modo local.
3. El mensaje previo del asistente con `tool_calls` no se conservaba antes de los resultados `tool`.
4. El adaptador podía lanzar ante JSON inválido de argumentos.
5. El límite de sesión trataba caracteres como si fueran tokens.
6. El servidor iniciaba con `src/` como raíz y no encontraba `fixtures/`.
7. La Fase 3 presentaba el estado LLM por encima de la evidencia disponible y ESLint no existía.

## 2. Causas técnicas

El runtime LLM era una ruta paralela al orquestador de Fase 2. Además, su representación de mensajes no incluía `tool_calls` en el mensaje assistant y su raíz se derivaba de `import.meta.dir` sin subir a la raíz del repositorio.

## 3. Archivos modificados

- `src/agent/runtime.ts`, `src/agent/orchestration.ts`, `src/agent/tool-registry.ts`, `src/agent/types.ts`, `src/agent/sessions.ts`.
- `src/llm/adapter.ts`, `src/llm/openai-compatible.ts`.
- `src/orchestrator/processor.ts`, `src/server.ts`.
- Nuevas pruebas LLM/protocolo HTTP; ESLint y configuración.
- `docs/10`, `docs/11`, `docs/12` y este documento.

## 4. Correcciones aplicadas

- Ambos modos delegan la decisión de negocio a `processCase`; no existe autorización emitida por el modelo.
- El registro de control sigue siendo exclusivo del orquestador.
- El modelo no puede invocar `oc_crear`, evidencia, payload ni escribir autorización/control.
- Pendientes, aceptación, rechazo y aceptación parcial se gestionan por sesión/caso/códigos RC.
- El adaptador serializa assistant `tool_calls` y resultados `tool_call_id` según protocolo OpenAI-compatible.
- JSON inválido se convierte en resultado controlado; existen controles de timeout, herramientas no permitidas y límite de iteraciones.
- `usage.total_tokens` se usa cuando existe; sin él se aplica estimación conservadora solo como guardia.
- `src/server.ts` ahora usa la raíz del repositorio.
- ESLint 9 con typescript-eslint reemplaza el falso lint basado solo en TypeScript.

## 5. Pruebas agregadas

Se añadieron pruebas para casos A–F, seguridad, timeout, argumentos inválidos, herramientas múltiples, protocolo HTTP y servidor HTTP local simulado. Resultado final: 57 pruebas aprobadas, 0 fallidas, 127 aserciones en 12 archivos.

## 6. Limitaciones pendientes

No hay proveedor LLM real configurado, por lo que la conexión externa está sin verificar. Sesiones siguen en memoria; faltan persistencia durable, streaming, autenticación, SAP real, PDF P1 y despliegue.

## 7. Veredicto

**GO condicionado** para la siguiente fase de configuración/proveedor: el modo local y el ciclo LLM con proveedor simulado comparten garantías de negocio y seguridad. **NO-GO para producción** hasta completar los pendientes de configuración, durabilidad, autenticación e integración externa.
