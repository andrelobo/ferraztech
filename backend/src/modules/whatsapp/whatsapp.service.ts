import { BadRequestException, Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { WhatsAppSession } from './whatsapp.session'
import { BotService } from '../bot/bot.service'
import { ConversationsService } from '../conversations/conversations.service'
import { LeadsService } from '../leads/leads.service'

@Injectable()
export class WhatsAppService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppService.name)
  private sessions: WhatsAppSession[] = []
  private startTime = Date.now()

  constructor(
    private configService: ConfigService,
    @InjectQueue('whatsapp') private whatsappQueue: Queue,
    private botService: BotService,
    private conversationsService: ConversationsService,
    private leadsService: LeadsService,
  ) {}

  async onModuleInit() {
    const count = this.configService.get('WHATSAPP_SESSION_COUNT', 1)
    this.logger.log(`🚀 Inicializando motor do WhatsApp com ${count} sessão(ões)`)

    for (let i = 1; i <= count; i++) {
      const session = new WhatsAppSession(
        `session-${i}`,
        this.configService,
        (from, body) => this.handleIncomingMessage(from, body).catch((err) =>
          this.logger.error(`Error handling message from ${from}`, err),
        ),
      )
      this.sessions.push(session)
      this.logger.log(`🧩 Subindo ${session.id}`)
      await session.start()
    }
  }

  async onModuleDestroy() {
    this.logger.log('🛑 Encerrando sessões do WhatsApp...')
    await Promise.all(this.sessions.map((s) => s.stop()))
    this.sessions = []
  }

  getStatus() {
    const states = this.sessions.map((s) => s.state)
    const activeSession = states.find((s) => s.connected)?.id || null
    return {
      sessions: states,
      activeSession,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    }
  }

  async sendMessage(to: string, message: string) {
    const connectedSessions = this.sessions.filter((session) => session.state.connected)
    let lastError: unknown = null

    for (const session of connectedSessions) {
      try {
        await session.sendMessage(to, message)
        this.logger.log(`📤 Mensagem enviada para ${to} via ${session.id}`)
        return { sent: true, to, message, sessionId: session.id }
      } catch (err) {
        lastError = err
        this.logger.warn(
          `⚠️ [${session.id}] Falha ao enviar mensagem para ${to}: ${err instanceof Error ? err.message : err}`,
        )
      }
    }

    if (connectedSessions.length === 0) {
      this.logger.warn(`📬 Nenhuma sessão conectada. Mensagem para ${to} foi para a fila`)
      await this.whatsappQueue.add('send', { to, message })
      return { queued: true, to, message }
    }

    throw this.mapSendFailure(to, lastError)
  }

  private mapSendFailure(to: string, error: unknown) {
    if (error instanceof Error) {
      if (
        error.message.includes('WhatsApp number not found') ||
        error.message.includes('No LID for user')
      ) {
        return new BadRequestException(
          `Nao foi possivel localizar o numero ${to} no WhatsApp para envio.`,
        )
      }
    }

    return new BadRequestException(
      `Falha ao enviar mensagem para ${to}. Verifique o numero e a sessao do WhatsApp.`,
    )
  }

  private async handleIncomingMessage(from: string, body: string) {
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
