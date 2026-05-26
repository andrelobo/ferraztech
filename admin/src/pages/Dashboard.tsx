import { WhatsAppStatus } from '../components/WhatsAppStatus'
import { SendMessage } from '../components/SendMessage'
import { LeadsPage } from './LeadsPage'

export function Dashboard() {
  return (
    <div>
      <h1>FerrazTech Admin</h1>
      <WhatsAppStatus />
      <SendMessage />
      <LeadsPage />
    </div>
  )
}
