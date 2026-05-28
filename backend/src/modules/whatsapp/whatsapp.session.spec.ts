import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { execSync } from 'child_process'
import { WhatsAppSession } from './whatsapp.session'
import { Client } from 'whatsapp-web.js'

const mockClient = {
  on: jest.fn(),
  initialize: jest.fn(),
  getNumberId: jest.fn(),
  getContactLidAndPhone: jest.fn(),
  sendMessage: jest.fn(),
  destroy: jest.fn(),
  info: undefined as
    | {
        wid?: {
          _serialized?: string
        }
      }
    | undefined,
}

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}))

jest.mock('whatsapp-web.js', () => ({
  Client: jest.fn().mockImplementation(() => mockClient),
  LocalAuth: jest.fn(),
}))

describe('WhatsAppSession', () => {
  const originalSessionPath = process.env.WHATSAPP_SESSION_PATH
  const testSessionPath = '/tmp/ferraztech-whatsapp-session-spec'

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.WHATSAPP_SESSION_PATH = testSessionPath
  })

  afterAll(() => {
    process.env.WHATSAPP_SESSION_PATH = originalSessionPath
  })

  it('cleans the nested LocalAuth browser profile path before initializing', async () => {
    mockClient.initialize.mockResolvedValue(undefined)
    const session = createSession('session-2')

    await session.start()

    expect(execSync).toHaveBeenCalledWith(
      expect.stringContaining(`${testSessionPath}/session-2/session`),
      expect.any(Object),
    )
    expect(execSync).toHaveBeenCalledWith(
      expect.stringContaining(`${testSessionPath}/session-2/session/Default/LOCK`),
      expect.any(Object),
    )
  })

  it('retries once when Chromium reports the profile is already running', async () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation()
    mockClient.initialize
      .mockRejectedValueOnce(
        new Error(
          'The browser is already running for /tmp/session. Use a different `userDataDir` or stop the running browser first.',
        ),
      )
      .mockResolvedValueOnce(undefined)

    const session = createSession('session-2')

    await session.start()

    expect(mockClient.initialize).toHaveBeenCalledTimes(2)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Conflito de perfil Chromium detectado'),
    )

    warnSpy.mockRestore()
  })

  it('configures the WhatsApp client for stable session takeover and auth reuse', async () => {
    mockClient.initialize.mockResolvedValue(undefined)
    const session = createSession('session-1')

    await session.start()

    expect(Client).toHaveBeenCalledWith(
      expect.objectContaining({
        authTimeoutMs: 60000,
        qrMaxRetries: 0,
        takeoverOnConflict: true,
        takeoverTimeoutMs: 5000,
        webVersionCache: { type: 'local' },
      }),
    )
  })

  it('resolves the WhatsApp id before sending a message', async () => {
    const session = createSession('session-1')
    jest.replaceProperty(session as any, 'client', mockClient)
    jest.replaceProperty(session as any, '_connected', true)
    mockClient.getNumberId.mockResolvedValue({ _serialized: '5511999999999@c.us' })
    mockClient.sendMessage.mockResolvedValue(undefined)

    await session.sendMessage('+55 (11) 99999-9999', 'Olá')

    expect(mockClient.getNumberId).toHaveBeenCalledWith('5511999999999')
    expect(mockClient.sendMessage).toHaveBeenCalledWith('5511999999999@c.us', 'Olá')
  })

  it('throws a clear error when the number is not registered on WhatsApp', async () => {
    const session = createSession('session-1')
    jest.replaceProperty(session as any, 'client', mockClient)
    jest.replaceProperty(session as any, '_connected', true)
    mockClient.getNumberId.mockResolvedValue(null)

    await expect(session.sendMessage('5511999999999', 'Olá')).rejects.toThrow(
      'WhatsApp number not found: 5511999999999',
    )
  })

  it('processes incoming messages from lid contacts using the resolved phone number', async () => {
    mockClient.initialize.mockResolvedValue(undefined)
    mockClient.getContactLidAndPhone.mockResolvedValue([
      { lid: '5511999999999@lid', pn: '5511999999999@c.us' },
    ])
    const onIncomingMessage = jest.fn()
    const session = createSession('session-2', onIncomingMessage)

    await session.start()

    const messageHandler = getRegisteredHandler('message')
    await messageHandler({
      from: '5511999999999@lid',
      body: 'Oi',
      type: 'chat',
    })

    expect(onIncomingMessage).toHaveBeenCalledWith('5511999999999', 'Oi')
  })

  it('ignores unsupported incoming senders and does not forward them', async () => {
    mockClient.initialize.mockResolvedValue(undefined)
    const onIncomingMessage = jest.fn()
    const session = createSession('session-2', onIncomingMessage)

    await session.start()

    const messageHandler = getRegisteredHandler('message')
    await messageHandler({
      from: 'grupo@g.us',
      body: 'Oi',
      type: 'chat',
    })

    expect(onIncomingMessage).not.toHaveBeenCalled()
  })

  it('logs status broadcasts as ignored WhatsApp status events', async () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation()
    mockClient.initialize.mockResolvedValue(undefined)
    const onIncomingMessage = jest.fn()
    const session = createSession('session-2', onIncomingMessage)

    await session.start()

    const messageHandler = getRegisteredHandler('message')
    await messageHandler({
      from: 'status@broadcast',
      body: '',
      type: 'chat',
    })

    expect(onIncomingMessage).not.toHaveBeenCalled()
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Evento de status do WhatsApp ignorado'),
    )

    logSpy.mockRestore()
  })

  it('logs the connected WhatsApp line when the session becomes ready', async () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation()
    mockClient.initialize.mockResolvedValue(undefined)
    mockClient.info = {
      wid: {
        _serialized: '559282606110@c.us',
      },
    }
    const session = createSession('session-1')

    await session.start()

    const readyHandler = getRegisteredHandler('ready')
    await readyHandler()

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Linha conectada: 559282606110'),
    )

    logSpy.mockRestore()
  })

  it('does not attempt to reconnect while the session is shutting down', async () => {
    mockClient.initialize.mockResolvedValue(undefined)
    mockClient.destroy.mockResolvedValue(undefined)
    const session = createSession('session-1')

    await session.start()
    await session.stop()

    const disconnectedHandler = getRegisteredHandler('disconnected')
    await disconnectedHandler('LOGOUT')

    expect(mockClient.initialize).toHaveBeenCalledTimes(1)
  })

  it('uses a slower reauth delay after logout to reduce QR churn', async () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation()
    mockClient.initialize.mockResolvedValue(undefined)
    const session = createSession('session-1')

    await session.start()

    const disconnectedHandler = getRegisteredHandler('disconnected')
    await disconnectedHandler('LOGOUT')

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Reconectando (1/5) em 7ms'),
    )

    logSpy.mockRestore()
  })
})

function createSession(id: string, onIncomingMessage = jest.fn()) {
  const configService = {
    get: jest.fn((key: string, defaultValue?: number) => {
      const values: Record<string, number> = {
        WHATSAPP_MAX_RETRIES: 5,
        WHATSAPP_RETRY_DELAY_MS: 1,
        WHATSAPP_REAUTH_DELAY_MS: 7,
        WHATSAPP_AUTH_TIMEOUT_MS: 60000,
        WHATSAPP_QR_MAX_RETRIES: 0,
        WHATSAPP_TAKEOVER_TIMEOUT_MS: 5000,
      }

      if (key === 'WHATSAPP_TAKEOVER_ON_CONFLICT') {
        return true as unknown as number
      }

      return values[key] ?? defaultValue
    }),
  } as unknown as ConfigService

  return new WhatsAppSession(id, configService, onIncomingMessage)
}

function getRegisteredHandler(eventName: string) {
  const handler = mockClient.on.mock.calls.find(([event]) => event === eventName)?.[1]

  if (!handler) {
    throw new Error(`Handler for ${eventName} was not registered`)
  }

  return handler
}
