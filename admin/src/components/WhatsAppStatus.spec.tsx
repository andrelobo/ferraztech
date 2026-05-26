import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { WhatsAppStatus } from './WhatsAppStatus'

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}))

import api from '../services/api'

const mockMultiSessionStatus = {
  sessions: [
    { id: 'session-1', connected: true, qrCode: null, retryCount: 0, startTime: 1000 },
    { id: 'session-2', connected: false, qrCode: 'qr-data', retryCount: 0, startTime: 2000 },
  ],
  activeSession: 'session-1',
  uptime: 3600,
}

describe('WhatsAppStatus', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
  })

  it('should show loading initially', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))
    render(<WhatsAppStatus />)
    expect(screen.getByText(/carregando/i)).toBeInTheDocument()
  })

  it('should show connected status with active session', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: mockMultiSessionStatus,
    })
    render(<WhatsAppStatus />)
    await waitFor(() => {
      expect(screen.getByText(/conectado/i)).toBeInTheDocument()
      expect(screen.getByText(/session-1/i)).toBeInTheDocument()
    })
  })

  it('should show disconnected when all sessions are down', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        sessions: [
          { id: 'session-1', connected: false, qrCode: null, retryCount: 3, startTime: 1000 },
        ],
        activeSession: null,
        uptime: 3600,
      },
    })
    render(<WhatsAppStatus />)
    expect(await screen.findByText(/desconectado/i)).toBeInTheDocument()
  })
})
