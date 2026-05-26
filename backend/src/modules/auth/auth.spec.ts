import { Test, TestingModule } from '@nestjs/testing'
import { JwtModule } from '@nestjs/jwt'
import { getModelToken } from '@nestjs/mongoose'
import { ConfigService } from '@nestjs/config'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { User } from './schemas/user.schema'
import * as bcrypt from 'bcrypt'

const mockUser = {
  _id: 'user-id-1',
  email: 'admin@ferraztech.com',
  name: 'Admin',
  password: bcrypt.hashSync('123456', 10),
}

const mockUserModel = {
  findOne: jest.fn(),
  create: jest.fn(),
}

describe('AuthModule', () => {
  let service: AuthService
  let controller: AuthController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '7d' },
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                JWT_SECRET: 'test-secret',
                JWT_EXPIRES_IN: '7d',
              }
              return config[key]
            }),
          },
        },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
    controller = module.get<AuthController>(AuthController)
  })

  afterEach(() => jest.clearAllMocks())

  describe('AuthService', () => {
    it('should return token on valid login', async () => {
      const mockExec = jest.fn().mockResolvedValue(mockUser)
      mockUserModel.findOne.mockReturnValue({ exec: mockExec })
      const result = await service.login({
        email: 'admin@ferraztech.com',
        password: '123456',
      })
      expect(result).toHaveProperty('access_token')
    })

    it('should throw on invalid email', async () => {
      const mockExec = jest.fn().mockResolvedValue(null)
      mockUserModel.findOne.mockReturnValue({ exec: mockExec })
      await expect(
        service.login({
          email: 'wrong@email.com',
          password: '123456',
        }),
      ).rejects.toThrow()
    })

    it('should throw on wrong password', async () => {
      const mockExec = jest.fn().mockResolvedValue(mockUser)
      mockUserModel.findOne.mockReturnValue({ exec: mockExec })
      await expect(
        service.login({
          email: 'admin@ferraztech.com',
          password: 'wrong-password',
        }),
      ).rejects.toThrow()
    })
  })

  describe('AuthController', () => {
    it('should return token via POST /auth/login', async () => {
      jest.spyOn(service, 'login').mockResolvedValue({
        access_token: 'mock-token',
      })
      const result = await controller.login({
        email: 'admin@ferraztech.com',
        password: '123456',
      })
      expect(result).toHaveProperty('access_token', 'mock-token')
    })
  })
})
