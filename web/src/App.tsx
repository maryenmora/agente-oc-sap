import { FormEvent, useEffect, useMemo, useState } from "react"
import { fetchHealth, fetchSession, sendMessage, type Message, type Pending, type ToolCall } from "./api"

function stableSessionId(): string {
  const key = "agente-oc-sap.session-id"
  const existing = window.sessionStorage.getItem(key)
  if (existing) return existing
  const created = crypto.randomUUID()
  window.sessionStorage.setItem(key, created)
  return created
}

function summary(value: unknown): string {
  return JSON.stringify(value, null, 2).slice(0, 900)
}

function latestData(messages: Message[]): Record<string, unknown> | undefined {
  return [...messages].reverse().find((message) => message.data)?.data
}

function Tools({ calls }: { calls: ToolCall[] }) {
  return (
    <div className="tools">
      {calls.map((call) => (
        <details key={call.id} className={`tool ${call.status}`}>
          <summary><span>{call.name}</span><strong>{call.status === "completed" ? "Completada" : "Falló"}</strong></summary>
          <p>Argumentos</p><pre>{summary(call.arguments)}</pre>
          <p>Resultado</p><pre>{summary(call.result)}</pre>
        </details>
      ))}
    </div>
  )
}

function OrderPanel({ data, pending, loading, onDecision }: { data: Record<string, unknown> | undefined; pending: Pending | null; loading: boolean; onDecision(message: string): void }) {
  const result = data?.resultado as string | undefined
  const blocks = (data?.bloqueos as string[] | undefined) ?? []
  const confirmations = (data?.confirmaciones as string[] | undefined) ?? []
  const blockDetails = (data?.detalle_bloqueos as Array<{ codigo: string; detalle: string }> | undefined) ?? []
  const derived = (data?.derivados as Record<string, unknown> | undefined) ?? {}
  const payload = data?.payload
  return (
    <aside className="order">
      <p className="eyebrow">Estado de la orden</p>
      <h2>{String(data?.caso ?? "Sin caso")}</h2>
      <div data-testid="order-status" className={`status ${result ?? "idle"}`}>{result ?? "Esperando instrucción"}</div>
      {data?.numero_oc ? <div className="po"><span>OC SAP</span><strong data-testid="po-number">{String(data.numero_oc)}</strong></div> : null}
      {data?.retroactiva ? <div data-testid="retroactive" className="notice">Orden retroactiva</div> : null}
      <section><h3>Bloqueos</h3>{blocks.length ? blockDetails.map((item) => <p className="detail danger" key={item.codigo}><strong>{item.codigo}</strong> {item.detalle}</p>) : <p>Sin bloqueos</p>}</section>
      <section><h3>Confirmaciones</h3>{confirmations.length ? confirmations.map((item) => <span className="chip warn" key={item}>{item}</span>) : <p>Sin confirmaciones</p>}</section>
      {Object.keys(derived).length ? <section data-testid="derived-values"><h3>Valores derivados</h3>{Object.entries(derived).map(([key, value]) => <p className="detail" key={key}><strong>{key}</strong> {String(value)}</p>)}</section> : null}
      {payload ? <details className="payload" data-testid="payload-preview"><summary>Vista previa de OC</summary><pre>{JSON.stringify(payload, null, 2)}</pre></details> : null}
      {pending ? (
        <section className="confirmation" data-testid="confirmation-panel">
          <h3>Confirmación requerida</h3>
          {pending.details.map((item) => <p key={item.codigo}><strong>{item.codigo}</strong> {item.detalle}</p>)}
          <div className="actions">
            <button type="button" data-testid="confirm-button" disabled={loading} onClick={() => onDecision(`Confirmo ${pending.codes.join(", ")} de ${pending.caso}`)}>Confirmar</button>
            <button type="button" data-testid="reject-button" disabled={loading} className="secondary" onClick={() => onDecision(`Rechazo ${pending.codes.join(", ")} de ${pending.caso}`)}>Rechazar</button>
          </div>
        </section>
      ) : null}
    </aside>
  )
}

export function App() {
  const [sessionId] = useState(stableSessionId)
  const [messages, setMessages] = useState<Message[]>([])
  const [pending, setPending] = useState<Pending | null>(null)
  const [text, setText] = useState("Procesa sol-004 y no crees la OC sin mi confirmación")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState("verificando modo…")
  const data = useMemo(() => latestData(messages), [messages])

  useEffect(() => {
    fetchHealth()
      .then((health) => setMode(health.provider === "local-deterministic" ? "modo local determinista (sin LLM)" : `LLM ${health.model}`))
      .catch(() => setMode("API no disponible"))
    fetchSession(sessionId)
      .then((session) => {
        if (!session) return
        setMessages(session.messages)
        setPending(session.pendingConfirmation)
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "No fue posible recuperar la sesión"))
  }, [sessionId])

  async function submit(message: string) {
    if (!message.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      const response = await sendMessage(sessionId, message)
      setMessages(response.session.messages)
      setPending(response.session.pendingConfirmation)
      setText("")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible procesar la solicitud")
    } finally {
      setLoading(false)
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    void submit(text)
  }

  return (
    <main className="shell">
      <section className="chat">
        <header>
          <div><p className="eyebrow">Compras · SAP simulado · <span data-testid="mode">{mode}</span></p><h1>Agente de Órdenes de Compra</h1></div>
          <span className="session">Sesión {sessionId.slice(0, 8)}</span>
        </header>
        <div className="messages">
          {messages.length === 0 ? <div className="empty">Escribe un caso como <code>sol-001</code> para comenzar.</div> : null}
          {messages.map((message) => (
            <article key={message.id} className={`message ${message.role}`}>
              <p>{message.content}</p>
              {message.toolCalls ? <Tools calls={message.toolCalls} /> : null}
            </article>
          ))}
          {loading ? <div className="thinking" role="status" aria-live="polite">Procesando con herramientas…</div> : null}
          {error ? <div className="error" role="alert">{error}</div> : null}
        </div>
        <form onSubmit={onSubmit}>
          <input aria-label="Mensaje" value={text} onChange={(event) => setText(event.target.value)} placeholder="Escribe una instrucción" />
          <button disabled={loading || !text.trim()}>Enviar</button>
        </form>
      </section>
      <OrderPanel data={data} pending={pending} loading={loading} onDecision={(message) => void submit(message)} />
    </main>
  )
}
