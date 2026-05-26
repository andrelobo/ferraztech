import { Test, TestingModule } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { ConversationsService } from './conversations.service'
import { ConversationsController } from './conversations.controller'
import { Conversation } from './schemas/conversation.schema'
import { Message } from './schemas/message.schema'

const mockConversation = {
  _id: 'conv-id-1',
  phone: '5511999999999',
  leadId: 'lead-id-1',
  lastMessage: 'Olá, gostaria de saber mais',
  lastMessageAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockMessages = [
  {
    _id: 'msg-id-1',
    conversationId: 'conv-id-1',
    role: 'user',
    content: 'Olá, gostaria de saber mais',
    timestamp: new Date(),
  },
  {
    _id: 'msg-id-2',
    conversationId: 'conv-id-1',
    role: 'bot',
    content: 'Olá! Como posso ajudar?',
    timestamp: new Date(),
  },
]

const mockConversationModel = {
  find: jest.fn(),
  findOne: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  create: jest.fn(),
}

const mockMessageModel = {
  find: jest.fn(),
  create: jest.fn(),
}

describe('ConversationsModule', () => {
  let controller: ConversationsController
  let service: ConversationsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConversationsController],
      providers: [
        ConversationsService,
        {
          provide: getModelToken(Conversation.name),
          useValue: mockConversationModel,
        },
        {
          provide: getModelToken(Message.name),
          useValue: mockMessageModel,
        },
      ],
    }).compile()

    controller = module.get<ConversationsController>(ConversationsController)
    service = module.get<ConversationsService>(ConversationsService)
  })

  afterEach(() => jest.clearAllMocks())

  describe('ConversationsService', () => {
    it('should list all conversations', async () => {
      const mockExec = jest.fn().mockResolvedValue([mockConversation])
      const mockSort = jest.fn().mockReturnValue({ exec: mockExec })
      mockConversationModel.find.mockReturnValue({ sort: mockSort })
      const result = await service.findAll()
      expect(result).toEqual([mockConversation])
    })

    it('should find conversation by phone', async () => {
      const mockExec = jest.fn().mockResolvedValue(mockConversation)
      mockConversationModel.findOne.mockReturnValue({ exec: mockExec })
      const result = await service.findByPhone('5511999999999')
      expect(result).toEqual(mockConversation)
      expect(mockConversationModel.findOne).toHaveBeenCalledWith({
        phone: '5511999999999',
      })
    })

    it('should get messages for a conversation', async () => {
      const mockExec = jest.fn().mockResolvedValue(mockMessages)
      const mockSort = jest.fn().mockReturnValue({ exec: mockExec })
      mockMessageModel.find.mockReturnValue({ sort: mockSort })
      const result = await service.getMessages('conv-id-1')
      expect(result).toEqual(mockMessages)
      expect(mockMessageModel.find).toHaveBeenCalledWith({
        conversationId: 'conv-id-1',
      })
    })
  })

  describe('ConversationsController', () => {
    it('should list conversations via GET', async () => {
      jest
        .spyOn(service, 'findAll')
        .mockResolvedValue([mockConversation] as any)
      const result = await controller.findAll()
      expect(result).toEqual([mockConversation])
    })

    it('should get conversation by phone via GET/:phone', async () => {
      jest
        .spyOn(service, 'findByPhone')
        .mockResolvedValue(mockConversation as any)
      const result = await controller.findByPhone('5511999999999')
      expect(result).toEqual(mockConversation)
    })

    it('should get messages via GET/:phone/messages', async () => {
      const convExec = jest.fn().mockResolvedValue(mockConversation)
      mockConversationModel.findOne.mockReturnValue({ exec: convExec })
      jest.spyOn(service, 'getMessages').mockResolvedValue(mockMessages as any)
      const result = await controller.getMessages('5511999999999')
      expect(result).toEqual(mockMessages)
    })
  })
})
