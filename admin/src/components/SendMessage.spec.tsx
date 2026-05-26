import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SendMessage } from './SendMessage'

vi.mock('../services/api', () => ({
  default: {
    post: vi.fn(),
  },
}))

import api from '../services/api'

describe('SendMessage', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset()
  })

  it('should render the form with phone and message inputs', () => {
    render(<SendMessage />)
    expect(screen.getByLabelText('Telefone')).toBeInTheDocument()
    expect(screen.getByLabelText('Mensagem')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /enviar/i })).toBeInTheDocument()
  })

  it('should call POST /whatsapp/send-message on submit', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { sent: true } })
    render(<SendMessage />)

    await userEvent.type(screen.getByLabelText('Telefone'), '5511999999999')
    await userEvent.type(screen.getByLabelText('Mensagem'), 'Olá, tudo bem?')
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/whatsapp/send-message', {
        to: '5511999999999',
        message: 'Olá, tudo bem?',
      })
    })
  })

  it('should show success feedback after sending', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { sent: true } })
    render(<SendMessage />)

    await userEvent.type(screen.getByLabelText('Telefone'), '5511999999999')
    await userEvent.type(screen.getByLabelText('Mensagem'), 'Teste')
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }))

    expect(await screen.findByText(/mensagem enviada/i)).toBeInTheDocument()
  })

  it('should show error feedback on failure', async () => {
    vi.mocked(api.post).mockRejectedValue({
      response: { data: { message: 'Erro ao enviar' } },
    })
    render(<SendMessage />)

    await userEvent.type(screen.getByLabelText('Telefone'), '5511999999999')
    await userEvent.type(screen.getByLabelText('Mensagem'), 'Teste')
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }))

    expect(await screen.findByText(/erro ao enviar/i)).toBeInTheDocument()
  })
})
