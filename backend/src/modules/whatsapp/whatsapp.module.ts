import { Module } from '@nestjs/common'
import { WhatsAppController } from './whatsapp.controller'
import { WhatsAppWebhookController } from './whatsapp-webhook.controller'
import { WhatsAppService } from './whatsapp.service'
import { GatewayClientService } from './gateway-client.service'
import { BotModule } from '../bot/bot.module'
import { ConversationsModule } from '../conversations/conversations.module'
import { LeadsModule } from '../leads/leads.module'

@Module({
  imports: [BotModule, ConversationsModule, LeadsModule],
  controllers: [WhatsAppController, WhatsAppWebhookController],
  providers: [WhatsAppService, GatewayClientService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
