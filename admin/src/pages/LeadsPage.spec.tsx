import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LeadsPage } from './LeadsPage'

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}))

import api from '../services/api'

const mockLeads = [
  {
    _id: '1',
    name: 'João Silva',
    phone: '5511999999999',
    email: 'joao@email.com',
    serviceType: 'consultoria',
    status: 'new',
    createdAt: '2026-05-26T10:00:00Z',
  },
  {
    _id: '2',
    name: 'Maria Santos',
    phone: '5511888888888',
    serviceType: 'orcamento',
    status: 'contacted',
    createdAt: '2026-05-25T10:00:00Z',
  },
]

describe('LeadsPage', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockResolvedValue({ data: mockLeads })
  })

  it('should render the page title', async () => {
    render(<LeadsPage />)
    expect(await screen.findByText('Leads')).toBeInTheDocument()
  })

  it('should fetch and display leads', async () => {
    render(<LeadsPage />)
    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument()
      expect(screen.getByText('Maria Santos')).toBeInTheDocument()
    })
  })

  it('should show empty state when no leads', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] })
    render(<LeadsPage />)
    await waitFor(() => {
      expect(screen.getByText(/nenhum lead encontrado/i)).toBeInTheDocument()
    })
  })
})
