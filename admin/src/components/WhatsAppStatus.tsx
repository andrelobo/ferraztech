import { useEffect, useState } from 'react'
import api from '../services/api'

interface Status {
  connected: boolean
  qrCode: string | null
  uptime: number
  retryCount: number
}

export function WhatsAppStatus() {
  const [status, setStatus] = useState<Status | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/whatsapp/status')
      .then((res) => setStatus(res.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div>Carregando...</div>

  return (
    <div>
      <h2>WhatsApp</h2>
      <p>
        Status:{' '}
        <strong>
          {status?.connected ? 'Conectado' : 'Desconectado'}
        </strong>
      </p>
      {status?.uptime ? <p>Uptime: {status.uptime}s</p> : null}
      {status && status.retryCount > 0 ? (
        <p>Tentativas de reconexão: {status.retryCount}</p>
      ) : null}
    </div>
  )
}
