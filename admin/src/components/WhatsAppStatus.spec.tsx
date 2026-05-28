import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { WhatsAppStatus } from './WhatsAppStatus'

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}))

import api from '../services/api'

const createObjectURLMock = vi.fn(() => 'blob:qr-session-2')
const revokeObjectURLMock = vi.fn()

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
    createObjectURLMock.mockClear()
    revokeObjectURLMock.mockClear()
    vi.stubGlobal('URL', {
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock,
    })
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

  it('should request qr image from backend for disconnected sessions with qr data', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        data: mockMultiSessionStatus,
      })
      .mockResolvedValueOnce({
        data: new Blob(['fake-image'], { type: 'image/png' }),
      })

    render(<WhatsAppStatus />)

    const qrImage = await screen.findByAltText(/qr code da sessão session-2/i)
    expect(qrImage).toHaveAttribute('src', 'blob:qr-session-2')
    expect(api.get).toHaveBeenNthCalledWith(2, '/whatsapp/qr', {
      params: { session: 'session-2' },
      responseType: 'blob',
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

  it('should show qr loading fallback while image is not ready', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        data: {
          sessions: [
            { id: 'session-2', connected: false, qrCode: 'qr-data', retryCount: 1, startTime: 2000 },
          ],
          activeSession: null,
          uptime: 3600,
        },
      })
      .mockReturnValueOnce(new Promise(() => {}))

    render(<WhatsAppStatus />)

    expect(await screen.findByText(/carregando qr code/i)).toBeInTheDocument()
  })
})
