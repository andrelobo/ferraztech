import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

export interface GatewaySendResult {
  id: unknown
  status: string
}

export interface GatewayQrResult {
  id: unknown
  state: string
  qr: string | null
}

export interface GatewayTenantSession {
  _id: unknown
  name?: string
  state: string
  qr?: string | null
  phone?: string
  lastSeen?: Date
}

@Injectable()
export class GatewayClientService {
  private readonly logger = new Logger(GatewayClientService.name)
  private readonly baseUrl: string
  private readonly apiKey: string

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = configService.get<string>('GATEWAY_BASE_URL', '')
    this.apiKey = configService.get<string>('GATEWAY_API_KEY', '')
  }

  async sendText(
    sessionId: string,
    to: string,
    text: string,
  ): Promise<GatewaySendResult> {
    return this.request<GatewaySendResult>(`/sessions/${sessionId}/send`, {
      method: 'POST',
      body: JSON.stringify({ to, type: 'text', text }),
    })
  }

  async getQr(sessionId: string): Promise<GatewayQrResult> {
    return this.request<GatewayQrResult>(`/sessions/${sessionId}/qr`, {
      method: 'GET',
    })
  }

  async listTenantSessions(tenantId: string): Promise<GatewayTenantSession[]> {
    return this.request<GatewayTenantSession[]>(
      `/tenants/${tenantId}/sessions`,
      { method: 'GET' },
    )
  }

  private async request<T>(
    path: string,
    init: { method: string; body?: string },
  ): Promise<T> {
    if (!this.baseUrl || !this.apiKey) {
      throw new Error('Gateway não configurado (GATEWAY_BASE_URL/GATEWAY_API_KEY)')
    }

    const url = `${this.baseUrl}${path}`
    const response = await fetch(url, {
      method: init.method,
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        ...(init.body ? { 'content-type': 'application/json' } : {}),
      },
      ...(init.body ? { body: init.body } : {}),
    })

    if (!response.ok) {
      const detail = await this.readError(response)
      throw new Error(`Falha no gateway (${response.status}): ${detail}`)
    }

    return (await response.json()) as T
  }

  private async readError(response: Response): Promise<string> {
    try {
      const body = (await response.json()) as { message?: unknown }
      if (typeof body.message === 'string') {
        return body.message
      }
    } catch {
      // corpo não-JSON — usa o statusText
    }
    return response.statusText || 'erro desconhecido'
  }
}
