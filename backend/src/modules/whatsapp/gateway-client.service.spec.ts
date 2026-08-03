import { ConfigService } from '@nestjs/config'
import { GatewayClientService } from './gateway-client.service'

describe('GatewayClientService', () => {
  let service: GatewayClientService
  let mockFetch: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch = jest.fn()
    global.fetch = mockFetch as unknown as typeof fetch

    service = new GatewayClientService({
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          GATEWAY_BASE_URL: 'http://gateway.local:3002/api',
          GATEWAY_API_KEY: 'api-key-teste',
        }
        return values[key]
      }),
    } as unknown as ConfigService)
  })

  afterAll(() => {
    delete (global as { fetch?: unknown }).fetch
  })

  it('should send a text message via the gateway session', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: jest.fn().mockResolvedValue({ id: 'msg-1', status: 'queued' }),
    })

    const result = await service.sendText('session-1', '5511999999999', 'Olá')

    expect(mockFetch).toHaveBeenCalledWith(
      'http://gateway.local:3002/api/sessions/session-1/send',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: 'Bearer api-key-teste',
          'content-type': 'application/json',
        }),
        body: JSON.stringify({
          to: '5511999999999',
          type: 'text',
          text: 'Olá',
        }),
      }),
    )
    expect(result).toEqual({ id: 'msg-1', status: 'queued' })
  })

  it('should throw a readable error when the gateway rejects the send', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: jest.fn().mockResolvedValue({ message: 'Sessão não encontrada' }),
    })

    await expect(service.sendText('session-1', '5511999999999', 'Olá')).rejects.toThrow(
      'Falha no gateway (400): Sessão não encontrada',
    )
  })

  it('should fetch the current QR of a session', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ id: 'session-1', state: 'qr', qr: 'QR@code' }),
    })

    const result = await service.getQr('session-1')

    expect(mockFetch).toHaveBeenCalledWith(
      'http://gateway.local:3002/api/sessions/session-1/qr',
      expect.objectContaining({ method: 'GET' }),
    )
    expect(result).toEqual({ id: 'session-1', state: 'qr', qr: 'QR@code' })
  })

  it('should list the sessions of a tenant', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue([{ _id: 'session-1', state: 'open' }]),
    })

    const result = await service.listTenantSessions('tenant-1')

    expect(mockFetch).toHaveBeenCalledWith(
      'http://gateway.local:3002/api/tenants/tenant-1/sessions',
      expect.objectContaining({ method: 'GET' }),
    )
    expect(result).toHaveLength(1)
    expect(result[0]).toHaveProperty('state', 'open')
  })
})
