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
    <section className="panel composer-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Resposta Manual</p>
          <h2>Enviar Mensagem</h2>
          <p className="section-copy">
            Use este atalho para responder rapido quando o atendimento humano
            assumir a conversa.
          </p>
        </div>
      </div>

      <form className="stack-form" onSubmit={handleSubmit}>
        <div className="field">
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
        <div className="field">
          <label htmlFor="message">Mensagem</label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
        </div>
        {feedback && (
          <p className="form-feedback" data-feedback={feedback.type}>
            {feedback.text}
          </p>
        )}
        <button className="button-primary" type="submit" disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar'}
        </button>
      </form>
    </section>
  )
}
