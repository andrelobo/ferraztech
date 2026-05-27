import { Module } from '@nestjs/common'
import { BotService } from './bot.service'
import { ConversationsModule } from '../conversations/conversations.module'

@Module({
  imports: [ConversationsModule],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}
