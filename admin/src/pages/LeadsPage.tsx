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

export function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/leads')
      .then((res) => setLeads(res.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div>Carregando...</div>

  if (leads.length === 0) {
    return (
      <div>
        <h1>Leads</h1>
        <p>Nenhum lead encontrado</p>
      </div>
    )
  }

  return (
    <div>
      <h1>Leads</h1>
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Telefone</th>
            <th>Serviço</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead._id}>
              <td>{lead.name}</td>
              <td>{lead.phone}</td>
              <td>{lead.serviceType}</td>
              <td>{lead.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
