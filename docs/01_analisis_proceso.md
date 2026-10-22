# 01. Análisis del proceso de órdenes de compra SAP

## 1. Base documental y estado del análisis

Este análisis se elaboró a partir del PRD oficial **“Reto técnico 03 — Agente conversacional Órdenes de Compra SAP”, versión 2.0 del 3 de septiembre de 2026**, y de los fixtures disponibles en `reto-03/`. Describe el proceso requerido; no acredita que exista una implementación ni que los casos hayan sido ejecutados.

## 2. Objetivo del proceso

Preparar, validar y registrar una orden de compra (OC) a partir del paquete enviado por correo, reduciendo la digitación manual y aplicando controles uniformes antes de crear la OC en un adaptador SAP simulado. El proceso debe bloquear incumplimientos, solicitar confirmación humana ante excepciones controlables y registrar trazabilidad para auditoría.

## 3. Alcance

### Incluido

- Recepción lógica del correo y lectura del paquete normalizado.
- Lectura de solicitud, cotización, aprobación y factura opcional.
- Validación contra maestros de proveedores, centros de costo y aprobadores, indicadores de IVA y condiciones de pago.
- Aplicación de RC1–RC10.
- Derivación controlada de indicador de IVA y condiciones de pago cuando corresponda.
- Clasificación del caso como apto para continuar, bloqueado, pendiente de confirmación, confirmado o rechazado.
- Construcción y validación del payload de OC, con vista previa disponible sin convertirla en una aprobación manual obligatoria.
- Generación de evidencia de aprobación en texto como P0 y PDF como P1.
- Creación idempotente en SAP simulado.
- Registro de trazabilidad, llamadas a herramientas e intentos en archivos de control.
- Interacción conversacional con la analista administrativa.

### Fuera de alcance o limitado

- Integración real con SAP por OData, RFC/BAPI, Integration Suite o archivo: solo debe diseñarse.
- Lectura binaria real de Excel y PDF en P0; los fixtures están normalizados a JSON y texto.
- Recepción de mercancía, contabilización de factura y pago.
- Solicitud o ejecución de un nuevo workflow de aprobación.
- Autenticación, autorización, roles y multiusuario.
- Persistencia en base de datos.
- Decisión definitiva de política sobre OC retroactivas; el agente solo las detecta, confirma y mide.

## 4. Problema de negocio

La analista administrativa transcribe manualmente en SAP datos ya presentes en correo, solicitud y cotización. Además, valida mentalmente el proveedor, la asignación del centro de costo, la autoridad y el tope del aprobador, lo que eleva el tiempo operativo y el riesgo de errores contables. La organización tampoco dispone de una medición sistemática de las OC creadas después de recibir la factura.

## 5. Proceso actual (AS-IS)

1. El solicitante envía por correo una solicitud de compra, una cotización y la aprobación del líder.
2. La analista revisa manualmente que los documentos estén presentes.
3. La analista consulta o recuerda datos maestros y verifica proveedor, centro de costo, subárea, aprobador, monto, IVA y condiciones de pago.
4. La analista resuelve discrepancias mediante revisión o comunicación manual.
5. La analista digita en SAP los datos de cabecera y posición de la OC.
6. Convierte el correo de aprobación a PDF y lo adjunta como evidencia.
7. Registra o comunica el número de OC.
8. Cuando ya existe factura, puede crear la OC retroactivamente sin una medición estructurada del desvío.

### Debilidades del AS-IS

- Digitación repetitiva y susceptible a errores.
- Controles dependientes del conocimiento individual.
- Baja trazabilidad del origen de cada valor.
- Tratamiento no uniforme de discrepancias y datos ausentes.
- Falta de idempotencia explícita.
- Falta de medición consolidada de retroactividad.
- Conectividad real con SAP aún no confirmada.

## 6. Proceso automatizado propuesto (TO-BE)

