import { Controller, Get, Param } from '@nestjs/common'
import { ConversationsService } from './conversations.service'

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
