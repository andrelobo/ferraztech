import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { WhatsAppSession } from './whatsapp.session'
import { BotService } from '../bot/bot.service'
import { ConversationsService } from '../conversations/conversations.service'
import { LeadsService } from '../leads/leads.service'

@Injectable()
export class WhatsAppService implements OnModuleInit {
  private readonly logger = new Logger(WhatsAppService.name)
  private sessions: WhatsAppSession[] = []
  private startTime = Date.now()

  constructor(
    private configService: ConfigService,
    private botService: BotService,
    private conversationsService: ConversationsService,
    private leadsService: LeadsService,
  ) {}

  async onModuleInit() {
    const count = this.configService.get('WHATSAPP_SESSION_COUNT', 2)

    for (let i = 1; i <= count; i++) {
      const session = new WhatsAppSession(
        `session-${i}`,
        this.configService,
        (from, body) => this.handleIncomingMessage(from, body).catch((err) =>
          this.logger.error(`Error handling message from ${from}`, err),
        ),
      )
      this.sessions.push(session)
      await session.start()
    }
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
    for (const session of this.sessions) {
      if (session.state.connected) {
        try {
          await session.sendMessage(to, message)
          return { sent: true, to, message, sessionId: session.id }
        } catch (err) {
          this.logger.warn(
            `[${session.id}] Failed to send message, trying next session...`,
          )
        }
      }
    }
    return { queued: true, to, message }
  }

  private async handleIncomingMessage(from: string, body: string) {
    let conversation = await this.conversationsService.findByPhone(from)

    if (!conversation) {
      const lead = await this.leadsService.create({
        name: from,
        phone: from,
        serviceType: 'indefinido',
      })
      conversation = await this.conversationsService.create(from, (lead as any)._id.toString())
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
    })

    const sendResult = await this.sendMessage(from, reply.reply)

    if (sendResult.sent) {
      await this.conversationsService.addMessage(
        (conversation as any)._id.toString(),
        'bot',
        reply.reply,
      )
    }

    if (reply.action && reply.action !== 'indefinido') {
      const lead = await this.leadsService.findByPhone(from)
      if (lead) {
        await this.leadsService.updateServiceType((lead as any)._id.toString(), reply.action)
      }
    }
  }
}
