import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { BullModule } from '@nestjs/bullmq'
import { WhatsAppController } from './whatsapp.controller'
import { WhatsAppService } from './whatsapp.service'
import { WhatsAppProcessor } from './whatsapp.processor'
import { BotModule } from '../bot/bot.module'
import { ConversationsModule } from '../conversations/conversations.module'
import { LeadsModule } from '../leads/leads.module'
import { Session, SessionSchema } from './schemas/session.schema'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Session.name, schema: SessionSchema }]),
    BullModule.registerQueue({ name: 'whatsapp' }),
    BotModule,
    ConversationsModule,
    LeadsModule,
  ],
  controllers: [WhatsAppController],
  providers: [WhatsAppService, WhatsAppProcessor],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
