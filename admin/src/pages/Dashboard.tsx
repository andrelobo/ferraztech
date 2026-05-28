import { FerrazTechLogo } from '../components/FerrazTechLogo'
import { WhatsAppStatus } from '../components/WhatsAppStatus'
import { SendMessage } from '../components/SendMessage'
import { LeadsPage } from './LeadsPage'

export function Dashboard() {
  return (
    <div className="app-shell">
      <header className="dashboard-hero">
        <div className="dashboard-hero__content">
          <FerrazTechLogo compact />
          <div>
          <p className="eyebrow">Operacao Ferraz Tech</p>
          <h1>FerrazTech Admin</h1>
          <p className="hero-copy">
            Acompanhe a linha do WhatsApp, organize os leads e acelere o
            atendimento sem perder contexto.
          </p>
          </div>
        </div>
      </header>

      <div className="dashboard-grid">
      <WhatsAppStatus />
      <SendMessage />
      <LeadsPage />
      </div>
    </div>
  )
}
