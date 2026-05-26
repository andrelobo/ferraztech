import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Client, LocalAuth, Message as WAMessage } from 'whatsapp-web.js'

@Injectable()
export class WhatsAppService implements OnModuleInit {
  private readonly logger = new Logger(WhatsAppService.name)
  private client: Client
  private isReady = false
  private qrCode: string | null = null
  private retryCount = 0
  private startTime = Date.now()

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.initialize()
  }

  private async initialize() {
    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: this.configService.get('WHATSAPP_SESSION_PATH', './sessions'),
      }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    })

    this.client.on('qr', (qr: string) => {
      this.qrCode = qr
      this.logger.log('QR code received')
    })

    this.client.on('ready', () => {
      this.isReady = true
      this.qrCode = null
      this.retryCount = 0
      this.logger.log('WhatsApp client ready')
    })

    this.client.on('disconnected', async (reason: string) => {
      this.isReady = false
      this.logger.warn(`WhatsApp disconnected: ${reason}`)
      await this.handleReconnect()
    })

    this.client.on('message', async (message: WAMessage) => {
      this.logger.debug(`Message from ${message.from}: ${message.body}`)
    })

    try {
      await this.client.initialize()
    } catch (error) {
      this.logger.error('Failed to initialize WhatsApp client', error)
    }
  }

  private async handleReconnect() {
    const maxRetries = this.configService.get('WHATSAPP_MAX_RETRIES', 5)
    const retryDelay = this.configService.get('WHATSAPP_RETRY_DELAY_MS', 5000)

    if (this.retryCount >= maxRetries) {
      this.logger.error('Max reconnect retries reached')
      return
    }

    this.retryCount++
    this.logger.log(
      `Reconnecting (attempt ${this.retryCount}/${maxRetries})...`,
    )

    await new Promise((resolve) => setTimeout(resolve, retryDelay))
    await this.initialize()
  }

  getStatus() {
    return {
      connected: this.isReady,
      qrCode: this.qrCode,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      retryCount: this.retryCount,
    }
  }

  async sendMessage(to: string, message: string) {
    if (!this.isReady) {
      return { queued: true, to, message }
    }

    try {
      const chatId = `${to}@c.us`
      await this.client.sendMessage(chatId, message)
      return { sent: true, to, message }
    } catch (error) {
      this.logger.error(`Failed to send message to ${to}`, error)
      return { sent: false, to, message, error: (error as Error).message }
    }
  }
}
