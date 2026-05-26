import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type LeadDocument = Lead & Document

@Schema({ timestamps: true })
export class Lead {
  @Prop({ required: true, trim: true })
  name: string

  @Prop({ required: true, unique: true })
  phone: string

  @Prop()
  email?: string

  @Prop({ required: true })
  serviceType: string

  @Prop({
    type: String,
    enum: ['new', 'contacted', 'qualified', 'converted', 'lost'],
    default: 'new',
  })
  status: string

  @Prop()
  notes?: string
}

export const LeadSchema = SchemaFactory.createForClass(Lead)
