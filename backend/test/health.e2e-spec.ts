import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { ConfigModule } from '@nestjs/config'
import { HealthController } from '../src/modules/health/health.controller'
import { HealthModule } from '../src/modules/health/health.module'

describe('Health (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        HealthModule,
      ],
    }).compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('bootstraps the health controller and returns the API health payload', async () => {
    const controller = app.get(HealthController)
    const response = controller.check()

    expect(response.status).toBe('ok')
    expect(typeof response.timestamp).toBe('string')
    expect(typeof response.uptime).toBe('number')
  })
})
