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
    <div>
      <div>
        <h2>{lead.name}</h2>
        <button onClick={onClose}>Fechar</button>
      </div>

      <div>
        <p><strong>Telefone:</strong> {lead.phone}</p>
        {lead.email && <p><strong>Email:</strong> {lead.email}</p>}
        <p><strong>Serviço:</strong> {lead.serviceType}</p>
        <p><strong>Status:</strong> {statusLabels[lead.status] || lead.status}</p>
        <p><strong>Data:</strong> {new Date(lead.createdAt).toLocaleString('pt-BR')}</p>
      </div>

      <div>
        <h3>Conversa</h3>
        {loading && <p>Carregando...</p>}
        {!loading && messages.length === 0 && (
          <p>Nenhuma mensagem encontrada</p>
        )}
        {!loading && messages.length > 0 && (
          <div>
            {messages.map((msg) => (
              <div key={msg._id}>
                <strong>{msg.role === 'user' ? 'Cliente' : 'Bot'}:</strong>
                <p>{msg.content}</p>
                <small>{new Date(msg.timestamp).toLocaleString('pt-BR')}</small>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
