import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import { ConversationsService } from './conversations.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
  ) {}

  @Get()
  findAll() {
    return this.conversationsService.findAll()
  }

  @Get(':phone')
  findByPhone(@Param('phone') phone: string) {
    return this.conversationsService.findByPhone(phone)
  }

  @Get(':phone/messages')
  getMessages(@Param('phone') phone: string) {
    return this.conversationsService.getMessages(phone)
  }
}
