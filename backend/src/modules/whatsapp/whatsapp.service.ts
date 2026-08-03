import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GatewayClientService, GatewayQrResult } from './gateway-client.service'
import { BotService } from '../bot/bot.service'
import { ConversationsService } from '../conversations/conversations.service'
import { LeadsService } from '../leads/leads.service'

export interface SessionStatus {
  id: string
  connected: boolean
  qrCode: string | null
  retryCount: number
  startTime: number
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name)
  private readonly startTime = Date.now()

  constructor(
    private readonly configService: ConfigService,
    private readonly gatewayClient: GatewayClientService,
    private readonly botService: BotService,
    private readonly conversationsService: ConversationsService,
    private readonly leadsService: LeadsService,
  ) {}

  getSessionId(): string {
    const sessionId = this.configService.get<string>('GATEWAY_SESSION_ID', '')
    if (!sessionId) {
      throw new ServiceUnavailableException(
        'GATEWAY_SESSION_ID não configurado no backend WATA',
      )
    }
    return sessionId
  }

  private getTenantId(): string {
    const tenantId = this.configService.get<string>('GATEWAY_TENANT_ID', '')
    if (!tenantId) {
      throw new ServiceUnavailableException(
        'GATEWAY_TENANT_ID não configurado no backend WATA',
      )
    }
    return tenantId
  }

  async getStatus() {
    const gatewaySessions = await this.gatewayClient.listTenantSessions(
      this.getTenantId(),
    )

    const sessions: SessionStatus[] = gatewaySessions.map((session) => ({
      id: String(session._id),
      connected: session.state === 'open',
      qrCode: session.qr ?? null,
      retryCount: 0,
      startTime: 0,
    }))

    const activeSession = sessions.find((session) => session.connected)?.id ?? null

    return {
      sessions,
      activeSession,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    }
  }

  async getQr(sessionId?: string): Promise<GatewayQrResult> {
    return this.gatewayClient.getQr(sessionId ?? this.getSessionId())
  }

  async sendMessage(to: string, message: string) {
    try {
      await this.gatewayClient.sendText(this.getSessionId(), to, message)
      this.logger.log(`📤 Mensagem enfileirada para ${to}`)
      return { sent: true, to, message, sessionId: this.getSessionId() }
    } catch (err) {
      throw this.mapSendFailure(to, err)
    }
  }

  private mapSendFailure(to: string, error: unknown) {
    if (error instanceof Error && error.message.includes('Gateway não configurado')) {
      return new ServiceUnavailableException(error.message)
    }

    return new BadRequestException(
      `Falha ao enviar mensagem para ${to}. Verifique o numero e a sessao do WhatsApp.`,
    )
  }

  async handleIncomingMessage(from: string, body: string) {
    this.logger.log(`📨 Mensagem recebida de ${from}: len=${body.length}`)
    let conversation = await this.conversationsService.findByPhone(from)
    const isNewContact = !conversation

    if (isNewContact) {
      this.logger.log(`🆕 Novo contato detectado: ${from}`)
      const lead = await this.leadsService.create({
        name: from,
        phone: from,
        serviceType: 'indefinido',
      })
      conversation = await this.conversationsService.create(from, (lead as any)._id.toString())
      this.logger.log(`🧲 Lead e conversa criados para ${from}`)
    }

    await this.conversationsService.addMessage(
      (conversation as any)._id.toString(),
      'user',
      body,
    )

    const reply = await this.botService.processMessage({
      from,
      body,
      name: from,
    }, {
      isNewContact,
    })
    this.logger.log(`🤖 Resposta gerada para ${from}${reply.action ? ` action=${reply.action}` : ''}`)

    const sendResult = await this.sendMessage(from, reply.reply)

    if (sendResult.sent) {
      await this.conversationsService.addMessage(
        (conversation as any)._id.toString(),
        'bot',
        reply.reply,
      )
      this.logger.log(`📝 Resposta do bot persistida para ${from}`)
    }

    if (reply.action && reply.action !== 'indefinido') {
      const lead = await this.leadsService.findByPhone(from)
      if (lead) {
        await this.leadsService.updateServiceType((lead as any)._id.toString(), reply.action)
        this.logger.log(`🏷️ Serviço do lead ${from} atualizado para ${reply.action}`)
      }
    }
  }
}
