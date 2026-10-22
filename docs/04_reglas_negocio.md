# 04. Reglas de negocio

## 1. Convenciones

- **Bloqueo**: impide crear la OC y no puede ser levantado mediante una confirmación.
- **Confirmación**: detiene el proceso hasta una decisión humana explícita. El silencio conserva el estado pendiente; una aceptación permite continuar y un rechazo detiene la creación.
- **Derivado**: valor completado desde un maestro; debe informarse y trazarse.
- Las reglas aquí descritas reproducen las condiciones y umbrales del PRD. Su implementación y ejecución están pendientes.

## 2. Matriz RC1–RC10

| Identificador | Descripción | Datos necesarios | Tipo de control | Resultado esperado | Acción ante incumplimiento | Historia de usuario relacionada |
|---|---|---|---|---|---|---|
| RC1 | El proveedor debe existir en `proveedores.json`, primero por NIT y, si no hay NIT, por nombre normalizado; además debe estar activo. | NIT opcional y nombre de solicitud/cotización; NIT, nombre, código SAP y estado del maestro | Bloqueo | Proveedor único, activo y con `codigo_sap` disponible | Bloquear la OC; informar que debe crearse, corregirse o activarse el proveedor antes de reintentar | HU-2, HU-3, HU-5 |
| RC2 | La aprobación debe existir, contener “Aprobado” y proceder de un correo listado como aprobador del `centro_costo`. | Aprobación, email del remitente, cuerpo; centro de costo y aprobadores del maestro | Bloqueo | Evidencia presente, afirmativa y emitida por aprobador autorizado para el centro | Bloquear; solicitar aprobación válida del responsable autorizado | HU-1, HU-2, HU-4, HU-5 |
| RC3 | `valor_total` debe ser menor o igual al `tope` del aprobador para ese centro. | Valor total; centro de costo; email y tope del aprobador | Bloqueo | `valor_total ≤ tope` | Bloquear; obtener aprobación de una persona con autoridad suficiente | HU-2, HU-5 |
| RC4 | La `subarea` debe pertenecer al `centro_costo`. | Centro de costo y subárea de la solicitud; subáreas del maestro | Bloqueo | Relación centro–subárea válida | Bloquear; corregir la imputación de la solicitud | HU-2, HU-3, HU-5 |
| RC5 | `abs(cotizacion.total − solicitud.valor_total) / solicitud.valor_total ≤ 2 %`. Si excede el 2 %, se requiere confirmación mostrando ambos valores. Si no hay cotización, también se requiere confirmación. | Total y moneda de solicitud; total y moneda de cotización; presencia de cotización | Confirmación | Sin confirmación cuando la diferencia relativa es ≤ 0,02; con confirmación afirmativa cuando excede o falta cotización | No crear hasta confirmar; mostrar ambos valores cuando existan y registrar la excepción | HU-1, HU-2, HU-3, HU-5 |
| RC6 | Si `indicador_iva` está ausente, se deriva de `indicador_iva_default` del proveedor y se pide confirmación. | IVA de solicitud; proveedor validado; IVA por defecto; maestro de IVA | Confirmación + derivado | Código derivado, informado, trazado y aceptado por la analista | No crear hasta confirmar el valor derivado; si no puede derivarse, escalar como dato faltante | HU-2, HU-3, HU-5, HU-6 |
| RC7 | Si `condiciones_pago` está ausente, se deriva del proveedor y solo se informa. | Pago de solicitud; proveedor validado; pago por defecto; maestro de condiciones | Derivado | Código derivado, informado y trazado, sin confirmación adicional | Si no puede derivarse, informar el dato faltante; el PRD no define expresamente su clasificación, por lo que requiere decisión de diseño | HU-2, HU-3 |
| RC8 | Si existe factura con `fecha < fecha_solicitud`, se marca `retroactiva = true`, se pide confirmación y se registra en control. | Presencia, número y fecha de factura; fecha de solicitud | Confirmación | Marca de retroactividad correcta y decisión humana registrada | No crear hasta confirmar; conservar `retroactiva = true` en `control.csv` y en las excepciones del payload | HU-1, HU-2, HU-3, HU-5 |
| RC9 | La fecha de aprobación debe ser mayor o igual a `fecha_solicitud`. | Fecha de aprobación y fecha de solicitud, con zona/normalización temporal definida | Confirmación | Sin observación si aprobación ≥ solicitud; confirmación si es anterior | No crear hasta confirmar la aprobación previa y registrar la excepción | HU-2, HU-3, HU-5 |
| RC10 | `cantidad × valor_unitario` debe igualar `valor_total` con tolerancia de ± 1 unidad monetaria. | Cantidad, valor unitario y valor total | Bloqueo | `abs(cantidad × valor_unitario − valor_total) ≤ 1` | Bloquear; solicitar corrección de cantidades o valores | HU-2, HU-3, HU-5, HU-6 |

## 3. Precedencia y acumulación

1. Los errores de lectura o tipo se gestionan como excepciones de HU-6 antes de aplicar reglas que dependan de esos datos.
2. `oc_validar` debe evaluar todas las reglas posibles y devolver listas acumuladas, no solo el primer hallazgo.
3. La presencia de cualquier bloqueo hace `apta = false` e impide `oc_crear`, aunque también existan confirmaciones.
4. Las confirmaciones no corrigen datos ni eliminan bloqueos; únicamente autorizan excepciones clasificadas como confirmables.
5. Los derivados deben identificar maestro y campo fuente en la trazabilidad.
6. `oc_crear` solo procede si no hay bloqueos y las confirmaciones están vacías o `confirmado = true`.

## 4. Aplicación esperada a los fixtures

| Caso | Regla focal | Evaluación documental esperada | Estado antes de decisión humana |
|---|---|---|---|
| `sol-001` | Todas | Proveedor activo, aprobador autorizado con tope suficiente, imputación válida, cotización igual, fechas válidas y aritmética exacta | Apta |
| `sol-002` | RC1 | El NIT `901999000` y el nombre no aparecen en proveedores | Bloqueada |
| `sol-003` | RC2 | `fvargas@...` pertenece a `CC-3030`, no a `CC-2020` | Bloqueada |
| `sol-004` | RC5 | Diferencia: `abs(26.500.000 − 25.000.000) / 25.000.000 = 0,06` o 6 %, mayor al 2 % | Pendiente de confirmación |
| `sol-005` | RC8 | Factura del 10/08/2026 anterior a solicitud del 27/08/2026 | Pendiente de confirmación y `retroactiva = true` |
| `sol-006` | RC1, RC6, RC7 | Sin NIT: proveedor identificable por nombre; IVA `C1` y pago `Z030` derivables del proveedor | Pendiente de confirmación por IVA; pago informado como derivado |

Estas son expectativas derivadas del PRD y de la inspección de archivos, no resultados de pruebas ejecutadas.

## 5. Aspectos que requieren aclaración de diseño

- Normalización exacta de NIT, incluida la exclusión o validación del dígito de verificación.
- Tratamiento de moneda diferente entre solicitud y cotización antes de aplicar RC5.
- Tratamiento de `solicitud.valor_total = 0`, que haría inválida la división de RC5.
- Clasificación cuando un código de IVA o condición de pago informado no existe en su maestro.
- Resultado cuando RC7 no puede derivar una condición de pago.
- Comparación de fechas con fecha simple y fecha-hora con zona.
- Identidad de `confirmado_por`: el reto no incluye autenticación, por lo que debe definirse un identificador de sesión o texto controlado.
- Alcance de una confirmación única cuando hay varias confirmaciones acumuladas; se recomienda mostrar y aceptar cada código de excepción de forma explícita.
