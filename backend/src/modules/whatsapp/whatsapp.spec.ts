import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { WhatsAppService } from './whatsapp.service'
import { WhatsAppController } from './whatsapp.controller'
import { GatewayClientService } from './gateway-client.service'
import { BotService } from '../bot/bot.service'
import { ConversationsService } from '../conversations/conversations.service'
import { LeadsService } from '../leads/leads.service'
import * as QRCode from 'qrcode'

jest.mock('qrcode', () => ({
  toBuffer: jest.fn(),
}))

describe('WhatsAppModule', () => {
  let service: WhatsAppService
  let controller: WhatsAppController
  let botService: BotService

  const mockGatewayClient = {
    sendText: jest.fn(),
    getQr: jest.fn(),
    listTenantSessions: jest.fn(),
  }

  const mockBotService = {
    processMessage: jest.fn(),
  }

  const mockConversationsService = {
    findByPhone: jest.fn(),
    create: jest.fn(),
    addMessage: jest.fn(),
  }

  const mockLeadsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByPhone: jest.fn(),
    updateServiceType: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WhatsAppController],
      providers: [
        WhatsAppService,
        { provide: GatewayClientService, useValue: mockGatewayClient },
        { provide: BotService, useValue: mockBotService },
        { provide: ConversationsService, useValue: mockConversationsService },
        { provide: LeadsService, useValue: mockLeadsService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                GATEWAY_SESSION_ID: 'session-1',
                GATEWAY_TENANT_ID: 'tenant-1',
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

    it('should send message through the gateway', async () => {
      mockGatewayClient.sendText.mockResolvedValue({ id: 'msg-1', status: 'queued' })

      const result = await service.sendMessage('5511999999999', 'Olá')

      expect(mockGatewayClient.sendText).toHaveBeenCalledWith(
        'session-1',
        '5511999999999',
        'Olá',
      )
      expect(result).toEqual({
        sent: true,
        to: '5511999999999',
        message: 'Olá',
        sessionId: 'session-1',
      })
    })

    it('should map gateway failures to a clear client error', async () => {
      mockGatewayClient.sendText.mockRejectedValue(
        new Error('Falha no gateway (400): Sessão não encontrada'),
      )

      await expect(service.sendMessage('5511999999999', 'Olá')).rejects.toThrow(
        BadRequestException,
      )
    })

    it('should aggregate session status from the gateway', async () => {
      mockGatewayClient.listTenantSessions.mockResolvedValue([
        { _id: 'session-1', state: 'open', qr: null },
        { _id: 'session-2', state: 'qr', qr: 'QR@code' },
        { _id: 'session-3', state: 'close', qr: null },
      ])

      const status = await service.getStatus()

      expect(status.sessions).toHaveLength(3)
      expect(status.sessions[0]).toEqual({
        id: 'session-1',
        connected: true,
        qrCode: null,
        retryCount: 0,
        startTime: 0,
      })
      expect(status.sessions[1].connected).toBe(false)
      expect(status.sessions[1].qrCode).toBe('QR@code')
      expect(status.activeSession).toBe('session-1')
      expect(status.uptime).toBeGreaterThanOrEqual(0)
    })

    it('should fetch the QR of the configured session by default', async () => {
      mockGatewayClient.getQr.mockResolvedValue({
        id: 'session-1',
        state: 'qr',
        qr: 'QR@code',
      })

      const result = await service.getQr()

      expect(mockGatewayClient.getQr).toHaveBeenCalledWith('session-1')
      expect(result.qr).toBe('QR@code')
    })

    it('should flag first incoming message as new contact for the bot flow', async () => {
      mockConversationsService.findByPhone.mockResolvedValueOnce(null)
      mockConversationsService.create.mockResolvedValue({ _id: 'conversation-1' })
      mockConversationsService.addMessage.mockResolvedValue({})
      mockLeadsService.create.mockResolvedValue({ _id: 'lead-1' })
      mockBotService.processMessage.mockResolvedValue({ reply: 'Bem-vindo à FERRAZTECH!' })
      jest.spyOn(service, 'sendMessage').mockResolvedValue({
        sent: true,
        to: '5511999999999',
        message: 'Bem-vindo à FERRAZTECH!',
        sessionId: 'session-1',
      })

      await service.handleIncomingMessage('5511999999999', 'Olá')

      expect(mockBotService.processMessage).toHaveBeenCalledWith(
        {
          from: '5511999999999',
          body: 'Olá',
          name: '5511999999999',
        },
        { isNewContact: true },
      )
    })
  })

  describe('WhatsAppController', () => {
    it('should return status via GET', async () => {
      jest.spyOn(service, 'getStatus').mockResolvedValue({
        sessions: [],
        activeSession: null,
        uptime: 0,
      })
      const result = await controller.getStatus()
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

    it('should render the QR code as PNG', async () => {
      jest
        .spyOn(service, 'getQr')
        .mockResolvedValue({ id: 'session-1', state: 'qr', qr: 'QR@code' })
      ;(QRCode.toBuffer as jest.Mock).mockResolvedValue(Buffer.from('png-data'))
      const res = {
        setHeader: jest.fn(),
        send: jest.fn(),
      }

      await controller.getQR(undefined, res as never)

      expect(QRCode.toBuffer).toHaveBeenCalledWith('QR@code', { width: 400, margin: 2 })
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png')
      expect(res.send).toHaveBeenCalledWith(Buffer.from('png-data'))
    })

    it('should throw NotFound when no QR is available', async () => {
      jest
        .spyOn(service, 'getQr')
        .mockResolvedValue({ id: 'session-1', state: 'connecting', qr: null })
      const res = {
        setHeader: jest.fn(),
        send: jest.fn(),
      }

      await expect(controller.getQR(undefined, res as never)).rejects.toThrow(
        NotFoundException,
      )
    })
  })
})
