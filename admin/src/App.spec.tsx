import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

vi.mock('./services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: {
        sessions: [
          { id: 'session-1', connected: true, qrCode: null, retryCount: 0, startTime: 1000 },
        ],
        activeSession: 'session-1',
        uptime: 100,
      },
    }),
  },
}))

describe('App', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'test-token')
  })

  it('should render the dashboard title', async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )
    expect(await screen.findByText('FerrazTech Admin')).toBeInTheDocument()
  })

  it('should render the WhatsApp status section', async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )
    expect(await screen.findByText('WhatsApp')).toBeInTheDocument()
  })
})
