import { useEffect, useState } from 'react'
import api from '../services/api'

interface SessionStatus {
  id: string
  connected: boolean
  qrCode: string | null
  retryCount: number
  startTime: number
}

interface MultiStatus {
  sessions: SessionStatus[]
  activeSession: string | null
  uptime: number
}

export function WhatsAppStatus() {
  const [status, setStatus] = useState<MultiStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/whatsapp/status')
      .then((res) => setStatus(res.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div>Carregando...</div>
  if (!status) return null

  const connected = status.activeSession !== null
  const connectedSessions = status.sessions.filter((s) => s.connected).length
  const totalSessions = status.sessions.length

  return (
    <div>
      <h2>WhatsApp</h2>
      <p>
        Status:{' '}
        <strong>{connected ? 'Conectado' : 'Desconectado'}</strong>
      </p>
      <p>
        Sessões: {connectedSessions}/{totalSessions} ativas
      </p>
      {connected && <p>Sessão ativa: {status.activeSession}</p>}
      {status.uptime ? <p>Uptime: {status.uptime}s</p> : null}
      {status.sessions.map((s) =>
        s.retryCount > 0 ? (
          <p key={s.id}>
            {s.id}: {s.retryCount} tentativas de reconexão
          </p>
        ) : null,
      )}
    </div>
  )
}
