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

const STATUS_POLL_INTERVAL_MS = 5000

function QrDisplay({ sessionId }: { sessionId: string }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    let objectUrl: string | null = null

    setLoading(true)
    setImageUrl(null)

    api
      .get('/whatsapp/qr', {
        params: { session: sessionId },
        responseType: 'blob',
      })
      .then((res) => {
        if (!active) return
        objectUrl = URL.createObjectURL(res.data)
        setImageUrl(objectUrl)
      })
      .catch(() => {
        if (active) {
          setImageUrl(null)
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [sessionId])

  if (imageUrl) {
    return (
      <img
        className="qr-display"
        src={imageUrl}
        alt={`QR code da sessão ${sessionId}`}
        width={256}
        height={256}
      />
    )
  }

  if (loading) {
    return <p>Carregando QR code...</p>
  }

  return <p>QR code indisponível no momento.</p>
}

export function WhatsAppStatus() {
  const [status, setStatus] = useState<MultiStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const loadStatus = () => {
      api
        .get('/whatsapp/status')
        .then((res) => {
          if (!active) return
          setStatus(res.data)
          setError('')
        })
        .catch(() => {
          if (!active) return
          setError('Nao foi possivel obter o status do WhatsApp.')
        })
        .finally(() => {
          if (active) {
            setLoading(false)
          }
        })
    }

    loadStatus()
    const intervalId = window.setInterval(loadStatus, STATUS_POLL_INTERVAL_MS)

    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [])

  if (loading) return <div>Carregando...</div>
  if (error && !status) return <div>{error}</div>
  if (!status) return null

  const connected = status.activeSession !== null
  const connectedSessions = status.sessions.filter((s) => s.connected).length
  const totalSessions = status.sessions.length

  return (
    <section className="panel whatsapp-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Canal WhatsApp</p>
          <h2>WhatsApp</h2>
          <p className="section-copy">
            Monitore a sessao ativa, acompanhe reconexoes e visualize o QR das
            sessoes que precisarem de autenticacao.
          </p>
        </div>
        <span className="status-pill" data-status={connected ? 'connected' : 'disconnected'}>
          {connected ? 'Conectado' : 'Desconectado'}
        </span>
      </div>

      <div className="metrics-grid">
        <article className="metric-card">
          <span>Sessoes ativas</span>
          <strong>{connectedSessions}/{totalSessions}</strong>
        </article>
        <article className="metric-card">
          <span>Sessao principal</span>
          <strong>{status.activeSession ? 'Em operacao' : 'Nenhuma'}</strong>
        </article>
        <article className="metric-card">
          <span>Uptime</span>
          <strong>{status.uptime ? `${status.uptime}s` : '0s'}</strong>
        </article>
      </div>

      {error && (
        <p className="form-feedback" data-feedback="error">
          {error}
        </p>
      )}

      <div className="session-list">
        {status.sessions.map((s) => (
          <article
            className="session-card"
            data-session-state={s.connected ? 'connected' : 'disconnected'}
            key={s.id}
          >
            <div className="session-card__header">
              <div>
                <strong>{s.id}</strong>
                <p>
                  {s.connected
                    ? 'Pronta para receber e enviar mensagens.'
                    : 'Aguardando autenticacao ou reconexao.'}
                </p>
              </div>
              <span className="mini-status" data-status={s.connected ? 'connected' : 'disconnected'}>
                {s.connected ? 'Ativa' : 'Offline'}
              </span>
            </div>

            {s.connected && status.activeSession === s.id && (
              <p className="session-card__note">Sessao ativa no momento.</p>
            )}

            {!s.connected && s.retryCount > 0 && (
              <p className="session-card__note">
                {s.retryCount} tentativa{s.retryCount === 1 ? '' : 's'} de reconexao
              </p>
            )}

            {!s.connected && s.qrCode && (
              <div className="qr-frame">
                <QrDisplay sessionId={s.id} />
              </div>
            )}

            {!s.connected && !s.qrCode && (
              <p className="session-card__note">Aguardando QR code...</p>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
