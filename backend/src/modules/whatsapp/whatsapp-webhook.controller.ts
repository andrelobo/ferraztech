import {
  Controller,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { ConfigService } from '@nestjs/config'
import { createHmac, timingSafeEqual } from 'crypto'
import type { Request } from 'express'
import { WhatsAppService } from './whatsapp.service'

interface GatewayWebhookEvent {
  id?: string
  type: 'message.upsert' | 'qr.updated' | 'connection.update'
  sessionId?: string
  payload: Record<string, unknown>
  timestamp?: string
}

@SkipThrottle()
@Controller('webhooks/gateway')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name)
  private readonly secret: string

  constructor(
    private readonly configService: ConfigService,
    private readonly whatsappService: WhatsAppService,
  ) {
    this.secret = configService.get<string>('GATEWAY_WEBHOOK_SECRET', '')
  }

  @Post()
  handle(@Req() req: Request): { received: boolean } {
    const signature = req.headers['x-muirakitan-signature']

    if (!this.secret || typeof signature !== 'string') {
      throw new UnauthorizedException('Webhook sem assinatura válida')
    }

    const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody

    if (!rawBody || !this.verifySignature(signature, rawBody)) {
      throw new UnauthorizedException('Assinatura inválida')
    }

    const event = req.body as GatewayWebhookEvent
    this.dispatch(event)
    return { received: true }
  }

  private dispatch(event: GatewayWebhookEvent) {
    if (event.type === 'message.upsert') {
      this.handleIncoming(event)
      return
    }

    this.logger.log(`📡 Evento do gateway recebido: ${event.type} (${event.sessionId ?? '?'})`)
  }

  private handleIncoming(event: GatewayWebhookEvent) {
    const { from, body } = event.payload as {
      from?: string
      body?: string
    }
    const phone = this.normalizeFrom(from)

    if (!phone) {
      this.logger.warn('📭 Mensagem ignorada (remetente não suportado)')
      return
    }

    if (!body || !String(body).trim()) {
      this.logger.warn(`📭 Mensagem sem texto ignorada de ${phone}`)
      return
    }

    this.whatsappService
      .handleIncomingMessage(phone, String(body))
      .catch((err) =>
        this.logger.error(`Erro ao processar mensagem de ${phone}`, err),
      )
  }

  private normalizeFrom(from?: string): string | null {
    if (!from) {
      return null
    }

    if (from.endsWith('@g.us')) {
      return null
    }

    if (from.endsWith('@c.us') || from.endsWith('@s.whatsapp.net')) {
      return from.replace(/@(c\.us|s\.whatsapp\.net)$/, '').replace(/\D/g, '')
    }

    return from.replace(/\D/g, '') || null
  }

  private verifySignature(signature: string, rawBody: Buffer): boolean {
    const expected = createHmac('sha256', this.secret).update(rawBody).digest('hex')
    const received = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expected)

    if (received.length !== expectedBuffer.length) {
      return false
    }

    return timingSafeEqual(received, expectedBuffer)
  }
}
