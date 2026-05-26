import { Test, TestingModule } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { BotService } from './bot.service'
import { ConversationsService } from '../conversations/conversations.service'
import { LeadsService } from '../leads/leads.service'

describe('BotModule', () => {
  let service: BotService

  const mockLeadsService = {
    create: jest.fn(),
    findAll: jest.fn(),
  }

  const mockConversationsService = {
    findByPhone: jest.fn(),
    getMessages: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotService,
        { provide: LeadsService, useValue: mockLeadsService },
        {
          provide: ConversationsService,
          useValue: mockConversationsService,
        },
      ],
    }).compile()

    service = module.get<BotService>(BotService)
  })

  afterEach(() => jest.clearAllMocks())

  describe('BotService', () => {
    it('should return welcome message for new contact', async () => {
      mockConversationsService.findByPhone.mockResolvedValue(null)

      const result = await service.processMessage({
        from: '5511999999999',
        body: 'Olá',
        name: 'João',
      })

      expect(result).toHaveProperty('reply')
      expect(result.reply).toContain('Bem-vindo')
    })

    it('should route to menu option 1', async () => {
      const result = await service.processMenuOption('1', '5511999999999')
      expect(result).toHaveProperty('reply')
      expect(result.reply).toContain('consultoria')
    })

    it('should route to menu option 2', async () => {
      const result = await service.processMenuOption('2', '5511999999999')
      expect(result).toHaveProperty('reply')
      expect(result.reply).toContain('orçamento')
    })

    it('should return main menu for unknown option', async () => {
      const result = await service.processMenuOption('99', '5511999999999')
      expect(result).toHaveProperty('reply')
      expect(result.reply).toContain('inválida')
    })
  })
})
