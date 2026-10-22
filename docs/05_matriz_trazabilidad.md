# 05. Matriz de trazabilidad

## 1. Leyenda de estado

| Estado | Significado |
|---|---|
| Documentado | Requisito definido en el PRD y trazado en esta matriz. |
| Fixture disponible | Existe información física para preparar una prueba. |
| Implementación pendiente | No existe código que materialice el requisito. |
| Validación no ejecutada | No se han ejecutado herramientas, demo ni pruebas; no hay resultado observado. |

Al elaborar esta matriz, **todas las HU están documentadas, toda la implementación está pendiente y toda validación está sin ejecutar**.

## 2. Trazabilidad de historias, criterios, reglas, herramientas y casos

| HU | Criterio de aceptación resumido | RC relacionadas | Herramientas o componentes requeridos | Casos de prueba relacionados | Evidencia esperada | Estado real |
|---|---|---|---|---|---|---|
| HU-1 Leer el paquete | Devuelve `{ correo, solicitud, cotizacion, aprobacion, factura? }` normalizados | RC2, RC5, RC8 como consumidores de documentos | `oc_leer_paquete`; esquemas de entrada; acceso de solo lectura a fixtures | `sol-001` a `sol-006`; `sol-005` cubre factura; `sol-006` cubre campos opcionales | Respuesta JSON de herramienta con paquete normalizado | Documentado; fixtures disponibles; implementación pendiente; validación no ejecutada |
| HU-1 Leer el paquete | Adjunto ausente se reporta como `null` y con su nombre; no lanza excepción | Precondición de RC2, RC5 y RC8 | `oc_leer_paquete`; taxonomía de faltantes | Los seis casos tienen los tres documentos base; no existe un fixture específico con adjunto base físicamente ausente | `{ ok: true, data }` con `null` y lista de faltantes | Documentado; cobertura física específica ausente; implementación pendiente |
| HU-2 Validar controles | Aplica RC1–RC10 y devuelve `{ apta, bloqueos, confirmaciones, derivados, retroactiva }` | RC1–RC10 | `oc_validar`; cuatro maestros; normalizadores de NIT, nombres, dinero y fechas | `sol-001` a `sol-006` | Resultado estructurado por caso con códigos y detalles | Documentado; fixtures disponibles; implementación pendiente; validación no ejecutada |
| HU-2 Validar controles | Bloqueos impiden crear; confirmaciones exigen `confirmado`; derivados se informan | RC1–RC10 | Orquestador del agente; estado de sesión; contrato de confirmación | Bloqueos: `sol-002`, `sol-003`; confirmaciones: `sol-004`, `sol-005`, `sol-006`; derivados: `sol-006` | Historial de chat y resultado de validación | Documentado; fixtures disponibles; implementación pendiente |
| HU-3 Construir payload | Produce `OrdenCompra` válida contra esquema `zod` y visible antes de crear, sin añadir una aprobación obligatoria al flujo normal | RC1–RC10 alimentan o condicionan campos | `oc_construir_payload`; esquema `OrdenCompra`; presentación no bloqueante | `sol-001`; `sol-004`, `sol-005`, `sol-006` después de confirmar | Payload validado y vista previa consultable; `sol-001` continúa automáticamente | Documentado; implementación pendiente; validación no ejecutada |
| HU-3 Construir payload | Cada valor tiene fuente y se escribe trazabilidad por caso | RC6 y RC7 requieren trazabilidad de derivados; restantes aportan datos validados | `oc_construir_payload`; escritor de `trazabilidad.json` | Especialmente `sol-006`; aplicable a todos los casos creados | `out/<caso>/trazabilidad.json` | Documentado; salida inexistente; implementación pendiente |
| HU-4 Generar evidencia | P0 crea TXT con encabezados, cuerpo y SHA-256 | RC2 y RC9 validan la aprobación fuente | `oc_generar_evidencia`; función SHA-256 | Todos los casos tienen `aprobacion.json` | `out/<caso>/aprobacion.txt` y hash retornado | Documentado; salida inexistente; implementación pendiente |
| HU-4 Generar evidencia | P1 crea PDF con el mismo contenido | RC2 y RC9 | `oc_generar_evidencia`; biblioteca PDF por elegir y justificar | Todos los casos | `out/<caso>/aprobacion.pdf` | Documentado como P1; implementación pendiente |
| HU-5 Crear OC | Solo ejecuta si apta y sin confirmaciones pendientes | RC1–RC10 | `oc_crear`; orquestador; estado de confirmación | Crea directo: `sol-001`; no crea: `sol-002`, `sol-003`; condicionados: `sol-004`, `sol-005`, `sol-006` | Resultado de herramienta y ausencia/presencia controlada en órdenes | Documentado; implementación pendiente; validación no ejecutada |
| HU-5 Crear OC | Asigna secuencia desde `4500000001` y persiste en JSONL | Controles previos aprobados | `SapAdapter`; `src/sap/mock.ts` | Primera creación válida, prevista con `sol-001` | `out/sap/ordenes.jsonl`; `{ numero_oc, fecha }` | Documentado; salida inexistente; implementación pendiente |
| HU-5 Crear OC | Repetir `solicitud_id` devuelve el mismo número | Regla técnica de idempotencia | `buscarOrdenPorReferencia`; `oc_crear` | `sol-001` ejecutado dos veces en `demo.ts` | Segundo resultado con mismo número e `idempotente: true`; una sola orden | Documentado; implementación y validación pendientes |
| HU-5 Crear OC | Cada intento agrega registro de control, incluso cuando `oc_crear` no se ejecuta | RC1–RC10 y RC8 en particular | Backend/orquestador como propietario propuesto de `out/control.csv` | `sol-001` a `sol-006` | Transiciones exitosas, bloqueadas, pendientes, rechazadas e idempotentes con número cuando aplique | Requisito documentado; responsabilidad técnica propuesta; salida inexistente; implementación pendiente |
| HU-6 Manejo de errores | Paquete incompleto, JSON malformado o monto no numérico devuelve `{ ok: false, error }` legible | Precondición de todas las RC | Todas las herramientas deben devolver y no lanzar; manejo de error del agente | No hay fixture dedicado a JSON malformado o monto no numérico; la ausencia lógica puede probarse con copia controlada, sin modificar originales | Respuesta tipada, chat con recomendación y continuidad de sesión | Documentado; fixtures negativos específicos ausentes; implementación pendiente |

