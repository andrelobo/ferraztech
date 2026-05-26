import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Job } from 'bullmq'
import { Logger } from '@nestjs/common'
import { WhatsAppService } from './whatsapp.service'

@Processor('whatsapp')
export class WhatsAppProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsAppProcessor.name)

  constructor(private whatsappService: WhatsAppService) {
    super()
  }

  async process(job: Job<{ to: string; message: string }>): Promise<any> {
    this.logger.log(`Processing queued message to ${job.data.to}`)

    const result = await this.whatsappService.sendMessage(
      job.data.to,
      job.data.message,
    )

    if (result.queued) {
      this.logger.warn(
        `Message to ${job.data.to} still queued, will retry`,
      )
      throw new Error('Still no connected session')
    }

    return result
  }
}
