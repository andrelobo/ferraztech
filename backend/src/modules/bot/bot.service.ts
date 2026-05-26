import { Injectable, Logger } from '@nestjs/common'
import { ConversationsService } from '../conversations/conversations.service'
import { LeadsService } from '../leads/leads.service'

interface IncomingMessage {
  from: string
  body: string
  name: string
}

interface BotReply {
  reply: string
  action?: string
}

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name)

  constructor(
    private readonly leadsService: LeadsService,
    private readonly conversationsService: ConversationsService,
  ) {}

  async processMessage(msg: IncomingMessage): Promise<BotReply> {
    const conversation = await this.conversationsService.findByPhone(msg.from)

    if (!conversation) {
      return this.handleNewContact(msg)
    }

    return this.processMenuOption(msg.body, msg.from)
  }

  private async handleNewContact(msg: IncomingMessage): Promise<BotReply> {
    await this.leadsService.create({
      name: msg.name,
      phone: msg.from,
      serviceType: 'indefinido',
    })

    return {
      reply:
        `👋 *Bem-vindo à FERRAZTECH!*\n\n` +
        `Olá ${msg.name}, como podemos ajudar?\n\n` +
        `Digite o número da opção desejada:\n\n` +
        `1️⃣ *Consultoria* - soluções personalizadas\n` +
        `2️⃣ *Orçamento* - solicite um orçamento\n` +
        `3️⃣ *Suporte* - fale com nosso time\n` +
        `0️⃣ *Falar com atendente*`,
    }
  }

  async processMenuOption(
    option: string,
    phone: string,
  ): Promise<BotReply> {
    switch (option) {
      case '1':
        return {
          reply:
            `📋 *Consultoria FERRAZTECH*\n\n` +
            `Oferecemos consultoria em:\n\n` +
            `• Automação de processos\n` +
            `• Inteligência Artificial\n` +
            `• Desenvolvimento de sistemas\n\n` +
            `Um de nossos especialistas entrará em contato em breve.`,
          action: 'consultoria',
        }
      case '2':
        return {
          reply:
            `💰 *Solicitar Orçamento*\n\n` +
            `Para gerar um orçamento personalizado, ` +
            `nos informe detalhes sobre seu projeto.\n\n` +
            `Enquanto isso, um consultor já está sendo notificado.`,
          action: 'orcamento',
        }
      case '3':
        return {
          reply:
            `🔧 *Suporte Técnico*\n\n` +
            `Estamos prontos para ajudar!\n\n` +
            `Em breve um técnico entrará em contato.`,
          action: 'suporte',
        }
      case '0':
        return {
          reply:
            `🔄 *Transferindo para atendente...*\n\n` +
            `Por favor, aguarde um momento.`,
          action: 'transferir',
        }
      default:
        return {
          reply:
            `❌ *Opção inválida!*\n\n` +
            `Por favor, digite um número válido:\n\n` +
            `1️⃣ Consultoria\n` +
            `2️⃣ Orçamento\n` +
            `3️⃣ Suporte\n` +
            `0️⃣ Falar com atendente`,
        }
    }
  }
}
