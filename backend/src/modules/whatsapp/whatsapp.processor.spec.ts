import { Test, TestingModule } from '@nestjs/testing'
import { WhatsAppProcessor } from './whatsapp.processor'
import { WhatsAppService } from './whatsapp.service'
import { getQueueToken } from '@nestjs/bullmq'

describe('WhatsAppProcessor', () => {
  let processor: WhatsAppProcessor
  let whatsappService: WhatsAppService

  const mockWhatsAppService = {
    sendMessage: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppProcessor,
        { provide: WhatsAppService, useValue: mockWhatsAppService },
        { provide: getQueueToken('whatsapp'), useValue: { add: jest.fn() } },
      ],
    }).compile()

    processor = module.get<WhatsAppProcessor>(WhatsAppProcessor)
  })

  it('should be defined', () => {
    expect(processor).toBeDefined()
  })

  it('should process a queued message', async () => {
    mockWhatsAppService.sendMessage.mockResolvedValue({
      sent: true,
      to: '5511999999999',
      message: 'Teste',
      sessionId: 'session-1',
    })
    const job = { data: { to: '5511999999999', message: 'Teste' }, id: 'job-1' } as any
    const result = await processor.process(job)
    expect(result).toEqual({ sent: true, to: '5511999999999', message: 'Teste', sessionId: 'session-1' })
  })

  it('should throw when message is still queued', async () => {
    mockWhatsAppService.sendMessage.mockResolvedValue({
      queued: true,
      to: '5511999999999',
      message: 'Teste',
    })
    const job = { data: { to: '5511999999999', message: 'Teste' }, id: 'job-2' } as any
    await expect(processor.process(job)).rejects.toThrow('Still no connected session')
  })
})
