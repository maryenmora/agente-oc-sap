# 10. Implementación del agente conversacional y frontend — Fase 3 / 3.5

## Estado por componente

| Componente | Estado | Verificación |
|---|---|---|
| API HTTP, sesiones y frontend React | Implementado y probado | Pruebas, Vite build y prueba visual local |
| Modo local determinista | Implementado y probado | Demo, 57 pruebas y prueba HTTP local |
| Ciclo LLM seguro | Implementado y probado con proveedor HTTP simulado | Tool calling, confirmaciones, control, autorización e idempotencia |
| Adaptador OpenAI-compatible | Implementado y probado con proveedor HTTP simulado | Protocolo de mensajes, JSON inválido, HTTP y timeout |
| Proveedor LLM real | Implementado pero no verificado | No hay credenciales ni URL/modelo configurados |

## Arquitectura compartida

Ambos modos usan `processCase` de Fase 2 para RC1–RC10, evidencia, payload, autorización SHA-256, `oc_crear`, `ControlRecorder` y SAP simulado. El LLM no recibe acceso a `oc_crear`, `oc_generar_evidencia`, `oc_construir_payload`, archivos de autorización ni al registro de control. Solo puede solicitar lectura, validación o `oc_procesar_caso`; este último delega al orquestador del backend.

## Protocolo LLM

El adaptador preserva el mensaje `assistant` que contiene `tool_calls`; cada resultado se envía como `role: tool` con su `tool_call_id`. Los argumentos pasan por JSON y Zod antes de ejecutar una herramienta permitida. Herramientas desconocidas, argumentos inválidos, timeouts y errores HTTP se devuelven como resultados o errores legibles sin eliminar la sesión.

## Confirmaciones y control

Las confirmaciones están ligadas a sesión, caso y códigos RC. El silencio mantiene pendiente, una aceptación parcial no crea y un rechazo registra `rechazado`. `ControlRecorder` conserva transiciones `bloqueado`, `pendiente_confirmacion`, `rechazado`, `exitoso` e `idempotente`; el orquestador es el único escritor.

## Tokens

Cuando el proveedor reporta `usage.total_tokens`, el runtime lo conserva como uso real. Sin uso reportado utiliza una estimación conservadora `ceil(caracteres / 3)` solo para imponer el límite; no la presenta como conteo real de tokens.

## Pendiente

Persistencia durable, streaming, PDF P1, autenticación, SAP real y verificación contra un proveedor LLM real autorizado.
