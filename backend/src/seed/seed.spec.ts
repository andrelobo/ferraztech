import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { getModelToken } from '@nestjs/mongoose'
import { SeedService } from './seed.service'
import { User } from '../modules/auth/schemas/user.schema'

const mockUserModel = {
  findOne: jest.fn(),
  create: jest.fn(),
}

describe('SeedService', () => {
  let service: SeedService

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                ADMIN_EMAIL: 'admin@ferraztech.com',
                ADMIN_PASSWORD: 'admin123',
              }
              return config[key]
            }),
          },
        },
      ],
    }).compile()

    service = module.get<SeedService>(SeedService)
  })

  it('should create admin user when none exists', async () => {
    const mockExec = jest.fn().mockResolvedValue(null)
    mockUserModel.findOne.mockReturnValue({ exec: mockExec })

    await service.onApplicationBootstrap()

    expect(mockUserModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'admin@ferraztech.com',
        name: 'Admin',
      }),
    )
  })

  it('should not create admin user when one already exists', async () => {
    const mockExec = jest.fn().mockResolvedValue({ _id: 'existing-id' })
    mockUserModel.findOne.mockReturnValue({ exec: mockExec })

    await service.onApplicationBootstrap()

    expect(mockUserModel.create).not.toHaveBeenCalled()
  })
})