1. La analista solicita en el chat procesar un caso.
2. `oc_leer_paquete` normaliza correo, solicitud, cotización, aprobación y factura opcional; los faltantes se reportan sin lanzar excepciones.
3. `oc_validar` aplica RC1–RC10 contra los maestros y devuelve bloqueos, confirmaciones, derivados y la marca `retroactiva`.
4. Si hay un error técnico o documental que impide interpretar el paquete, el agente informa una excepción legible y recomienda qué solicitar.
5. Si hay bloqueos, no se construye ni crea una OC; se registra el intento y la acción sugerida.
6. Si hay confirmaciones, el agente presenta la discrepancia o derivación, registra el estado pendiente y termina el turno con una pregunta explícita. Mientras no exista respuesta, conserva el contexto sin aceptar ni rechazar.
7. Si la analista rechaza explícitamente, el proceso no crea la OC y registra el rechazo. Si acepta explícitamente, continúa.
8. Sin confirmaciones, como en `sol-001`, el flujo continúa automáticamente sin aprobación manual adicional.
9. `oc_generar_evidencia` produce la evidencia de aprobación y su hash SHA-256.
10. `oc_construir_payload` incorpora el hash, genera la OC y registra su trazabilidad. El agente muestra una vista previa consultable, pero mostrarla no detiene el flujo normal ni exige conformidad manual.
11. `oc_crear` consulta primero una OC por `solicitud_id`; reutiliza el número existente o crea una nueva OC en SAP simulado.
12. El proceso registra resultado, número de OC, retroactividad, bloqueos, confirmaciones, marcas de tiempo y llamadas a herramientas.

## 7. Estados operativos

| Estado | Significado | ¿Puede crear OC? | Tratamiento |
|---|---|---:|---|
| Apta | Cumple controles y no requiere decisión adicional. | Sí | Construir payload, evidencia y crear. |
| Bloqueada | Incumple una regla de tipo bloqueo. | No | Informar motivo, acción sugerida y registrar intento. |
| Pendiente de confirmación | Presenta una condición permitida solo con decisión humana y aún no hay respuesta explícita. | No | Mostrar datos comparables, registrar el estado y conservar el contexto. El silencio mantiene este estado. |
| Confirmación aceptada | La analista aceptó explícitamente todas las confirmaciones aplicables. | Sí | Continuar con evidencia, payload y creación. |
| Confirmación rechazada | La analista rechazó explícitamente continuar. | No | No crear la OC y registrar el rechazo separado del estado pendiente. |
| Excepción | El paquete o una herramienta no puede procesarse correctamente. | No | Devolver error legible; no confundir con incumplimiento de negocio. |
| Creada | SAP simulado devolvió número de OC. | Ya creada | Registrar resultado y número. |
| Idempotente | La referencia ya tenía OC. | No crea otra | Devolver el número existente y registrar el nuevo intento como idempotente. |

## 8. Actores y responsabilidades

| Actor | Responsabilidades |
|---|---|
| Solicitante | Preparar y enviar el paquete documental con información correcta. |
| Líder aprobador | Emitir aprobación por correo dentro de su centro de costo y tope. |
| Analista administrativa | Iniciar el procesamiento, revisar el payload y decidir confirmaciones; atender bloqueos y excepciones. |
| Agente conversacional | Orquestar herramientas, explicar resultados sin inventar valores y conservar el estado de confirmación. |
| Herramientas de OC | Leer, normalizar, validar, construir payload, generar evidencia y crear la OC mediante contratos tipados. |
| Maestros de datos | Proveer referencias de proveedor, estructura de costo, autoridad, IVA y pago. |
| SAP simulado | Consultar idempotencia, asignar número secuencial y persistir órdenes en archivos. |
| Contabilidad / Auditoría | Revisar evidencia, trazabilidad y registro de control. |
| Proveedor LLM | Interpretar la conversación y seleccionar herramientas; no es fuente autorizada de datos de negocio. |

## 9. Actividades manuales y automatizables

| Actividad | Clasificación propuesta | Observación |
|---|---|---|
| Preparar y enviar la solicitud | Manual | Se origina fuera del agente. |
| Aprobar el gasto | Manual | El agente verifica una aprobación previa; no la solicita. |
| Leer y normalizar documentos | Automatizable | P0 sobre JSON/texto; binarios reales quedan como P1. |
| Consultar maestros | Automatizable | Fixtures en P0; SAP en tiempo real sería evolución productiva. |
| Aplicar RC1–RC10 | Automatizable | Debe ser determinista y ajeno a decisiones del LLM. |
| Corregir un paquete incompleto o inválido | Manual asistida | El agente indica qué falta o qué debe corregirse. |
| Confirmar discrepancias y derivados sensibles | Manual | Punto de control humano obligatorio. |
| Construir payload y trazabilidad | Automatizable | Validación con esquema `zod`. |
| Consultar la vista previa del payload | Manual opcional | La HU-3 exige visibilidad, no una aprobación adicional; el flujo normal continúa automáticamente. |
| Generar evidencia y hash | Automatizable | Texto P0; PDF P1. |
| Crear OC y controlar duplicados | Automatizable | En P0 contra SAP simulado. |
| Resolver indisponibilidad o error parcial de SAP real | Manual asistida | Requiere diseño de reintentos, idempotencia y Plan B. |
| Auditar resultados y retroactividad | Automatizable para registro; manual para análisis | `control.csv` es la fuente prevista. |

