import { useState, type FormEvent } from 'react'
import api from '../services/api'

export function SendMessage() {
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFeedback(null)
    setLoading(true)

    try {
      const res = await api.post('/whatsapp/send-message', { to: phone, message })
      if (res.data.sent) {
        setFeedback({ type: 'success', text: 'Mensagem enviada com sucesso!' })
        setPhone('')
        setMessage('')
      } else if (res.data.queued) {
        setFeedback({ type: 'success', text: 'Mensagem na fila para envio.' })
        setPhone('')
        setMessage('')
      }
    } catch (err: any) {
      const text = err?.response?.data?.message || 'Erro ao enviar mensagem'
      setFeedback({ type: 'error', text })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2>Enviar Mensagem</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="phone">Telefone</label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="5511999999999"
            required
          />
        </div>
        <div>
          <label htmlFor="message">Mensagem</label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
        </div>
        {feedback && (
          <p style={{ color: feedback.type === 'success' ? 'green' : 'red' }}>
            {feedback.text}
          </p>
        )}
        <button type="submit" disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar'}
        </button>
      </form>
    </div>
  )
}
