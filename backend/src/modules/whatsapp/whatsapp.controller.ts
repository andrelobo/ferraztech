import { Controller, Get, Post, Body } from '@nestjs/common'
import { WhatsAppService } from './whatsapp.service'

@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Get('status')
  getStatus() {
    return this.whatsappService.getStatus()
  }

  @Post('send-message')
  sendMessage(@Body() body: { to: string; message: string }) {
    return this.whatsappService.sendMessage(body.to, body.message)
  }
}
