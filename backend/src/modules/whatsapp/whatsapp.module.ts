import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { WhatsAppController } from './whatsapp.controller'
import { WhatsAppService } from './whatsapp.service'
import { BotModule } from '../bot/bot.module'
import { ConversationsModule } from '../conversations/conversations.module'
import { LeadsModule } from '../leads/leads.module'
import { Session, SessionSchema } from './schemas/session.schema'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Session.name, schema: SessionSchema }]),
    BotModule,
    ConversationsModule,
    LeadsModule,
  ],
  controllers: [WhatsAppController],
  providers: [WhatsAppService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
