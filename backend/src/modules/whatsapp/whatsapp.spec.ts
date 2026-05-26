import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { getQueueToken } from '@nestjs/bullmq'
import { WhatsAppService } from './whatsapp.service'
import { WhatsAppController } from './whatsapp.controller'
import { BotService } from '../bot/bot.service'
import { ConversationsService } from '../conversations/conversations.service'
import { LeadsService } from '../leads/leads.service'

const mockClient = {
  on: jest.fn(),
  initialize: jest.fn(),
  sendMessage: jest.fn(),
  getState: jest.fn(),
  destroy: jest.fn(),
  once: jest.fn(),
}

jest.mock('whatsapp-web.js', () => ({
  Client: jest.fn().mockImplementation(() => mockClient),
  LocalAuth: jest.fn(),
}))

describe('WhatsAppModule', () => {
  let service: WhatsAppService
  let controller: WhatsAppController
  let botService: BotService

  const mockBotService = {
    processMessage: jest.fn(),
  }

  const mockConversationsService = {
    findByPhone: jest.fn(),
  }

  const mockLeadsService = {
    create: jest.fn(),
    findAll: jest.fn(),
  }

  const mockQueue = {
    add: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WhatsAppController],
      providers: [
        WhatsAppService,
        { provide: BotService, useValue: mockBotService },
        { provide: ConversationsService, useValue: mockConversationsService },
        { provide: LeadsService, useValue: mockLeadsService },
        { provide: getQueueToken('whatsapp'), useValue: mockQueue },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                WHATSAPP_SESSION_PATH: './sessions',
                WHATSAPP_SESSION_COUNT: '2',
                WHATSAPP_MAX_RETRIES: '5',
                WHATSAPP_RETRY_DELAY_MS: '5000',
              }
              return config[key]
            }),
          },
        },
      ],
    }).compile()

    service = module.get<WhatsAppService>(WhatsAppService)
    controller = module.get<WhatsAppController>(WhatsAppController)
    botService = module.get<BotService>(BotService)
  })

  describe('WhatsAppService', () => {
    it('should be defined', () => {
      expect(service).toBeDefined()
    })

    it('should create multiple sessions on init', async () => {
      await service.onModuleInit()
      const status = service.getStatus()
      expect(status.sessions).toHaveLength(2)
      expect(status.sessions[0]).toHaveProperty('id', 'session-1')
      expect(status.sessions[1]).toHaveProperty('id', 'session-2')
    })

    it('should return aggregated status with all sessions', () => {
      jest.replaceProperty(service as any, 'startTime', 1000)
      jest.replaceProperty(service as any, 'sessions', [
        { state: { id: 'session-1', connected: true, qrCode: null, retryCount: 0, startTime: 500 } },
        { state: { id: 'session-2', connected: false, qrCode: 'data:qr', retryCount: 2, startTime: 700 } },
      ])

      const status = service.getStatus()
      expect(status.sessions).toHaveLength(2)
      expect(status.activeSession).toBe('session-1')
      expect(status.uptime).toBeGreaterThan(0)
    })

    it('should send message via connected session', async () => {
      const mockSession = {
        id: 'session-1',
        state: { id: 'session-1', connected: true },
        sendMessage: jest.fn().mockResolvedValue(undefined),
      }
      jest.replaceProperty(service as any, 'sessions', [mockSession])

      const result = await service.sendMessage('5511999999999', 'Olá')
      expect(mockSession.sendMessage).toHaveBeenCalledWith('5511999999999', 'Olá')
      expect(result).toEqual({ sent: true, to: '5511999999999', message: 'Olá', sessionId: 'session-1' })
    })

    it('should fallback to backup session when primary fails', async () => {
      const session1 = {
        id: 'session-1',
        state: { id: 'session-1', connected: true },
        sendMessage: jest.fn().mockRejectedValue(new Error('send failed')),
      }
      const session2 = {
        id: 'session-2',
        state: { id: 'session-2', connected: true },
        sendMessage: jest.fn().mockResolvedValue(undefined),
      }
      jest.replaceProperty(service as any, 'sessions', [session1, session2])

      const result = await service.sendMessage('5511999999999', 'Olá')
      expect(session2.sendMessage).toHaveBeenCalledWith('5511999999999', 'Olá')
      expect(result).toEqual({ sent: true, to: '5511999999999', message: 'Olá', sessionId: 'session-2' })
    })

    it('should queue message when no session is connected', async () => {
      const mockSession = {
        id: 'session-1',
        state: { id: 'session-1', connected: false },
        sendMessage: jest.fn(),
      }
      jest.replaceProperty(service as any, 'sessions', [mockSession])

      const result = await service.sendMessage('5511999999999', 'Olá')
      expect(mockSession.sendMessage).not.toHaveBeenCalled()
      expect(result).toEqual({ queued: true, to: '5511999999999', message: 'Olá' })
    })
  })

  describe('WhatsAppController', () => {
    it('should return status via GET', () => {
      jest.spyOn(service, 'getStatus').mockReturnValue({
        sessions: [],
        activeSession: null,
        uptime: 0,
      })
      const result = controller.getStatus()
      expect(result).toEqual({ sessions: [], activeSession: null, uptime: 0 })
    })

    it('should send message via POST', async () => {
      jest
        .spyOn(service, 'sendMessage')
        .mockResolvedValue({ sent: true, to: '5511999999999', message: 'Olá', sessionId: 'session-1' })
      const result = await controller.sendMessage({
        to: '5511999999999',
        message: 'Olá',
      })
      expect(result).toEqual({ sent: true, to: '5511999999999', message: 'Olá', sessionId: 'session-1' })
    })
  })
})
