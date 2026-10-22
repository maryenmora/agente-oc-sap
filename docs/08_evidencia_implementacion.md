# 08. Evidencia de implementación de Fase 2

## 1. Entorno verificado

- Bun `1.4.2`.
- Node.js `22.23.3`.
- npm `10.9.9`.
- TypeScript `5.9.3`.
- Zod `4.3.6`.

## 2. Comandos y resultados

| Comando | Resultado |
|---|---|
| `bun install` | 6 paquetes instalados; `bun.lock` generado. |
| `bun run typecheck` | Exitoso, sin errores. |
| `bun run lint` | Exitoso; usa el gate estricto de TypeScript disponible en esta fase. |
| `bun test` | 27 pruebas aprobadas, 0 fallidas, 54 aserciones, 6 archivos. |
| `bun run demo` | Ejecutó los seis casos, idempotencia y confirmación explícita de `sol-004`. |
| `git diff --check` | Sin errores de espacios o conflictos. |

## 3. Resultado observado de la demo

| Ejecución | Resultado observado |
|---|---|
| `sol-001` primera | `exitoso`, OC `4500000001` |
| `sol-001` segunda | `idempotente`, OC `4500000001` |
| `sol-002` | `bloqueado`, RC1 |
| `sol-003` | `bloqueado`, RC2 |
| `sol-004` sin decisión | `pendiente_confirmacion`, RC5 |
| `sol-004` confirmado | `exitoso`, OC `4500000002` |
| `sol-005` | `pendiente_confirmacion`, RC8, `retroactiva = true` |
| `sol-006` | `pendiente_confirmacion`, RC6; RC7 derivado sin confirmación |

La evidencia local queda en `out/demo-resultados.json`, `out/control.csv`, `out/sap/ordenes.jsonl`, `out/<caso>/aprobacion.txt`, `trazabilidad.json` y `autorizacion.json`. `out/` está ignorado por Git porque es resultado reproducible de ejecución.

## 4. Cobertura automatizada

- RC1–RC10, incluidos casos negativos derivados en memoria.
- Lectura normalizada, documento ausente y JSON malformado.
- Normalización de NIT, nombre, dinero y fechas.
- Esquemas Zod y límite SAP de 40 caracteres.
- Evidencia TXT y SHA-256.
- Payload y trazabilidad.
- Guardia backend, confirmación pendiente y payload alterado.
- Confirmación aceptada y rechazada.
- Registro de bloqueos y pendientes sin crear OC.
- Creación secuencial e idempotencia.

## 5. Error encontrado y corrección

La primera corrida de pruebas tuvo 17 aprobadas y 1 fallida porque una ruta derivada de `import.meta.url` conservó el acento de “capacitación” codificado como `%C3%B3` en Windows. Se corrigió con `fileURLToPath`; la segunda corrida terminó con 27 aprobadas y 0 fallidas.

## 6. Pendiente para fases posteriores

- API HTTP y ciclo conversacional con límite de iteraciones.
- Implementación concreta de `LlmAdapter` y system prompt.
- Frontend de chat.
- PDF P1 y lectura binaria de Excel P1.
- Integración SAP real, autenticación y despliegue.
