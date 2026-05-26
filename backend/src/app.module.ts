import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'
import { HealthModule } from './modules/health/health.module'
import { LeadsModule } from './modules/leads/leads.module'
import { ConversationsModule } from './modules/conversations/conversations.module'
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module'
import { BotModule } from './modules/bot/bot.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI || ''),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
    HealthModule,
    LeadsModule,
    ConversationsModule,
    WhatsAppModule,
    BotModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
