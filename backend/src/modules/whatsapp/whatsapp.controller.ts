import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common'
import { WhatsAppService } from './whatsapp.service'
import { ConversationsService } from '../conversations/conversations.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@UseGuards(JwtAuthGuard)
@Controller('whatsapp')
export class WhatsAppController {
  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly conversationsService: ConversationsService,
  ) {}

  @Get('status')
  getStatus() {
    return this.whatsappService.getStatus()
  }

  @Post('send-message')
  sendMessage(@Body() body: { to: string; message: string }) {
    return this.whatsappService.sendMessage(body.to, body.message)
  }

  @Get('conversations/:phone/messages')
  getMessages(@Param('phone') phone: string) {
    return this.conversationsService.getMessages(phone)
  }
}
