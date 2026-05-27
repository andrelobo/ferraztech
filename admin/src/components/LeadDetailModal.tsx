import { useEffect, useState } from 'react'
import api from '../services/api'

interface Lead {
  _id: string
  name: string
  phone: string
  email?: string
  serviceType: string
  status: string
  createdAt: string
}

interface Message {
  _id: string
  role: string
  content: string
  timestamp: string
}

interface Props {
  lead: Lead
  onClose: () => void
}

const statusLabels: Record<string, string> = {
  new: 'Novo',
  contacted: 'Contactado',
  qualified: 'Qualificado',
  converted: 'Convertido',
  lost: 'Perdido',
}

export function LeadDetailModal({ lead, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get(`/conversations/${lead.phone}/messages`)
      .then((res) => setMessages(res.data))
      .finally(() => setLoading(false))
  }, [lead.phone])

  return (
    <div className="modal-backdrop">
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="lead-detail-title">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Historico do Lead</p>
            <h2 id="lead-detail-title">{lead.name}</h2>
          </div>
          <button className="button-secondary button-compact" onClick={onClose}>Fechar</button>
        </div>

        <div className="modal-meta">
          <div className="meta-chip">
            <span>Telefone</span>
            <strong>{lead.phone}</strong>
          </div>
          {lead.email && (
            <div className="meta-chip">
              <span>Email</span>
              <strong>{lead.email}</strong>
            </div>
          )}
          <div className="meta-chip">
            <span>Servico</span>
            <strong>{lead.serviceType}</strong>
          </div>
          <div className="meta-chip">
            <span>Status</span>
            <strong>{statusLabels[lead.status] || lead.status}</strong>
          </div>
          <div className="meta-chip">
            <span>Data</span>
            <strong>{new Date(lead.createdAt).toLocaleString('pt-BR')}</strong>
          </div>
        </div>

        <div className="conversation-panel">
          <div className="panel-header panel-header--tight">
            <div>
              <p className="eyebrow">Conversa</p>
              <h3>Linha do tempo</h3>
            </div>
          </div>

          {loading && <p>Carregando...</p>}
          {!loading && messages.length === 0 && (
            <p>Nenhuma mensagem encontrada</p>
          )}
          {!loading && messages.length > 0 && (
            <div className="conversation-list">
              {messages.map((msg) => (
                <article
                  className="message-bubble"
                  data-role={msg.role}
                  key={msg._id}
                >
                  <strong>{msg.role === 'user' ? 'Cliente' : 'Bot'}</strong>
                  <p>{msg.content}</p>
                  <small>{new Date(msg.timestamp).toLocaleString('pt-BR')}</small>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
