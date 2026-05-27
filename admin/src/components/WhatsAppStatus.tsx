import { useEffect, useState, useRef } from 'react'
import QRCode from 'qrcode'
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

function QrDisplay({ data }: { data: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, data, { width: 256 })
    }
  }, [data])

  return <canvas ref={canvasRef} />
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
      {status.sessions.map((s) => {
        if (s.connected) return null
        return (
          <div key={s.id} style={{ margin: '1rem 0' }}>
            <p>
              <strong>{s.id}</strong>
              {s.retryCount > 0 && ` — ${s.retryCount} tentativas de reconexão`}
            </p>
            {s.qrCode && <QrDisplay data={s.qrCode} />}
            {!s.qrCode && <p>Aguardando QR code...</p>}
          </div>
        )
      })}
    </div>
  )
}