## 10. Registro de control

### Requisito oficial

El PRD exige registrar cada intento exitoso, bloqueado o pendiente en `out/control.csv`, incluso cuando no se ejecuta `oc_crear`, con `solicitud_id`, resultado, número de OC, retroactividad, bloqueos, confirmaciones y marca de tiempo. La idempotencia exige devolver el número existente sin crear otra OC.

### Decisión de diseño propuesta

Se propone que el backend/orquestador sea el único escritor del registro de control porque observa validación, conversación y respuesta del adaptador SAP. Registrará los resultados `bloqueado`, `pendiente_confirmacion`, `rechazado`, `exitoso` e `idempotente`; los dos últimos incluyen número de OC. Si un caso cambia de pendiente a rechazado o exitoso, se propone anexar una nueva fila para preservar la secuencia de decisiones. Esta asignación técnica y los nombres de estado son propuestas de diseño, no reglas RC adicionales.

## 11. Entradas y salidas

### Entradas

- Mensaje de la analista con el identificador del caso.
- Correo de solicitud normalizado.
- Solicitud de compra normalizada.
- Cotización normalizada.
- Evidencia de aprobación normalizada.
- Factura opcional para detectar retroactividad.
- Maestro de proveedores.
- Maestro de centros de costo, subáreas, aprobadores y topes.
- Maestro de indicadores de IVA.
- Maestro de condiciones de pago.
- Confirmación posterior de la analista, cuando aplique.

### Salidas

- Paquete normalizado con faltantes explícitos.
- Resultado de validación: `apta`, `bloqueos`, `confirmaciones`, `derivados` y `retroactiva`.
- Mensaje de excepción y acción sugerida, cuando aplique.
- Payload de la OC validado.
- Archivo de trazabilidad por campo.
- Evidencia de aprobación y SHA-256.
- Número y fecha de OC, o motivo de no creación.
- Registro de control por intento.
- Historial visible de llamadas a herramientas y log técnico.

## 12. Riesgos y dependencias

| Riesgo o dependencia | Impacto | Tratamiento previsto |
|---|---|---|
| Viabilidad de integración real con SAP no confirmada | Puede impedir creación automática en producción. | Definir puerto `SapAdapter`, evaluar OData/RFC/Integration Suite y mantener Plan B por archivo o payload listo para copiar. |
| Maestros incompletos o desactualizados | Bloqueos incorrectos o datos derivados erróneos. | En producción consultar SAP en tiempo real, versionar fuente y registrar derivaciones. |
| Aprobación por correo insuficiente para auditoría | Evidencia no aceptada. | Confirmar política y evaluar firma digital o workflow corporativo. |
| El LLM altera o inventa valores | Riesgo financiero y de integridad. | Herramientas como única fuente, payload validado y trazabilidad por campo. |
| Reintentos crean duplicados | Doble compromiso de compra. | Idempotencia por `solicitud_id` antes de crear. |
| Error parcial o timeout en SAP real | Estado incierto de la OC. | Consulta posterior por referencia, claves idempotentes y estado reconciliable. |
| Documentos ausentes o malformados | Caso no procesable. | Error tipado y recomendación; continuar con otros casos. |
| Política de OC retroactivas sin definir | Tratamiento organizacional ambiguo. | Confirmar, marcar y medir; elevar la decisión de política a dirección. |
| Lectura de binarios fuera de P0 | Diferencia entre reto y operación real. | Incorporar extractores en una fase posterior y validar contra los mismos contratos normalizados. |
| Datos personales o credenciales en logs | Exposición de información. | Minimización, secretos solo en backend y exclusión explícita de claves en logs y respuestas. |

## 13. Situación actual del repositorio

Al momento de este análisis, el repositorio contiene únicamente `README.md` y la documentación de esta fase. No existe implementación del agente, herramientas, adaptador SAP, pruebas ni resultados de ejecución; cualquier comportamiento descrito es un requisito pendiente de desarrollo y validación.
