import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { UnauthorizedException } from '@nestjs/common'
import { createHmac } from 'crypto'
import { WhatsAppWebhookController } from './whatsapp-webhook.controller'
import { WhatsAppService } from './whatsapp.service'

describe('WhatsAppWebhookController', () => {
  let controller: WhatsAppWebhookController
  let whatsappService: WhatsAppService

  const mockWhatsAppService = {
    handleIncomingMessage: jest.fn().mockResolvedValue(undefined),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WhatsAppWebhookController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'GATEWAY_WEBHOOK_SECRET' ? 'secret-teste' : undefined,
            ),
          },
        },
        { provide: WhatsAppService, useValue: mockWhatsAppService },
      ],
    }).compile()

    controller = module.get<WhatsAppWebhookController>(WhatsAppWebhookController)
    whatsappService = module.get<WhatsAppService>(WhatsAppService)
  })

  const sign = (rawBody: Buffer) =>
    createHmac('sha256', 'secret-teste').update(rawBody).digest('hex')

  it('should reject the webhook when the signature is missing', () => {
    expect(() =>
      controller.handle({
        rawBody: Buffer.from('{}'),
        headers: {},
        body: {},
      } as never),
    ).toThrow(UnauthorizedException)
  })

  it('should reject the webhook when the signature is invalid', () => {
    expect(() =>
      controller.handle({
        rawBody: Buffer.from('{"type":"qr.updated"}'),
        headers: { 'x-muirakitan-signature': 'assinatura-invalida' },
        body: { type: 'qr.updated' },
      } as never),
    ).toThrow(UnauthorizedException)
  })

  it('should dispatch a message.upsert to the bot flow with a normalized phone', async () => {
    const event = {
      id: 'evt-1',
      type: 'message.upsert',
      sessionId: 'session-1',
      payload: {
        from: '5511999999999@s.whatsapp.net',
        to: '5511999999999@s.whatsapp.net',
        body: 'Olá',
        timestamp: 1710000000,
        messageType: 'conversation',
      },
      timestamp: '2026-08-02T10:00:00.000Z',
    }
    const rawBody = Buffer.from(JSON.stringify(event))

    const result = controller.handle({
      rawBody,
      headers: { 'x-muirakitan-signature': sign(rawBody) },
      body: event,
    } as never)

    expect(result).toEqual({ received: true })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(mockWhatsAppService.handleIncomingMessage).toHaveBeenCalledWith(
      '5511999999999',
      'Olá',
    )
  })

  it('should not dispatch messages coming from groups', async () => {
    const event = {
      id: 'evt-2',
      type: 'message.upsert',
      sessionId: 'session-1',
      payload: {
        from: '5561999999999@g.us',
        body: 'Olá grupo',
        timestamp: 1710000000,
        messageType: 'conversation',
      },
      timestamp: '2026-08-02T10:00:00.000Z',
    }
    const rawBody = Buffer.from(JSON.stringify(event))

    controller.handle({
      rawBody,
      headers: { 'x-muirakitan-signature': sign(rawBody) },
      body: event,
    } as never)

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(mockWhatsAppService.handleIncomingMessage).not.toHaveBeenCalled()
  })

  it('should acknowledge connection and qr events without touching the bot flow', async () => {
    const event = {
      id: 'evt-3',
      type: 'connection.update',
      sessionId: 'session-1',
      payload: { state: 'open' },
      timestamp: '2026-08-02T10:00:00.000Z',
    }
    const rawBody = Buffer.from(JSON.stringify(event))

    const result = controller.handle({
      rawBody,
      headers: { 'x-muirakitan-signature': sign(rawBody) },
      body: event,
    } as never)

    expect(result).toEqual({ received: true })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(mockWhatsAppService.handleIncomingMessage).not.toHaveBeenCalled()
  })
})
