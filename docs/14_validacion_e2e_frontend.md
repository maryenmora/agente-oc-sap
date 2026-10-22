# 14. Validación funcional E2E y estabilización del frontend — Fase 3.6

## 1. Entorno y aislamiento

- Se confirmó que el puerto 3000 ejecutaba `bun --hot src/server.ts` y que el puerto 5173 ejecutaba Vite desde `agente-oc-sap`.
- Se preservó el `out/` existente en `evidence/e2e-pre-20261022-150609/` antes de iniciar la corrida funcional.
- Se vació únicamente el `out/` generado del repositorio para una corrida aislada; no se modificaron los fixtures originales.
- Al final se ejecutó `bun run demo`, que limpia `out/` por diseño. Los archivos generados por la corrida E2E no se copiaron antes de ese paso; el contenido de `control.csv` y `ordenes.jsonl` de la corrida E2E se transcribe abajo como evidencia. Las capturas quedan bajo `.perxia/screenshots/`.

### Registro de control de la corrida E2E (transcrito antes de la demo)

```
solicitud_id,resultado,numero_oc,retroactiva,bloqueos,confirmaciones
SOL-2026-001,exitoso,4500000001,false,,
SOL-2026-001,idempotente,4500000001,false,,
SOL-2026-002,bloqueado,,false,RC1,
SOL-2026-003,bloqueado,,false,RC2,
SOL-2026-004,pendiente_confirmacion,,false,,RC5   (x5, varias sesiones)
SOL-2026-004,exitoso,4500000002,false,,RC5
SOL-2026-005,pendiente_confirmacion,,true,,RC8
SOL-2026-004,rechazado,,false,,RC5   (x2; el segundo provino del defecto de sesión compartida, ver §4)
SOL-2026-006,pendiente_confirmacion,,false,,RC6   (x2)
SOL-2026-006,exitoso,4500000003,false,,RC6
```

`ordenes.jsonl` contenía exactamente 3 órdenes: `4500000001` (SOL-2026-001), `4500000002` (SOL-2026-004) y `4500000003` (SOL-2026-006).

## 2. Resultados E2E desde React

| Caso | Resultado visual comprobado | Integridad comprobada |
|---|---|---|
| `sol-001` | Creación automática visible con OC `4500000001`; panel muestra derivados y vista previa de payload. Repetición visual muestra `idempotente` y el mismo número. | Durante la corrida aislada, una sola línea en `ordenes.jsonl`; `control.csv` registró `exitoso` e `idempotente`. |
| `sol-002` | Estado `bloqueado`; motivo visible: RC1, proveedor inexistente. | Sin OC creada. |
| `sol-003` | Estado `bloqueado`; motivo visible: RC2, remitente no autorizado para el centro. | Sin OC creada. |
| `sol-004` | Diferencia de 6 % y RC5 visibles; panel pendiente y botón Confirmar. Tras confirmar en la misma sesión, estado `exitoso`, OC `4500000002` y panel oculto. En perfil aislado, Rechazar mostró `rechazado`, sin número de OC ni panel de confirmación. | `control.csv` registró pendiente, exitoso y rechazado en sesiones/corridas independientes. |
| `sol-005` | Estado pendiente, aviso “Orden retroactiva”, RC8 y botones visibles en pantalla móvil. | `control.csv` registró `retroactiva=true` y `pendiente_confirmacion`. |
| `sol-006` | RC6 visible; panel muestra IVA derivado `C1` y condiciones de pago `Z030`. Tras confirmar, se creó OC `4500000003`. | Confirmación RC6 obligatoria antes de crear. |

## 3. Verificación visual adicional

