import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Res,
  NotFoundException,
  Logger,
} from '@nestjs/common'
import { Response } from 'express'
import { WhatsAppService } from './whatsapp.service'
import { ConversationsService } from '../conversations/conversations.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import * as QRCode from 'qrcode'

@Controller('whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name)

  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly conversationsService: ConversationsService,
  ) {}

  @Get('qr')
  async getQR(@Query('session') sessionId: string, @Res() res: Response) {
    this.logger.log(`📲 QR solicitado para session=${sessionId || 'auto'}`)
    const status = this.whatsappService.getStatus()
    const session = (sessionId
      ? status.sessions.find((s) => s.id === sessionId)
      : null) || status.sessions.find((s) => s.qrCode) || status.sessions[0]
    if (!session || !session.qrCode) {
      throw new NotFoundException('QR code not available')
    }
    try {
      const png = await QRCode.toBuffer(session.qrCode, { width: 400, margin: 2 })
      res.setHeader('Content-Type', 'image/png')
      res.send(png)
    } catch (err) {
      this.logger.error('💥 Erro ao gerar QR code', err instanceof Error ? err.stack : undefined)
      throw err
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('status')
  getStatus() {
    return this.whatsappService.getStatus()
  }

  @UseGuards(JwtAuthGuard)
  @Post('send-message')
  sendMessage(@Body() body: { to: string; message: string }) {
    this.logger.log(`✉️ Envio manual solicitado para ${body.to}`)
    return this.whatsappService.sendMessage(body.to, body.message)
  }

  @UseGuards(JwtAuthGuard)
  @Get('conversations/:phone/messages')
  getMessages(@Param('phone') phone: string) {
    this.logger.log(`🗂️ Histórico solicitado para ${phone}`)
    return this.conversationsService.getMessages(phone)
  }
}
