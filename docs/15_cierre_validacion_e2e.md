# 15. Cierre de validación E2E y preparación de entrega

## 1. Resultado ejecutivo

**GO para demostración local completa en modo local determinista.**

**NO-GO para producción o demo con proveedor LLM real** hasta validar credenciales externas autorizadas, persistencia durable, autenticación, SAP real, PDF P1, streaming y despliegue.

## 2. Estabilidad de sesiones

Se añadió y ejecutó `scripts/e2e-browser.ts` con Chromium de Playwright contra los servidores locales reales. La corrida final aprobó **12 de 12 escenarios**, incluido HMR.

| Escenario | Resultado |
|---|---|
| Recarga de misma pestaña | El identificador se conservó y el panel RC5 pendiente se recuperó desde `GET /api/sessions/:id`. |
| Dos pestañas | La confirmación en pestaña B no creó ni consumió la OC pendiente de pestaña A. |
| Cambio de caso | Intentar `sol-006` mientras `sol-004` estaba pendiente no reutilizó la confirmación RC5. |
| Confirmar | `sol-004` pasó a `exitoso` con OC `4500000001` en la corrida aislada. |
| Rechazar | El rechazo quedó conservado en la pestaña B sin crear OC. |
| Solicitudes duplicadas | La interacción controlada de pestaña A emitió exactamente tres `POST /api/chat`, uno por acción de usuario: procesar, intento cruzado y confirmar. |
| HMR de Vite | Se modificó temporalmente un token CSS, se esperó la actualización HMR y se restauró el archivo. La sesión pendiente permaneció y no hubo petición adicional. |

La estabilidad se implementa con `sessionStorage`, no `localStorage`: la sesión sobrevive recargas/HMR de la misma pestaña y no se comparte entre pestañas.

## 3. Escenario sol-005 completo

Desde React móvil se verificó:

1. `sol-005` queda pendiente por RC8.
2. El aviso de orden retroactiva aparece.
3. No se crea OC antes de confirmar.
4. Confirmar crea la OC `4500000002` en la corrida aislada.
5. Inspección directa de `e2e-hmr-validated-out/control.csv`: las filas pendiente y exitosa conservan `retroactiva=true`, RC8 y timestamps `2026-10-22T21:00:48.248Z` / `2026-10-22T21:00:48.481Z`; la exitosa contiene OC `4500000002`.
6. La evidencia final contiene `sol-005/aprobacion.txt`, `evidencia.json`, `autorizacion.json` y `trazabilidad.json`.

## 4. Evidencia reproducible preservada

Carpeta ignorada por Git: `evidence/final-e2e-20261022-153100/`.

| Artefacto | Contenido |
|---|---|
| `browser/browser-results.json` | Primera corrida Fase 3.7: 11 escenarios aprobados, antes de incorporar HMR. |
| `hmr/browser-results.json` | Corrida final: 12 escenarios aprobados, incluido `vite-hmr-session-stability`. |
| `browser/screenshots/` | Capturas desktop de confirmación y móvil de `sol-005` pendiente/confirmado. |
| `e2e-generated-out/ordenes.jsonl` | Dos órdenes de la corrida de 11 escenarios: sol-004 y sol-005. |
| `e2e-generated-out/control.csv` | Registro oficial de la corrida inicial, con `SOL-2026-005` pendiente y exitoso, ambos `retroactiva=true`, OC `4500000002`. |
| `e2e-hmr-validated-out/control.csv` | Registro de la corrida final de 12 escenarios con el mismo resultado de `SOL-2026-005`. |
| `e2e-generated-out/sol-004`, `sol-005` | Evidencia, autorización y trazabilidad de casos creados. |
| `summary.json` | Resumen de ejecución y conteo de órdenes. |
| `pre-fase-3-7-out/` | Conservación de la evidencia existente antes de Fase 3.7. |

La demo se ejecutó después de guardar esa carpeta; por diseño limpia el `out/` activo, sin borrar la evidencia final.

## 5. Responsive y UI

La automatización verificó escritorio 1280 px y móvil 390 px:

- sin desbordamiento horizontal (`scrollWidth <= clientWidth`);
- en móvil, chat y panel ocupan el ancho útil de 358 px, descontando padding de 16 px por lado;
- botones Confirmar/Rechazar accesibles;
- herramientas y vista previa expandibles;
- mensaje de error legible para `sol-999`.

## 6. Defectos corregidos

| Defecto | Corrección | Verificación |
|---|---|---|
| La recarga mantenía ID pero no restauraba UI pendiente | `fetchSession()` restaura mensajes y confirmación al montar React. | Playwright `session-reload`. |
| `localStorage` compartía sesión entre pestañas | Cambio a `sessionStorage` por pestaña. | Playwright `tab-isolation`. |
| Criterio móvil comparaba ancho contra viewport e ignoraba padding | Se mide ancho útil y se compara con chat/panel; también valida overflow. | Playwright mobile-responsive. |
| Evidencia E2E podía perderse al correr demo | Copia a carpeta final antes de demo. | Archivos preservados. |

## 7. Criterios de aceptación actualizados

- HU-1, HU-2, HU-3, HU-5 y HU-6: implementados y ahora probados por API, suite y E2E local.
- HU-4 P0: implementado y evidenciado; PDF P1 sigue pendiente.
- Ciclo LLM OpenAI-compatible: implementado y probado con proveedor HTTP simulado; proveedor real no verificado por falta de configuración.

## 8. Validaciones ejecutadas

Los resultados finales quedan registrados al cierre de esta fase:

- `bun run typecheck`
- `bun run lint`
- `bun test`: 62 aprobadas, 0 fallidas, 142 aserciones en 15 archivos.
- `bun run build`
- `bun run demo`
- `git diff --check`

## 9. Propuesta de commit (no ejecutada)

```text
feat: implement sap purchase order agent mvp
```

Alcance propuesto: documentación Fases 1–3.7, backend, SAP mock, herramientas, API, frontend React, pruebas, configuración de calidad, fixtures copiados y scripts E2E. Excluir explícitamente `node_modules/`, `out/`, `dist/`, `evidence/`, `.env` y capturas temporales no versionadas. La evidencia final se conserva localmente y permanece ignorada por seguridad/tamaño.
