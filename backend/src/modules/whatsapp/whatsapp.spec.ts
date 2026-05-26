import { Test, TestingModule } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { ConfigService } from '@nestjs/config'
import { WhatsAppService } from './whatsapp.service'
import { WhatsAppController } from './whatsapp.controller'
import { ConversationsService } from '../conversations/conversations.service'

const mockClient = {
  on: jest.fn(),
  initialize: jest.fn(),
  sendMessage: jest.fn(),
  getState: jest.fn(),
  destroy: jest.fn(),
}

jest.mock('whatsapp-web.js', () => ({
  Client: jest.fn().mockImplementation(() => mockClient),
  LocalAuth: jest.fn(),
}))

describe('WhatsAppModule', () => {
  let service: WhatsAppService
  let controller: WhatsAppController

  const mockConversationsService = {
    findByPhone: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WhatsAppController],
      providers: [
        WhatsAppService,
        {
          provide: ConversationsService,
          useValue: mockConversationsService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                WHATSAPP_SESSION_PATH: './sessions',
                WHATSAPP_MAX_RETRIES: '5',
                WHATSAPP_RETRY_DELAY_MS: '5000',
              }
              return config[key]
            }),
          },
        },
        {
          provide: 'BullQueue_whatsapp',
          useValue: { add: jest.fn() },
        },
      ],
    }).compile()

    service = module.get<WhatsAppService>(WhatsAppService)
    controller = module.get<WhatsAppController>(WhatsAppController)
  })

  afterEach(() => jest.clearAllMocks())

  describe('WhatsAppService', () => {
    it('should be defined', () => {
      expect(service).toBeDefined()
    })

    it('should return status ready when client is connected', () => {
      mockClient.getState.mockReturnValue('CONNECTED')
      jest.replaceProperty(service as any, 'qrCode', 'qr-data-string')
      jest.replaceProperty(service as any, 'isReady', true)

      const status = service.getStatus()
      expect(status).toHaveProperty('connected', true)
      expect(status).toHaveProperty('qrCode', 'qr-data-string')
    })

    it('should return status disconnected when client is not ready', () => {
      jest.replaceProperty(service as any, 'isReady', false)
      jest.replaceProperty(service as any, 'qrCode', null)

      const status = service.getStatus()
      expect(status).toHaveProperty('connected', false)
      expect(status).toHaveProperty('qrCode', null)
    })

    it('should queue a message for sending', async () => {
      const result = await service.sendMessage(
        '5511999999999',
        'Olá, tudo bem?',
      )
      expect(result).toHaveProperty('queued', true)
    })
  })

  describe('WhatsAppController', () => {
    it('should return status via GET', () => {
      jest
        .spyOn(service, 'getStatus')
        .mockReturnValue({ connected: true, qrCode: 'data:...', uptime: 0, retryCount: 0 })
      const result = controller.getStatus()
      expect(result).toEqual({ connected: true, qrCode: 'data:...', uptime: 0, retryCount: 0 })
    })

    it('should send message via POST', async () => {
      jest
        .spyOn(service, 'sendMessage')
        .mockResolvedValue({ queued: true, to: '5511999999999', message: 'Olá' })
      const result = await controller.sendMessage({
        to: '5511999999999',
        message: 'Olá',
      })
      expect(result).toEqual({ queued: true, to: '5511999999999', message: 'Olá' })
    })
  })
})
