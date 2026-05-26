import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type SessionDocument = Session & Document

@Schema({ timestamps: true })
export class Session {
  @Prop({ required: true, unique: true })
  sessionId: string

  @Prop({ default: 'initializing' })
  status: string

  @Prop()
  phone?: string

  @Prop()
  lastConnectedAt?: Date

  @Prop({ default: 0 })
  errorCount: number

  @Prop()
  lastError?: string
}

export const SessionSchema = SchemaFactory.createForClass(Session)
