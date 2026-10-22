# 11. Evidencia de Fase 3 / 3.5

## Verificaciones ejecutadas

| Comando | Resultado real |
|---|---|
| `bun run typecheck` | Exitoso |
| `bun run lint` | Exitoso con ESLint 9 y typescript-eslint |
| `bun test` | 57 aprobadas, 0 fallidas, 127 aserciones, 12 archivos |
| `bun run build` | Exitoso; Vite generó `dist/web` |
| `bun run demo` | Exitoso; limpia `out/` y reproduce seis casos |
| `git diff --check` | Ejecutado al cierre de fase |

## Pruebas LLM añadidas

- Flujo automático de `sol-001`, autorización y persistencia.
- `sol-004`: pendiente, silencio, confirmación de misma sesión y creación.
- Rechazo explícito sin OC.
- Confirmación parcial sin creación.
- Aislamiento entre sesiones y casos.
- Bloqueo RC1 ante instrucción de ignorarlo.
- `oc_crear` no permitido al LLM.
- Tool calls múltiples, JSON inválido y herramienta inexistente.
- Límite de iteraciones, timeout y continuidad de sesión.
- Idempotencia y control CSV.
- Protocolo OpenAI-compatible validado con `fetch` y con un servidor HTTP local simulado.

## Verificación visual local

Se inició `bun run dev` desde la raíz correcta. Se verificó que el puerto 3000 ejecutaba `bun --hot src/server.ts` y el puerto 5173 ejecutaba Vite desde este repositorio. El navegador mostró el chat, `sol-004`, RC5 con diferencia de 6 %, herramientas `oc_leer_paquete`/`oc_validar`, panel pendiente y, tras pulsar Confirmar, el resultado `idempotente` con OC `4500000002` (la OC ya existía porque una prueba HTTP manual previa sobre el mismo servidor la había creado). No se verificaron visualmente el botón Rechazar ni los estados de bloqueo y éxito nuevo; esos estados se verificaron por HTTP contra el servidor en ejecución y por pruebas automatizadas. No se realizó despliegue externo.

## Límite de evidencia

No existen `LLM_BASE_URL`, `LLM_MODEL` ni `LLM_API_KEY` configurados. Por ello no se verificó red contra un proveedor LLM real; la evidencia de protocolo corresponde a proveedor HTTP simulado local.