- Chat, historial y llamadas `oc_leer_paquete` / `oc_validar`: comprobados.
- Indicador de modo: comprobado como **modo local determinista (sin LLM)**; no se presenta como IA generativa.
- Panel de confirmación: comprobado visualmente.
- Error recuperable: comprobado visualmente con un caso inexistente (`sol-999`), que mostró respuesta recuperable y la tool call marcada como fallida.
- Indicador de carga y alerta de error del servidor (`role="alert"`): comprobados **solo con prueba automatizada de React** (`tests/frontend-ui.test.tsx`, happy-dom); la respuesta local es demasiado rápida para observar la carga en el navegador.
- Vista previa: se añadió al panel y se comprobó contenido de solicitud, hash de evidencia y excepciones.
- Responsive: se redimensionó a móvil; la estructura cambió a una sola columna y se comprobó visualmente el caso retroactivo. La aserción exacta de ancho de columna no fue usada como criterio porque el padding reduce el ancho utilizable.
- Capturas: `e2e-sol-001-payload-2026-10-22T20-27-09-881.jpg` y `e2e-sol-005-mobile-2026-10-22T20-24-02-654.jpg`.

## 4. Defectos encontrados y correcciones

| Defecto | Causa | Corrección | Estado |
|---|---|---|---|
| Confirmar podía quedar pendiente tras HMR | El ID estaba en `localStorage` y el módulo generaba un ID nuevo al recargar; además las pestañas compartían sesión. | Se persistió en `sessionStorage`, aislado por pestaña y estable ante recarga/HMR. Se añadieron selectores de prueba. | Corregido y verificado visualmente. |
| UI no mostraba payload, derivados ni detalle de bloqueos | El backend devolvía datos parciales y el panel solo mostraba códigos. | Se expusieron `payload`, derivados y detalles; la UI muestra vista previa, derivados y motivo de bloqueo. | Corregido y comprobado. |
| La vista previa truncaba JSON | `summary()` limitaba a 900 caracteres. | La vista previa usa JSON completo. | Corregido y comprobado. |
| Error de navegación de Fase 3.5 al confirmar | Falla de la herramienta, no de la interfaz: en esa ocasión el mensaje "Confirmo RC5 de sol-004" sí llegó al backend, por lo que el click se ejecutó; el panel desaparece al re-renderizar y la herramienta reportó un selector posicional (`nth-of-type`) inexistente. | Se añadieron `data-testid` estables; con ellos Confirmar y Rechazar funcionaron sin errores de la herramienta. | Cerrado. |

## 5. Backend e integridad

- `GET /api/health` devolvió `local-deterministic` y no expuso claves, tokens ni encabezados de autorización.
- `POST /api/chat` inválido devolvió HTTP 400.
- Los archivos de la corrida aislada mostraron persistencia e idempotencia correctas antes de ejecutar la demo limpia.
- El modo local usa el orquestador y las herramientas reales; no hay respuestas prefabricadas para los casos.

## 6. Validaciones técnicas ejecutadas

| Comando | Resultado |
|---|---|
| `bun run typecheck` | Exitoso |
| `bun run lint` | Exitoso con ESLint real |
| `bun test` | 60 aprobadas, 0 fallidas, 136 aserciones, 15 archivos |
| `bun run build` | Exitoso |
| `bun run demo` | Exitoso; seis casos, confirmación e idempotencia |
| `git diff --check` | Exitoso; solo aviso LF→CRLF de README en Windows |

## 7. Limitaciones pendientes

- No se verificó un proveedor LLM real: no hay credenciales externas configuradas.
- Sesiones aún están en memoria; no sobreviven reinicio del servidor.
- No hay SAP real, PDF P1, autenticación, streaming ni despliegue.
- La prueba visual se hizo en modo local determinista; el protocolo LLM está cubierto por pruebas HTTP simuladas de Fase 3.5.

## 8. Veredicto

**GO para demostración local completa en modo local determinista.** Los seis casos solicitados fueron cubiertos visualmente o mediante evidencia directa de backend, y los controles principales se verificaron.

**NO-GO para producción y para una demostración con proveedor LLM real** hasta configurar y comprobar credenciales autorizadas, persistencia durable, autenticación e integraciones externas.
