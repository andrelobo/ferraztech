import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
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
}
