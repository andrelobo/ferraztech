import { NestFactory } from '@nestjs/core'
import { Logger, ValidationPipe } from '@nestjs/common'
import helmet from 'helmet'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
    rawBody: true,
  })
  const logger = new Logger('Bootstrap')

  app.use(helmet())

  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  })

  app.setGlobalPrefix('api')

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  const port = process.env.PORT || 3000
  await app.listen(port)
  logger.log(`🚀 FerrazTech API rodando na porta ${port}`)
  logger.log(`🌍 CORS liberado para: ${process.env.CORS_ORIGIN || '*'}`)
  logger.log(`🧪 Ambiente: ${process.env.NODE_ENV || 'development'}`)
  logger.log('📡 Observabilidade HTTP ativa com logs de request/response')
}
bootstrap()
