import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
import { HealthController } from './health.controller'
import { HealthService } from './health.service'

describe('HealthModule', () => {
  let controller: HealthController
  let service: HealthService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test') },
        },
      ],
    }).compile()

    controller = module.get<HealthController>(HealthController)
    service = module.get<HealthService>(HealthService)
  })

  describe('HealthService', () => {
    it('should return status ok with uptime and environment', () => {
      const result = service.check()
      expect(result).toHaveProperty('status', 'ok')
      expect(result).toHaveProperty('timestamp')
      expect(result).toHaveProperty('uptime')
      expect(result).toHaveProperty('environment', 'test')
      expect(typeof result.uptime).toBe('number')
    })
  })

  describe('HealthController', () => {
    it('should return health check via endpoint', () => {
      const result = controller.check()
      expect(result).toHaveProperty('status', 'ok')
    })
  })
})
