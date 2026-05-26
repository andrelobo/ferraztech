import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LeadDetailModal } from './LeadDetailModal'

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}))

import api from '../services/api'

const mockLead = {
  _id: '1',
  name: 'João Silva',
  phone: '5511999999999',
  email: 'joao@email.com',
  serviceType: 'consultoria',
  status: 'new',
  createdAt: '2026-05-26T10:00:00Z',
}

const mockMessages = [
  { _id: 'm1', role: 'user', content: 'Olá, gostaria de um orçamento', timestamp: '2026-05-26T10:00:00Z' },
  { _id: 'm2', role: 'bot', content: 'Claro! Vou te ajudar com isso.', timestamp: '2026-05-26T10:00:05Z' },
]

describe('LeadDetailModal', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
  })

  it('should render lead details when open', () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockMessages })
    render(
      <LeadDetailModal lead={mockLead} onClose={vi.fn()} />,
    )

    expect(screen.getByText('João Silva')).toBeInTheDocument()
    expect(screen.getByText('5511999999999')).toBeInTheDocument()
    expect(screen.getByText('joao@email.com')).toBeInTheDocument()
    expect(screen.getByText('consultoria')).toBeInTheDocument()
    expect(screen.getByText('Novo')).toBeInTheDocument()
  })

  it('should fetch and display messages', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockMessages })
    render(
      <LeadDetailModal lead={mockLead} onClose={vi.fn()} />,
    )

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/conversations/5511999999999/messages')
    })
    expect(await screen.findByText('Olá, gostaria de um orçamento')).toBeInTheDocument()
    expect(await screen.findByText('Claro! Vou te ajudar com isso.')).toBeInTheDocument()
  })

  it('should call onClose when close button is clicked', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] })
    const onClose = vi.fn()
    render(
      <LeadDetailModal lead={mockLead} onClose={onClose} />,
    )

    await userEvent.click(screen.getByRole('button', { name: /fechar/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('should show empty state when no messages', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] })
    render(
      <LeadDetailModal lead={mockLead} onClose={vi.fn()} />,
    )

    expect(await screen.findByText(/nenhuma mensagem/i)).toBeInTheDocument()
  })
})
