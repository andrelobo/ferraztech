import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { LoginPage } from './LoginPage'

vi.mock('../services/api', () => ({
  default: {
    post: vi.fn(),
  },
}))

import api from '../services/api'

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset()
    localStorage.clear()
  })

  it('should render the login form', () => {
    renderPage()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
  })

  it('should call POST /auth/login on submit', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { access_token: 'fake-token' } })
    renderPage()

    await userEvent.type(screen.getByLabelText('Email'), 'admin@ferraztech.com')
    await userEvent.type(screen.getByLabelText('Senha'), '123456')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'admin@ferraztech.com',
        password: '123456',
      })
    })
  })

  it('should store token in localStorage on success', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { access_token: 'fake-token' } })
    renderPage()

    await userEvent.type(screen.getByLabelText('Email'), 'admin@ferraztech.com')
    await userEvent.type(screen.getByLabelText('Senha'), '123456')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('fake-token')
    })
  })

  it('should show error message on failed login', async () => {
    vi.mocked(api.post).mockRejectedValue({
      response: { data: { message: 'Credenciais inválidas' } },
    })
    renderPage()

    await userEvent.type(screen.getByLabelText('Email'), 'admin@ferraztech.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/credenciais inválidas/i),
      ).toBeInTheDocument()
    })
  })

  it('should disable button while loading', async () => {
    vi.mocked(api.post).mockImplementation(
      () => new Promise(() => {}),
    )
    renderPage()

    await userEvent.type(screen.getByLabelText('Email'), 'admin@ferraztech.com')
    await userEvent.type(screen.getByLabelText('Senha'), '123456')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /entrando/i })).toBeDisabled()
    })
  })
})