## 3. Trazabilidad por regla de control

| RC | HU principal | Herramienta | Fixture focal | Evidencia esperada | Estado de prueba |
|---|---|---|---|---|---|
| RC1 | HU-2 | `oc_validar` | `sol-002`; fallback por nombre en `sol-006` | Bloqueo de proveedor inexistente; proveedor activo derivado por nombre cuando falta NIT | No ejecutada |
| RC2 | HU-2, HU-4 | `oc_validar` | `sol-003`; caso válido `sol-001` | Bloqueo por aprobador ajeno al centro; aprobación válida en flujo normal | No ejecutada |
| RC3 | HU-2 | `oc_validar` | Caso válido `sol-001`; `sol-003` no aísla RC3 porque el remitente no pertenece al centro | Comparación de monto contra tope del aprobador autorizado | No ejecutada; no hay caso focal de exceder tope con aprobador correcto |
| RC4 | HU-2 | `oc_validar` | Todos presentan relaciones válidas | Sin bloqueo para combinaciones existentes | No ejecutada; no hay caso negativo focal |
| RC5 | HU-2 | `oc_validar` | `sol-004`; igualdad en `sol-001` | Confirmación con COP 25.000.000 y COP 26.500.000; diferencia 6 % | No ejecutada |
| RC6 | HU-2, HU-3 | `oc_validar` | `sol-006` | Derivado `C1`, fuente proveedor y confirmación | No ejecutada |
| RC7 | HU-2, HU-3 | `oc_validar` | `sol-006` | Derivado `Z030` informado sin confirmación adicional | No ejecutada |
| RC8 | HU-2, HU-5 | `oc_validar`, `oc_crear` | `sol-005` | `retroactiva = true`, confirmación y registro de control | No ejecutada |
| RC9 | HU-2 | `oc_validar` | Todos tienen aprobación igual o posterior a solicitud | Ausencia de confirmación por fecha | No ejecutada; no hay caso negativo focal |
| RC10 | HU-2 | `oc_validar` | Todos cuadran aritméticamente | Ausencia de bloqueo por aritmética | No ejecutada; no hay caso negativo focal |

## 4. Matriz de resultados esperados por caso

| Caso | Datos físicos disponibles | Resultado esperado según PRD | Reglas focales | Creación esperada | Evidencia de validación futura |
|---|---|---|---|---|---|
| `sol-001` | Correo, solicitud, cotización, aprobación | Apta | Validación positiva RC1–RC10 | Sí, sin intervención humana adicional; la vista previa no bloquea; repetir debe ser idempotente | Salida de demo, vista previa, evidencia, trazabilidad, orden `4500000001` en entorno limpio; registro exitoso y luego idempotente |
| `sol-002` | Correo, solicitud, cotización, aprobación | Bloqueo: proveedor inexistente | RC1 | No | `bloqueos` con RC1, acción sugerida, sin nueva orden y registro bloqueado sin invocar `oc_crear` |
| `sol-003` | Correo, solicitud, cotización, aprobación | Bloqueo: aprobador sin autoridad para `CC-2020` | RC2 | No | `bloqueos` con RC2, sin nueva orden y registro bloqueado sin invocar `oc_crear` |
| `sol-004` | Correo, solicitud, cotización, aprobación | Confirmación por diferencia de 6 % | RC5 | Solo tras aceptación explícita | Estado pendiente con ambos valores; silencio conserva pendiente; aceptación continúa y rechazo registra no creación |
| `sol-005` | Correo, solicitud, cotización, aprobación, factura | Retroactiva y pendiente de confirmación | RC8 | Solo tras aceptación explícita | `retroactiva = true`; pendiente registrado; aceptación permite crear y rechazo registra no creación |
| `sol-006` | Correo, solicitud sin NIT/IVA/pago, cotización, aprobación | Proveedor por nombre; IVA derivado con confirmación; pago derivado informado | RC1, RC6, RC7 | Solo tras aceptación explícita del IVA | Derivados `C1` y `Z030`; pendiente registrado; aceptación continúa y rechazo registra no creación |

