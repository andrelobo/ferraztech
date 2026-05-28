import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Logger,
} from '@nestjs/common'
import { of, throwError, lastValueFrom } from 'rxjs'
import {
  RequestLoggingInterceptor,
  summarizeForLog,
} from './request-logging.interceptor'

describe('RequestLoggingInterceptor', () => {
  let interceptor: RequestLoggingInterceptor
  let logSpy: jest.SpyInstance
  let errorSpy: jest.SpyInstance

  beforeEach(() => {
    interceptor = new RequestLoggingInterceptor()
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation()
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation()
  })

  afterEach(() => {
    logSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it('summarizes payloads without leaking values', () => {
    expect(summarizeForLog('body', { email: 'user@test.com', password: 'secret' })).toBe(
      ' body=keys(email,password)',
    )
    expect(summarizeForLog('query', ['a', 'b'])).toBe(' query=array(len=2)')
    expect(summarizeForLog('result', 'ok')).toBe(' result=string(len=2)')
  })

  it('logs incoming and completed requests', async () => {
    const request = {
      method: 'POST',
      originalUrl: '/api/auth/login',
      url: '/api/auth/login',
      ip: '127.0.0.1',
      query: {},
      body: { email: 'user@test.com', password: 'secret' },
    }
    const response = { statusCode: 201 }
    const context = createHttpExecutionContext(request, response)

    await lastValueFrom(
      interceptor.intercept(context, {
        handle: () => of({ access_token: 'super-secret-token' }),
      } as CallHandler),
    )

    expect(logSpy).toHaveBeenCalledTimes(2)
    expect(logSpy.mock.calls[0][0]).toContain('📥')
    expect(logSpy.mock.calls[0][0]).toContain('POST /api/auth/login')
    expect(logSpy.mock.calls[0][0]).toContain('body=keys(email,password)')
    expect(logSpy.mock.calls[0][0]).not.toContain('secret')
    expect(logSpy.mock.calls[1][0]).toContain('📤')
    expect(logSpy.mock.calls[1][0]).toContain('201')
    expect(logSpy.mock.calls[1][0]).toContain('result=keys(access_token)')
    expect(logSpy.mock.calls[1][0]).not.toContain('super-secret-token')
  })

  it('logs failed requests with status code', async () => {
    const request = {
      method: 'GET',
      originalUrl: '/api/leads',
      url: '/api/leads',
      ip: '127.0.0.1',
      query: { status: 'new' },
      body: undefined,
    }
    const response = { statusCode: 400 }
    const context = createHttpExecutionContext(request, response)

    await expect(
      lastValueFrom(
        interceptor.intercept(context, {
          handle: () =>
            throwError(() => new BadRequestException('Filtro inválido')),
        } as CallHandler),
      ),
    ).rejects.toThrow(BadRequestException)

    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy.mock.calls[0][0]).toContain('💥')
    expect(errorSpy.mock.calls[0][0]).toContain('GET /api/leads')
    expect(errorSpy.mock.calls[0][0]).toContain('400')
    expect(errorSpy.mock.calls[0][0]).toContain('Filtro inválido')
  })
})

function createHttpExecutionContext(request: unknown, response: unknown): ExecutionContext {
  return {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
      getNext: () => undefined,
    }),
  } as ExecutionContext
}
