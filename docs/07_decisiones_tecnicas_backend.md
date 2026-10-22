# 07. Decisiones técnicas del backend

## 1. Alcance

Este documento registra decisiones de implementación de la Fase 2. No modifica el PRD ni agrega reglas RC. El backend P0 funciona sin modelo de lenguaje; `LlmAdapter` queda como interfaz para la siguiente fase.

## 2. Guardia de creación independiente del LLM

### Requisito oficial

`oc_crear` solo puede ejecutarse si la solicitud es apta y no tiene confirmaciones pendientes.

### Decisión implementada

El backend emite `out/<caso>/autorizacion.json` únicamente después de recalcular RC1–RC10. La autorización queda ligada a:

- caso y `solicitud_id`;
- sesión;
- digest SHA-256 de la validación;
- digest SHA-256 del payload;
- conjunto completo de códigos confirmados;
- actor que confirmó.

`oc_crear` relee fixtures y maestros, recalcula la validación y compara todos los digests. Un payload alterado, una sesión diferente, un bloqueo o una confirmación faltante impiden la creación. El parámetro `confirmado?` del contrato oficial se conserva por compatibilidad, pero no constituye autorización.

## 3. Evidencia y payload

### Requisito oficial

El payload exige `aprobador.evidencia_sha256`, mientras el contrato narrativo lista construcción antes de generación de evidencia.

### Decisión implementada

El orden ejecutable es:

1. validar;
2. generar `aprobacion.txt` y `evidencia.json`;
3. construir el payload con el hash verificado;
4. emitir autorización;
5. crear.

`oc_construir_payload` conserva los argumentos oficiales y relee el hash desde la evidencia generada. El orquestador usa la misma función de dominio con el hash explícito. La trazabilidad se escribe en `out/<caso>/trazabilidad.json`.

## 4. Registro de control

### Requisito oficial

Todo intento exitoso, bloqueado o pendiente debe registrarse, incluso sin invocar `oc_crear`.

### Decisión implementada

`ControlRecorder`, invocado exclusivamente por el orquestador, escribe `out/control.csv`. Registra transiciones append-only:

- `bloqueado`;
- `pendiente_confirmacion`;
- `rechazado`;
- `exitoso`;
- `idempotente`.

La herramienta `oc_crear` no escribe control, para evitar omitir estados que nunca llegan a ella y para impedir duplicación de responsabilidades.

## 5. Normalización determinista

| Dato | Decisión |
|---|---|
| NIT | Se eliminan caracteres no numéricos; si hay más de nueve dígitos, el último se trata como dígito de verificación. |
| Dinero | Se eliminan símbolos y separadores de miles; se conserva separador decimal cuando existe. |
| Fecha | Para reglas de negocio se compara la parte `YYYY-MM-DD`; se valida su presencia antes de comparar. |
| Nombre | Unicode NFD, sin tildes, minúsculas y solo alfanumérico; se usa únicamente cuando falta NIT. |
| Email | Minúsculas y espacios extremos eliminados. |
| Vigencia | “N días” se calcula desde la fecha de cotización en UTC. |
| Unidad SAP | `H` para hora/bolsa, `MES` para mes/mensual y `UN` en los demás casos. |
| Texto breve | Truncamiento determinista a 40 caracteres, conservando el original en solicitud y trazabilidad. |

Monedas distintas, total cero o códigos IVA/pago desconocidos se tratan como bloqueos técnicos `RC*_DATOS`; no se presentan como nuevas reglas oficiales.

## 6. Confirmaciones múltiples

Cada confirmación tiene un código RC. La autorización solo se emite si `acceptedCodes` contiene todos los códigos vigentes. El silencio conserva `pendiente_confirmacion`; `rejected: true` registra rechazo; una aceptación parcial continúa pendiente. La identidad se conserva como identificador de sesión o actor porque autenticación está fuera del alcance.

## 7. SAP simulado

`MockSapAdapter` implementa `SapAdapter`, consulta el maestro de proveedores, busca referencias, asigna secuencia desde `4500000001` y persiste en `out/sap/ordenes.jsonl`. Consulta antes de crear y evita duplicados por `solicitud_id`.

## 8. Dependencias y límites

- Bun 1.4.2 como runtime, gestor y runner de pruebas.
- TypeScript 5.9.3 en modo estricto.
- Zod 4.3.6 para argumentos, fixtures, dominio y payload.
- Sin SDK LLM, credenciales, frontend, despliegue ni integración SAP real.
