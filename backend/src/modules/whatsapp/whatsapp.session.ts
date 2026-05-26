import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Client, LocalAuth } from 'whatsapp-web.js'

export interface SessionState {
  id: string
  connected: boolean
  qrCode: string | null
  retryCount: number
  startTime: number
}

export class WhatsAppSession {
  private readonly logger = new Logger(WhatsAppSession.name)
  private client: Client | null = null
  private _connected = false
  private _qrCode: string | null = null
  private _retryCount = 0
  private _startTime: number
  private maxRetries: number
  private retryDelay: number
  private onIncomingMessage: (from: string, body: string) => void

  constructor(
    public readonly id: string,
    configService: ConfigService,
    onIncomingMessage: (from: string, body: string) => void,
  ) {
    this._startTime = Date.now()
    this.maxRetries = configService.get('WHATSAPP_MAX_RETRIES', 5)
    this.retryDelay = configService.get('WHATSAPP_RETRY_DELAY_MS', 5000)
    this.onIncomingMessage = onIncomingMessage
  }

  get state(): SessionState {
    return {
      id: this.id,
      connected: this._connected,
      qrCode: this._qrCode,
      retryCount: this._retryCount,
      startTime: this._startTime,
    }
  }

  async start() {
    this._startTime = Date.now()
    await this.initialize()
  }

  async stop() {
    if (this.client) {
      try {
        await this.client.destroy()
      } catch {}
      this.client = null
    }
  }

  async sendMessage(to: string, message: string) {
    if (!this.client || !this._connected) {
      throw new Error('Session not connected')
    }
    const chatId = `${to}@c.us`
    await this.client.sendMessage(chatId, message)
  }

  private async initialize() {
    const sessionPath = process.env.WHATSAPP_SESSION_PATH || './sessions'

    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: `${sessionPath}/${this.id}`,
      }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    })

    this.client.on('qr', (qr: string) => {
      this._qrCode = qr
      this.logger.log(`[${this.id}] QR code received`)
    })

    this.client.on('ready', () => {
      this._connected = true
      this._qrCode = null
      this._retryCount = 0
      this.logger.log(`[${this.id}] WhatsApp client ready`)
    })

    this.client.on('disconnected', async (reason: string) => {
      this._connected = false
      this.logger.warn(`[${this.id}] Disconnected: ${reason}`)
      await this.handleReconnect()
    })

    this.client.on('message', (msg) => {
      const from = msg.from.replace('@c.us', '').replace('@s.whatsapp.net', '')
      this.onIncomingMessage(from, msg.body)
    })

    try {
      await this.client.initialize()
    } catch (error) {
      this.logger.error(`[${this.id}] Failed to initialize`, error)
    }
  }

  private async handleReconnect() {
    if (this._retryCount >= this.maxRetries) {
      this.logger.error(`[${this.id}] Max reconnect retries reached`)
      return
    }
    this._retryCount++
    this.logger.log(
      `[${this.id}] Reconnecting (attempt ${this._retryCount}/${this.maxRetries})...`,
    )
    await new Promise((r) => setTimeout(r, this.retryDelay))
    await this.initialize()
  }
}
