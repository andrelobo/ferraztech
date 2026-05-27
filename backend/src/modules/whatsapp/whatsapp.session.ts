import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Client, LocalAuth } from 'whatsapp-web.js'
import { execSync } from 'child_process'
import { existsSync, rmSync } from 'fs'
import * as path from 'path'

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
  private reauthDelay: number
  private authTimeoutMs: number
  private qrMaxRetries: number
  private takeoverOnConflict: boolean
  private takeoverTimeoutMs: number
  private isStopping = false
  private reconnectPromise: Promise<void> | null = null
  private onIncomingMessage: (from: string, body: string) => void

  constructor(
    public readonly id: string,
    configService: ConfigService,
    onIncomingMessage: (from: string, body: string) => void,
  ) {
    this._startTime = Date.now()
    this.maxRetries = configService.get('WHATSAPP_MAX_RETRIES', 5)
    this.retryDelay = configService.get('WHATSAPP_RETRY_DELAY_MS', 5000)
    this.reauthDelay = configService.get('WHATSAPP_REAUTH_DELAY_MS', 30000)
    this.authTimeoutMs = configService.get('WHATSAPP_AUTH_TIMEOUT_MS', 60000)
    this.qrMaxRetries = configService.get('WHATSAPP_QR_MAX_RETRIES', 0)
    this.takeoverOnConflict = this.parseBoolean(
      configService.get('WHATSAPP_TAKEOVER_ON_CONFLICT', true),
      true,
    )
    this.takeoverTimeoutMs = configService.get('WHATSAPP_TAKEOVER_TIMEOUT_MS', 5000)
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
    this.isStopping = false
    this._startTime = Date.now()
    this.logger.log(`🚀 [${this.id}] Iniciando sessão do WhatsApp`)
    await this.initialize()
  }

  async stop() {
    this.isStopping = true
    this.reconnectPromise = null
    if (this.client) {
      try {
        await this.client.destroy()
        this.logger.log(`🛑 [${this.id}] Cliente encerrado`)
      } catch {}
      this.client = null
    }
    const { sessionDir, browserProfileDir } = this.resolveSessionPaths()
    this.cleanupBrowserProfile(sessionDir, browserProfileDir)
  }

  async sendMessage(to: string, message: string) {
    if (!this.client || !this._connected) {
      throw new Error('Session not connected')
    }
    const normalizedRecipient = this.normalizeRecipient(to)
    const numberId = await this.client.getNumberId(normalizedRecipient)

    if (!numberId?._serialized) {
      throw new Error(`WhatsApp number not found: ${normalizedRecipient}`)
    }

    this.logger.log(`📤 [${this.id}] Enviando mensagem para ${to} len=${message.length}`)
    await this.client.sendMessage(numberId._serialized, message)
  }

  private normalizeRecipient(to: string) {
    const trimmed = to.trim()

    if (trimmed.endsWith('@s.whatsapp.net')) {
      return trimmed.replace('@s.whatsapp.net', '@c.us')
    }

    if (trimmed.endsWith('@c.us')) {
      return trimmed
    }

    return trimmed.replace(/\D/g, '')
  }

  private cleanupBrowserProfile(sessionDir: string, browserProfileDir: string) {
    const processTargets = [
      sessionDir,
      browserProfileDir,
      path.join(browserProfileDir, 'SingletonLock'),
      path.join(browserProfileDir, 'SingletonCookie'),
      path.join(browserProfileDir, 'SingletonSocket'),
      path.join(browserProfileDir, 'Default', 'LOCK'),
      path.join(browserProfileDir, 'DevToolsActivePort'),
    ]

    for (const target of processTargets) {
      this.killProcessesUsingPath(target)
    }

    const staleTargets = [
      path.join(browserProfileDir, 'SingletonLock'),
      path.join(browserProfileDir, 'SingletonCookie'),
      path.join(browserProfileDir, 'SingletonSocket'),
      path.join(browserProfileDir, 'Default', 'LOCK'),
      path.join(browserProfileDir, 'DevToolsActivePort'),
    ]

    for (const target of staleTargets) {
      this.removeStalePath(target)
    }
  }

  private killProcessesUsingPath(targetPath: string) {
    try {
      execSync(`fuser -k "${targetPath}" 2>/dev/null`, { stdio: 'ignore' })
      this.logger.log(`🧹 [${this.id}] Encerrado processo preso em ${targetPath}`)
    } catch {}
  }

  private removeStalePath(targetPath: string) {
    try {
      if (!existsSync(targetPath)) {
        return
      }

      rmSync(targetPath, { recursive: true, force: true })
      this.logger.log(`🪶 [${this.id}] Removido lock residual em ${targetPath}`)
    } catch (error) {
      this.logger.warn(
        `⚠️ [${this.id}] Não foi possível remover ${targetPath}: ${error instanceof Error ? error.message : error}`,
      )
    }
  }

  private resolveSessionPaths() {
    const sessionPath = process.env.WHATSAPP_SESSION_PATH || './sessions'
    const sessionDir = path.resolve(`${sessionPath}/${this.id}`)
    const browserProfileDir = path.join(sessionDir, 'session')

    return {
      sessionDir,
      browserProfileDir,
    }
  }

  private async initialize(retriedAfterBrowserConflict = false) {
    const { sessionDir, browserProfileDir } = this.resolveSessionPaths()
    this.logger.log(`🧭 [${this.id}] Sessão em ${sessionDir}`)
    this.logger.log(`🗂️ [${this.id}] Perfil Chromium em ${browserProfileDir}`)

    this.cleanupBrowserProfile(sessionDir, browserProfileDir)

    const chromePath = (() => {
      try {
        return require('puppeteer').executablePath()
      } catch {
        return process.env.CHROME_PATH || undefined
      }
    })()

    this.logger.log(
      `🖥️ [${this.id}] Chromium ${chromePath ? `resolvido em ${chromePath}` : 'usando resolução padrão'}`,
    )

    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: sessionDir,
      }),
      authTimeoutMs: this.authTimeoutMs,
      qrMaxRetries: this.qrMaxRetries,
      takeoverOnConflict: this.takeoverOnConflict,
      takeoverTimeoutMs: this.takeoverTimeoutMs,
      webVersionCache: {
        type: 'local',
      },
      puppeteer: {
        headless: true,
        executablePath: chromePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--disable-extensions',
          '--disable-background-networking',
          '--disable-sync',
          '--no-default-browser-check',
          '--mute-audio',
        ],
      },
    })

    this.client.on('qr', (qr: string) => {
      this._qrCode = qr
      this.logger.log(`📲 [${this.id}] QR code recebido`)
    })

    this.client.on('loading_screen', (percent: string, message: string) => {
      this.logger.log(`⏳ [${this.id}] Loading ${percent}% - ${message}`)
    })

    this.client.on('authenticated', () => {
      this.logger.log(`🔐 [${this.id}] Sessão autenticada`)
    })

    this.client.on('auth_failure', (message: string) => {
      this._connected = false
      this.logger.error(`🚫 [${this.id}] Falha de autenticação: ${message}`)
    })

    this.client.on('change_state', (state: string) => {
      this.logger.log(`🔄 [${this.id}] Estado alterado para ${state}`)
    })

    this.client.on('ready', () => {
      this._connected = true
      this._qrCode = null
      this._retryCount = 0
      this.logger.log(`🟢 [${this.id}] Cliente WhatsApp pronto`)

      const connectedLine = this.extractConnectedLine()
      if (connectedLine) {
        this.logger.log(`📱 [${this.id}] Linha conectada: ${connectedLine}`)
      }
    })

    this.client.on('disconnected', async (reason: string) => {
      this._connected = false
      this.logger.warn(`🔌 [${this.id}] Desconectado: ${reason}`)

      if (this.isStopping) {
        this.logger.log(`🧯 [${this.id}] Shutdown em andamento. Reconexao automatica ignorada`)
        return
      }

      await this.handleReconnect(reason)
    })

    this.client.on('message', async (msg) => {
      if (msg.from === 'status@broadcast') {
        this.logger.log(`📰 [${this.id}] Evento de status do WhatsApp ignorado`)
        return
      }

      const from = await this.resolveIncomingPhone(msg.from)

      if (!from) {
        this.logger.warn(`🫥 [${this.id}] Mensagem ignorada de remetente não suportado: ${msg.from}`)
        return
      }

      this.logger.log(
        `📨 [${this.id}] Mensagem recebida de ${from} raw=${msg.from} type=${msg.type || 'unknown'}`,
      )
      this.onIncomingMessage(from, msg.body)
    })

    try {
      this.logger.log(`🟡 [${this.id}] Inicializando cliente WhatsApp`)
      await this.client.initialize()
    } catch (error) {
      if (!retriedAfterBrowserConflict && this.isBrowserAlreadyRunningError(error)) {
        this.logger.warn(`🛠️ [${this.id}] Conflito de perfil Chromium detectado. Limpando e tentando novamente`)
        this.cleanupBrowserProfile(sessionDir, browserProfileDir)
        if (this.client) {
          try {
            await this.client.destroy()
          } catch {}
        }
        this.client = null
        await new Promise((resolve) => setTimeout(resolve, 250))
        await this.initialize(true)
        return
      }

      this.logger.error(
        `💥 [${this.id}] Falha ao inicializar cliente WhatsApp`,
        error instanceof Error ? error.stack : undefined,
      )
    }
  }

  private isBrowserAlreadyRunningError(error: unknown) {
    return (
      error instanceof Error &&
      error.message.includes('The browser is already running for')
    )
  }

  private isAuthLossReason(reason: string) {
    return ['LOGOUT', 'UNPAIRED', 'UNPAIRED_IDLE'].includes(reason)
  }

  private parseBoolean(value: unknown, fallback: boolean) {
    if (typeof value === 'boolean') {
      return value
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()

      if (['1', 'true', 'yes', 'on'].includes(normalized)) {
        return true
      }

      if (['0', 'false', 'no', 'off'].includes(normalized)) {
        return false
      }
    }

    return fallback
  }

  private extractConnectedLine() {
    const wid = this.client?.info?.wid?._serialized

    if (!wid) {
      return null
    }

    return wid.replace(/@(c\.us|s\.whatsapp\.net)$/, '').replace(/\D/g, '') || null
  }

  private async resolveIncomingPhone(rawFrom: string) {
    if (rawFrom.endsWith('@g.us')) {
      return null
    }

    if (rawFrom.endsWith('@c.us') || rawFrom.endsWith('@s.whatsapp.net')) {
      return rawFrom.replace(/@(c\.us|s\.whatsapp\.net)$/, '').replace(/\D/g, '')
    }

    if (rawFrom.endsWith('@lid')) {
      try {
        const contacts = await this.client?.getContactLidAndPhone?.([rawFrom])
        const phoneId = contacts?.[0]?.pn

        if (phoneId) {
          return phoneId.replace(/@(c\.us|s\.whatsapp\.net)$/, '').replace(/\D/g, '')
        }
      } catch (error) {
        this.logger.warn(
          `⚠️ [${this.id}] Falha ao resolver LID ${rawFrom}: ${error instanceof Error ? error.message : error}`,
        )
      }

      const fallbackDigits = rawFrom.replace('@lid', '').replace(/\D/g, '')
      return fallbackDigits || null
    }

    return null
  }

  private async handleReconnect(reason = 'unknown') {
    if (this.reconnectPromise) {
      this.logger.log(`🪢 [${this.id}] Reconexao ja em andamento. Reaproveitando tentativa atual`)
      return this.reconnectPromise
    }

    this.reconnectPromise = this.runReconnect(reason).finally(() => {
      this.reconnectPromise = null
    })

    return this.reconnectPromise
  }

  private async runReconnect(reason: string) {
    if (this._retryCount >= this.maxRetries) {
      this.logger.error(`🧱 [${this.id}] Limite máximo de reconexões atingido`)
      return
    }

    const delay = this.isAuthLossReason(reason) ? this.reauthDelay : this.retryDelay

    this._retryCount++
    this.logger.log(
      `♻️ [${this.id}] Reconectando (${this._retryCount}/${this.maxRetries}) em ${delay}ms`,
    )
    await new Promise((r) => setTimeout(r, delay))

    if (this.isStopping) {
      this.logger.log(`🧯 [${this.id}] Shutdown detectado antes da reconexao. Tentativa cancelada`)
      return
    }

    await this.initialize()
  }
}
