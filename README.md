# agente-oc-sap

Aplicación Full Stack para preparar, validar y crear órdenes de compra en SAP simulado mediante un chat.

La descripción completa de la solución, decisiones, cobertura y riesgos está en [`SOLUCION.md`](SOLUCION.md).

## Estado real del MVP

- Modo local determinista: implementado y validado por pruebas, demo y E2E local.
- Modo LLM OpenAI-compatible: implementado y probado contra un proveedor HTTP local simulado.
- Proveedor LLM real: pendiente de verificación con credenciales autorizadas.
- SAP real: no conectado; se usa `MockSapAdapter`.
- Link público: pendiente; no hay despliegue.

## Requisitos

- Bun 1.4+

## Instalación

```bash
bun install
```

## Ejecutar la aplicación

```bash
bun run dev
```

- Frontend React/Vite: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:3000`
- Health: `GET /api/health`

## Variables opcionales de LLM

Copie `.env.example` a `.env` y defina `LLM_BASE_URL`, `LLM_MODEL` y `LLM_API_KEY` para un proveedor compatible con OpenAI. Las claves se usan solo en el backend.

Sin esa configuración, la aplicación funciona en modo local determinista: usa herramientas, validaciones, autorizaciones y SAP simulado reales, pero no realiza llamadas a un proveedor LLM.

## Demo del backend

```bash
bun run demo
```

Limpia `out/`, procesa los seis casos, repite `sol-001` para idempotencia y confirma explícitamente `sol-004`.

## Calidad

```bash
bun test
bun run typecheck
bun run lint
bun run build
bun run e2e:browser
```

`e2e:browser` requiere `E2E_EVIDENCE_DIR` y servidores locales activos mediante `bun run dev`.

## Alcance actual

Incluye herramientas P0, RC1–RC10, evidencia TXT, trazabilidad, autorización segura, SAP simulado, API HTTP, sesiones en memoria, adaptador LLM OpenAI-compatible, chat React y control CSV.

Pendiente: proveedor LLM real verificado, persistencia durable de sesiones, streaming, PDF P1, autenticación, SAP real, link público y carpeta bonus `modulo/`.
