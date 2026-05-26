import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

vi.mock('./services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: { connected: true, qrCode: null, uptime: 100, retryCount: 0 },
    }),
  },
}))

describe('App', () => {
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
