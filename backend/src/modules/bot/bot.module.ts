import { Module } from '@nestjs/common'
import { BotService } from './bot.service'
import { ConversationsModule } from '../conversations/conversations.module'
import { LeadsModule } from '../leads/leads.module'

@Module({
  imports: [LeadsModule, ConversationsModule],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}