Los resultados de esta tabla son **oráculos de prueba documentales**, no ejecuciones realizadas.

## 5. Herramientas y artefactos técnicos requeridos

| Elemento | Requisito trazado | Estado |
|---|---|---|
| `oc_leer_paquete` | HU-1 | Pendiente |
| `oc_validar` | HU-2, RC1–RC10 | Pendiente |
| `oc_construir_payload` | HU-3 | Pendiente |
| `oc_generar_evidencia` | HU-4 | Pendiente |
| `oc_crear` | HU-5 | Pendiente |
| `oc_leer_excel` | P1 opcional | Pendiente |
| `SapAdapter` y mock | HU-5 | Pendiente |
| Ciclo del agente y confirmación | HU-2, HU-5, CA1–CA5 | Pendiente |
| Chat con tool calls visibles | Requisito de arquitectura | Pendiente |
| `demo.ts` | Verificación determinista de seis casos | Pendiente |
| `out/<caso>/trazabilidad.json` | HU-3 | Pendiente |
| `out/<caso>/aprobacion.txt` / PDF | HU-4 | Pendiente |
| `out/sap/ordenes.jsonl` | HU-5 | Pendiente |
| `out/control.csv` | HU-5; exitoso, bloqueado y pendiente son requisito explícito; rechazado e idempotente se proponen como resultados diferenciados | Pendiente |
| `out/log.jsonl` | CA4 | Pendiente |

## 6. Trazabilidad de estados de control

| Estado | Disparador | ¿Ejecuta `oc_crear`? | Evidencia esperada | Naturaleza |
|---|---|---:|---|---|
| Exitoso | SAP simulado crea una OC nueva | Sí | Número nuevo y fila `exitoso` | Requisito oficial |
| Bloqueado | `oc_validar` devuelve uno o más bloqueos | No | Códigos de bloqueo y fila `bloqueado` | Requisito oficial |
| Pendiente de confirmación | Existe RC5, RC6, RC8 o RC9 sin decisión explícita | No | Confirmaciones solicitadas y fila `pendiente_confirmacion` | Requisito oficial; nombre normalizado propuesto |
| Rechazado | La analista responde negativamente de forma explícita | No | Decisión y fila `rechazado` | Diferenciación y nombre propuestos para trazabilidad |
| Idempotente | Ya existe OC para `solicitud_id` | Sí, pero no crea otra orden | Número existente y fila `idempotente` | Idempotencia oficial; nombre de resultado propuesto |

El backend/orquestador como escritor único y el registro append-only por transición son decisiones de diseño propuestas. Permiten cumplir la trazabilidad oficial sin ejecutar indebidamente `oc_crear` para bloqueos, pendientes o rechazos.

## 7. Vacíos de cobertura identificados

Aunque los seis casos funcionales solicitados están físicamente disponibles, no aíslan todas las condiciones negativas:

- No hay caso con adjunto base ausente físicamente.
- No hay JSON malformado ni monto no numérico para HU-6.
- No hay aprobador correcto que exceda su tope para aislar RC3.
- No hay subárea inválida para RC4.
- No hay cotización ausente para la segunda rama de RC5.
- No hay aprobación anterior a solicitud para RC9.
- No hay descuadre aritmético para RC10.
- No hay proveedor inactivo usado por una solicitud, aunque el maestro contiene uno.
- No hay código informado de IVA o pago inexistente en maestros.

## 8. Inconsistencias contractuales por resolver

- `OrdenCompra.aprobador.evidencia_sha256` hace que el payload final dependa de `oc_generar_evidencia`, aunque el contrato y la estructura narrativa presentan `oc_construir_payload` primero. Se documenta como orden implementable: evidencia → payload final.
- La entrada de `oc_crear` no incluye `apta`, bloqueos ni un identificador verificable de validación. Debe evitarse que el LLM invoque creación con un payload que no tenga una validación vigente.
- HU-5 exige una fila de control para resultados bloqueados o pendientes, estados en los que `oc_crear` no se ejecuta. Como decisión propuesta, el backend/orquestador observará todos los desenlaces y será el único escritor de `control.csv`; esta responsabilidad no se delegará al LLM ni exclusivamente a `oc_crear`.
- La firma de `oc_construir_payload` recibe `caso`, `paquete` y `derivados`, pero no declara el hash de evidencia que exige el payload; el contrato de entrada debe precisarse.

Estos vacíos no impiden la gestión documental, pero requieren decisiones de diseño, casos adicionales o copias de prueba controladas durante la implementación, sin alterar los fixtures originales.
