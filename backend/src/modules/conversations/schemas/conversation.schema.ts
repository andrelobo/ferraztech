import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type ConversationDocument = Conversation & Document

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ required: true, unique: true })
  phone: string

  @Prop({ type: Types.ObjectId, ref: 'Lead' })
  leadId?: Types.ObjectId

  @Prop()
  lastMessage?: string

  @Prop()
  lastMessageAt?: Date
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation)
