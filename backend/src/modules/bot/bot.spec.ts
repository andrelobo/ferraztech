import { Test, TestingModule } from '@nestjs/testing'
import { BotService } from './bot.service'
import { ConversationsService } from '../conversations/conversations.service'

describe('BotModule', () => {
  let service: BotService

  const mockConversationsService = {
    findByPhone: jest.fn(),
    getMessages: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotService,
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
      expect(result.reply).toContain('Seja bem-vindo à *Ferraz Tech*')
      expect(result.reply).toContain('desbloqueio do seu telefone')
    })

    it('should return welcome message when new contact is flagged by caller', async () => {
      mockConversationsService.findByPhone.mockResolvedValue({ _id: 'conversation-1' })

      const result = await service.processMessage(
        {
          from: '5511999999999',
          body: 'Olá',
          name: 'João',
        },
        { isNewContact: true },
      )

      expect(result.reply).toContain('desbloqueio do seu telefone')
    })

    it('should ask for IMEI after the welcome message was already sent', async () => {
      mockConversationsService.findByPhone.mockResolvedValue({ _id: 'conversation-1' })
      mockConversationsService.getMessages.mockResolvedValue([
        { role: 'user', content: 'Oi' },
        { role: 'bot', content: 'Olá, bem-vindo ao Ferraz Tech...' },
        { role: 'user', content: 'Meu telefone foi bloqueado' },
      ])

      const result = await service.processMessage({
        from: '5511999999999',
        body: 'Meu telefone foi bloqueado',
        name: 'João',
      })

      expect(result.reply).toContain('envie o *IMEI* do telefone')
      expect(result.reply).toContain('atendimento humano')
      expect(result.reply).toContain('bandeja do chip')
      expect(result.reply).toContain('gavetinha do chip')
      expect(result.reply).toContain('chip virtual')
    })

    it('should confirm IMEI receipt after the bot already requested it', async () => {
      mockConversationsService.findByPhone.mockResolvedValue({ _id: 'conversation-1' })
      mockConversationsService.getMessages.mockResolvedValue([
        { role: 'user', content: 'Oi' },
        { role: 'bot', content: 'Olá, bem-vindo ao Ferraz Tech...' },
        { role: 'user', content: 'Meu telefone foi bloqueado' },
        { role: 'bot', content: 'Para adiantar o seu serviço, envie o *IMEI* do telefone por aqui.' },
      ])

      const result = await service.processMessage({
        from: '5511999999999',
        body: 'IMEI 123456789012345',
        name: 'João',
      })

      expect(result.reply).toContain('Recebi o *IMEI*')
      expect(result.reply).toContain('atendimento humano')
      expect(result.reply).toContain('até *3 minutos*')
    })

    it('should send a short reminder when still waiting for the IMEI', async () => {
      mockConversationsService.findByPhone.mockResolvedValue({ _id: 'conversation-1' })
      mockConversationsService.getMessages.mockResolvedValue([
        { role: 'user', content: 'Oi' },
        { role: 'bot', content: 'Olá, bem-vindo ao Ferraz Tech...' },
        { role: 'user', content: 'Meu telefone foi bloqueado' },
        { role: 'bot', content: 'Para adiantar o seu serviço, envie o *IMEI* do telefone por aqui.' },
      ])

      const result = await service.processMessage({
        from: '5511999999999',
        body: 'Ainda não achei',
        name: 'João',
      })

      expect(result.reply).toContain('Ainda estou aguardando o *IMEI*')
      expect(result.reply).toContain('bandeja do chip')
      expect(result.reply).toContain('chip virtual')
      expect(result.reply).not.toContain('Perfeito. A próxima etapa será com o atendimento humano.')
    })

    it('should send the welcome message again when conversation has no prior bot reply', async () => {
      mockConversationsService.findByPhone.mockResolvedValue({ _id: 'conversation-1' })
      mockConversationsService.getMessages.mockResolvedValue([
        { role: 'user', content: 'Oi' },
      ])

      const result = await service.processMessage({
        from: '5511999999999',
        body: 'Oi',
        name: 'João',
      })

      expect(result.reply).toContain('qual é a sua dúvida')
    })
  })
})
