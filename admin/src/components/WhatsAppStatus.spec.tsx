import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { WhatsAppStatus } from './WhatsAppStatus'

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}))

import api from '../services/api'

describe('WhatsAppStatus', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
  })

  it('should show loading initially', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))
    render(<WhatsAppStatus />)
    expect(screen.getByText(/carregando/i)).toBeInTheDocument()
  })

  it('should show connected status', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { connected: true, qrCode: null, uptime: 3600, retryCount: 0 },
    })
    render(<WhatsAppStatus />)
    expect(await screen.findByText(/conectado/i)).toBeInTheDocument()
  })

  it('should show disconnected status', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { connected: false, qrCode: null, uptime: 0, retryCount: 3 },
    })
    render(<WhatsAppStatus />)
    expect(await screen.findByText(/desconectado/i)).toBeInTheDocument()
  })
})
