# 06. Registro de revisión documental

## 1. Identificación de la revisión

- **Fase:** 1.1 — Revisión y mejora de la gestión documental.
- **Fuente de verdad:** PRD oficial “Reto técnico 03 — Agente conversacional Órdenes de Compra SAP”, versión 2.0.
- **Alcance:** corrección del flujo, estados de confirmación y responsabilidad del registro de control.
- **Estado de implementación:** no iniciada; esta revisión solo modifica documentación.

## 2. Hallazgos encontrados

1. La actividad “Revisar OC propuesta” podía interpretarse como una aprobación manual obligatoria antes de crear cualquier OC, en conflicto con O1: `sol-001` debe terminar sin intervención humana.
2. El diagrama agrupaba “No o sin respuesta”, aunque una ausencia de respuesta no equivale a un rechazo explícito.
3. La tabla no representaba de forma separada confirmación pendiente, aceptada y rechazada.
4. El registro de control aparecía al final del flujo sin un responsable técnico capaz de observar estados donde `oc_crear` no se ejecuta.
5. El inventario y la matriz reconocían el vacío de responsabilidad, pero no adoptaban una propuesta uniforme.
6. La trazabilidad no detallaba cómo representar resultados exitosos, bloqueados, pendientes, rechazados e idempotentes.

## 3. Correcciones solicitadas

- Mantener la vista previa disponible sin convertirla en compuerta del flujo normal.
- Permitir que `sol-001` continúe automáticamente tras validar RC1–RC10.
- Exigir intervención humana únicamente para RC5, RC6, RC8 y RC9.
- Diferenciar espera, aceptación y rechazo explícito.
- No inferir decisión a partir del silencio.
- Registrar todos los desenlaces, aunque no se invoque `oc_crear`.
- Separar requisitos oficiales de decisiones técnicas propuestas.
- Mantener sin cambios los umbrales y condiciones RC1–RC10.

## 4. Ajustes realizados

### Flujo normal y vista previa

- La vista previa se definió como **consultable y no bloqueante**.
- Se eliminó la conformidad manual como requisito previo para crear una OC apta.
- Se documentó que `sol-001` continúa automáticamente hasta la verificación de idempotencia y creación.

### Estados de confirmación

- **Pendiente:** se registra al formular la pregunta; conserva contexto y no crea OC.
- **Aceptada:** requiere respuesta afirmativa explícita y permite continuar.
- **Rechazada:** requiere respuesta negativa explícita, no crea OC y genera un resultado independiente.
- **Silencio:** mantiene el estado pendiente; no se interpreta como aceptación ni rechazo.

### Registro de control

- Se preservó como requisito oficial el registro de intentos exitosos, bloqueados y pendientes, y la idempotencia por `solicitud_id`.
- Se propuso al **backend/orquestador** como escritor único de `out/control.csv`, porque observa todos los desenlaces.
- Se propusieron resultados normalizados: `bloqueado`, `pendiente_confirmacion`, `rechazado`, `exitoso` e `idempotente`.
- Se propuso un registro append-only por transición para diferenciar, por ejemplo, un pendiente inicial de su posterior aceptación o rechazo.
- Se marcó explícitamente que el propietario técnico, los nombres de resultado y la correlación por sesión son decisiones de diseño propuestas, no reglas oficiales nuevas.

## 5. Archivos modificados

| Archivo | Cambio |
|---|---|
| `docs/01_analisis_proceso.md` | Flujo automático normal, estados separados, vista previa opcional y sección de control con requisito/propuesta. |
| `docs/02_inventario_documental.md` | Responsable propuesto y cobertura de resultados del registro de control. |
| `docs/03_flujo_proceso.md` | Tabla y Mermaid reconstruidos con rutas equivalentes para apto, bloqueo, pendiente, aceptación, rechazo, éxito e idempotencia. |
| `docs/04_reglas_negocio.md` | Definición de confirmación ajustada para no equiparar silencio y rechazo; RC1–RC10 permanecen intactas. |
| `docs/05_matriz_trazabilidad.md` | Vista previa no bloqueante, evidencia por estado y distinción entre requisito oficial y propuesta técnica. |
| `docs/06_registro_revision_documental.md` | Evidencia de la revisión y diferencias de versión. |

## 6. Verificación de consistencia con el PRD

| Punto verificado | Resultado |
|---|---|
| `sol-001` termina sin intervención humana adicional | Conforme: la vista previa no detiene la creación. |
| Confirmaciones solo en RC5, RC6, RC8 y RC9 | Conforme. |
| Bloqueos no se levantan mediante confirmación | Conforme. |
| El silencio no se interpreta como decisión | Conforme; permanece pendiente. |
| `oc_crear` no se ejecuta ante bloqueo, pendiente o rechazo | Conforme. |
| Intentos sin `oc_crear` quedan trazables | Conforme mediante responsabilidad propuesta del orquestador. |
| Idempotencia devuelve OC existente sin duplicar | Conforme. |
| Tabla y diagrama representan las mismas decisiones | Conforme: ambos incluyen las mismas rutas y estados. |
| Mermaid usa `flowchart TD` | Conforme. |
| Umbral RC5 de 2 % | Sin cambios. |
| Tolerancia RC10 de ± 1 unidad monetaria | Sin cambios. |
| RC1–RC10 | Sin cambios sustantivos. |
| Resultados de pruebas | No se inventaron; continúan como validación pendiente. |

## 7. Diferencias entre versión inicial y versión corregida

| Tema | Versión inicial | Versión corregida |
|---|---|---|
| Vista previa | Podía leerse como revisión/aprobación obligatoria | Disponible para consulta y no bloqueante |
| `sol-001` | Flujo ambiguo por revisión manual | Continúa automáticamente sin nueva decisión humana |
| Sin respuesta | Agrupada con rechazo | Mantiene estado pendiente |
| Aceptación | Rama “Sí” genérica | Estado explícito que habilita continuación |
| Rechazo | Agrupado con silencio | Resultado explícito de no creación |
| Control | Registro final sin propietario definido | Orquestador propuesto como escritor único |
| Intentos no creados | Trazabilidad declarada pero mecanismo ambiguo | Registro al producirse bloqueo, pendiente o rechazo |
| Idempotencia | Devolución del número existente | Devolución y resultado de control diferenciado |
| Relación requisito/diseño | Parcialmente mezclada | Secciones separadas y decisiones propuestas etiquetadas |

## 8. Cierre documental

La corrección deja alineados el análisis, el flujo y la matriz de trazabilidad con el PRD para iniciar posteriormente el diseño técnico. La programación, ejecución de casos y validación de resultados permanecen fuera de esta fase.
