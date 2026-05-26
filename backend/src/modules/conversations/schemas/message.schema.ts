import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type MessageDocument = Message & Document

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true })
  conversationId: Types.ObjectId

  @Prop({ required: true, enum: ['user', 'bot', 'system'] })
  role: string

  @Prop({ required: true })
  content: string

  @Prop({ default: Date.now })
  timestamp: Date
}

export const MessageSchema = SchemaFactory.createForClass(Message)
