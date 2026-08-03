import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { HealthModule } from './modules/health/health.module'
import { LeadsModule } from './modules/leads/leads.module'
import { ConversationsModule } from './modules/conversations/conversations.module'
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module'
import { BotModule } from './modules/bot/bot.module'
import { AuthModule } from './modules/auth/auth.module'
import { SeedModule } from './seed/seed.module'
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),
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
    AuthModule,
    SeedModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
  ],
})
export class AppModule {}
