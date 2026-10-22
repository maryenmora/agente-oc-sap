import type { Session } from "./types"

export class SessionStore {
  private readonly sessions = new Map<string, Session>()

  getOrCreate(id: string): Session {
    const existing = this.sessions.get(id)
    if (existing) return existing
    const now = new Date().toISOString()
    const session: Session = { id, messages: [], pendingConfirmation: null, actualTokenCount: 0, estimatedTokenCount: 0, createdAt: now, updatedAt: now }
    this.sessions.set(id, session)
    return session
  }

  get(id: string): Session | null {
    return this.sessions.get(id) ?? null
  }

  update(session: Session): Session {
    session.updatedAt = new Date().toISOString()
    this.sessions.set(session.id, session)
    return session
  }
}
