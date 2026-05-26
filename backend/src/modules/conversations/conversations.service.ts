import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { Conversation, ConversationDocument } from './schemas/conversation.schema'
import { Message, MessageDocument } from './schemas/message.schema'

@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name)
    private messageModel: Model<MessageDocument>,
  ) {}

  async findAll(): Promise<Conversation[]> {
    return this.conversationModel.find().sort({ lastMessageAt: -1 }).exec()
  }

  async findByPhone(phone: string): Promise<Conversation | null> {
    return this.conversationModel.findOne({ phone }).exec()
  }

  async findByLeadId(leadId: string): Promise<Conversation | null> {
    return this.conversationModel.findOne({ leadId: new Types.ObjectId(leadId) }).exec()
  }

  async create(phone: string, leadId: string): Promise<Conversation> {
    return this.conversationModel.create({
      phone,
      leadId: new Types.ObjectId(leadId),
    })
  }

  async addMessage(
    conversationId: string,
    role: string,
    content: string,
  ): Promise<Message> {
    const message = await this.messageModel.create({
      conversationId: new Types.ObjectId(conversationId),
      role,
      content,
    })
    await this.conversationModel
      .findByIdAndUpdate(conversationId, {
        lastMessage: content,
        lastMessageAt: new Date(),
      })
      .exec()
    return message
  }

  async getMessages(phone: string): Promise<Message[]> {
    const conversation = await this.conversationModel
      .findOne({ phone })
      .exec()
    if (!conversation) return []
    return this.messageModel
      .find({ conversationId: conversation._id })
      .sort({ timestamp: 1 })
      .exec()
  }

  async getMessagesByConversationId(conversationId: string): Promise<Message[]> {
    return this.messageModel
      .find({ conversationId: new Types.ObjectId(conversationId) })
      .sort({ timestamp: 1 })
      .exec()
  }
}
