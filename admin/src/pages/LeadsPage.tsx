import { useEffect, useState, useCallback } from 'react'
import api from '../services/api'
import { LeadDetailModal } from '../components/LeadDetailModal'

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
  const [statusFilter, setStatusFilter] = useState('')
  const [serviceFilter, setServiceFilter] = useState('')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  const fetchLeads = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter) params.append('status', statusFilter)
    if (serviceFilter) params.append('serviceType', serviceFilter)
    const query = params.toString()
    api
      .get(`/leads${query ? `?${query}` : ''}`)
      .then((res) => setLeads(res.data))
      .finally(() => setLoading(false))
  }, [statusFilter, serviceFilter])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  async function handleStatusChange(leadId: string, newStatus: string) {
    await api.patch(`/leads/${leadId}/status`, { status: newStatus })
    fetchLeads()
  }

  return (
    <div>
      <h1>Leads</h1>

      <div>
        <label htmlFor="statusFilter">Status</label>
        <select
          id="statusFilter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Todos</option>
          <option value="new">Novo</option>
          <option value="contacted">Contactado</option>
          <option value="qualified">Qualificado</option>
          <option value="converted">Convertido</option>
          <option value="lost">Perdido</option>
        </select>

        <label htmlFor="serviceFilter">Serviço</label>
        <select
          id="serviceFilter"
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
        >
          <option value="">Todos</option>
          <option value="consultoria">Consultoria</option>
          <option value="orcamento">Orçamento</option>
          <option value="suporte">Suporte</option>
        </select>
      </div>

      {loading && <div>Carregando...</div>}

      {!loading && leads.length === 0 && (
        <div>
          <p>Nenhum lead encontrado</p>
        </div>
      )}

      {!loading && leads.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Telefone</th>
              <th>Serviço</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead._id}>
                <td>{lead.name}</td>
                <td>{lead.phone}</td>
                <td>{lead.serviceType}</td>
                <td>
                  <select
                    value={lead.status}
                    onChange={(e) =>
                      handleStatusChange(lead._id, e.target.value)
                    }
                  >
                    <option value="new">Novo</option>
                    <option value="contacted">Contactado</option>
                    <option value="qualified">Qualificado</option>
                    <option value="converted">Convertido</option>
                    <option value="lost">Perdido</option>
                  </select>
                </td>
                <td>
                  <button onClick={() => setSelectedLead(lead)}>
                    Detalhes
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  )
}
