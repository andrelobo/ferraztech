import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { FerrazTechLogo } from '../components/FerrazTechLogo'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await api.post('/auth/login', { email, password })
      localStorage.setItem('token', res.data.access_token)
      navigate('/')
    } catch (err: any) {
      const message =
        err?.response?.data?.message || 'Erro ao fazer login'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell">
      <section className="auth-panel">
        <FerrazTechLogo />
        <div className="auth-copy">
          <p className="eyebrow">Acesso Seguro</p>
          <h1>FerrazTech Admin</h1>
          <p className="hero-copy">
            Entre para acompanhar o WhatsApp, responder clientes e monitorar a
            operacao em tempo real.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          </div>
          <div className="field">
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          </div>
          {error && (
            <p className="form-feedback" data-feedback="error">
              {error}
            </p>
          )}
          <button className="button-primary auth-submit" type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </section>
    </div>
  )
}
