import { Injectable, Logger } from '@nestjs/common'
import { ConversationsService } from '../conversations/conversations.service'

interface IncomingMessage {
  from: string
  body: string
  name: string
}

interface BotReply {
  reply: string
  action?: string
}

interface ProcessMessageOptions {
  isNewContact?: boolean
}

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name)

  constructor(
    private readonly conversationsService: ConversationsService,
  ) {}

  async processMessage(
    msg: IncomingMessage,
    options: ProcessMessageOptions = {},
  ): Promise<BotReply> {
    if (options.isNewContact) {
      this.logger.log(`👋 Novo contato sinalizado externamente para ${msg.from}`)
      return this.handleNewContact(msg)
    }

    const conversation = await this.conversationsService.findByPhone(msg.from)

    if (!conversation) {
      return this.handleNewContact(msg)
    }

    const messages = await this.conversationsService.getMessages(msg.from)
    const botReplies = messages.filter((message) => message.role === 'bot')
    const lastBotReply = [...botReplies].reverse()[0]

    if (botReplies.length === 0) {
      return this.handleNewContact(msg)
    }

    if (
      lastBotReply &&
      this.isImeiRequestReply(lastBotReply.content) &&
      this.containsImei(msg.body)
    ) {
      return this.buildImeiReceivedReply()
    }

    if (lastBotReply && this.isImeiRequestReply(lastBotReply.content)) {
      return this.buildImeiReminderReply()
    }

    return this.buildImeiRequestReply()
  }

  private async handleNewContact(_msg: IncomingMessage): Promise<BotReply> {
    return {
      reply:
        `Olá! Seja bem-vindo à *Ferraz Tech*.\n\n` +
        `Vou te ajudar com o desbloqueio do seu telefone.\n\n` +
        `Me conta, por favor: qual é a sua dúvida ou o que aconteceu com o aparelho?`,
    }
  }

  private buildImeiRequestReply(): BotReply {
    return {
      reply:
        `Perfeito. A próxima etapa será com o atendimento humano.\n\n` +
        `Para adiantar o seu serviço, envie o *IMEI* do telefone por aqui.\n\n` +
        `Se precisar localizar, confira a informação na *bandeja do chip* (gavetinha do chip).\n\n` +
        `Em alguns iPhones mais novos, que usam *chip virtual*, essa consulta pode precisar da orientação do nosso time.\n\n` +
        `Se não conseguir localizar agora, aguarde até *3 minutos* que o atendimento humano vai te orientar.`,
    }
  }

  private buildImeiReceivedReply(): BotReply {
    return {
      reply:
        `Recebi o *IMEI* e já deixei essa etapa encaminhada para o atendimento humano.\n\n` +
        `Agora é só aguardar: nosso atendimento costuma responder em até *3 minutos*.`,
    }
  }

  private buildImeiReminderReply(): BotReply {
    return {
      reply:
        `Ainda estou aguardando o *IMEI* do telefone para adiantar o seu atendimento.\n\n` +
        `Se conseguir, confira na *bandeja do chip* (gavetinha do chip).\n\n` +
        `Se o iPhone usar *chip virtual*, aguarde até *3 minutos* que o atendimento humano vai te orientar.`,
    }
  }

  private isImeiRequestReply(content: string): boolean {
    return content.includes('envie o *IMEI* do telefone')
  }

  private containsImei(content: string): boolean {
    const digitsOnly = content.replace(/\D/g, '')

    if (digitsOnly.length === 15) {
      return true
    }

    return content
      .split(/[^0-9]+/)
      .filter(Boolean)
      .some((chunk) => chunk.length === 15)
  }
}
