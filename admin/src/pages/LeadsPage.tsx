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
    <section className="panel leads-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Pipeline</p>
          <h2>Leads</h2>
          <p className="section-copy">
            Filtre a fila de atendimento e abra o historico completo da
            conversa antes de responder.
          </p>
        </div>
        <div className="stat-badge">
          {loading ? 'Atualizando...' : `${leads.length} lead${leads.length === 1 ? '' : 's'}`}
        </div>
      </div>

      <div className="filters-row">
        <div className="field field--compact">
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
        </div>

        <div className="field field--compact">
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
      </div>

      {loading && <div>Carregando...</div>}

      {!loading && leads.length === 0 && (
        <div className="empty-state">
          <p>Nenhum lead encontrado</p>
        </div>
      )}

      {!loading && leads.length > 0 && (
        <div className="table-card">
          <table className="data-table">
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
                    <button
                      className="button-secondary button-compact"
                      onClick={() => setSelectedLead(lead)}
                    >
                      Detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </section>
  )
}
