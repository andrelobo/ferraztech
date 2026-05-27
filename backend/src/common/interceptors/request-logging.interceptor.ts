import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { Observable, throwError } from 'rxjs'
import { catchError, tap } from 'rxjs/operators'

type RequestUser = {
  email?: string
  sub?: string
}

type RequestWithUser = Request & {
  user?: RequestUser
}

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP')

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle()
    }

    const http = context.switchToHttp()
    const request = http.getRequest<RequestWithUser>()
    const response = http.getResponse<Response>()
    const requestId = randomUUID().slice(0, 8)
    const startedAt = Date.now()
    const path = request.originalUrl || request.url
    const ip = request.ip || request.socket?.remoteAddress || 'unknown'
    const user = request.user?.email || request.user?.sub

    this.logger.log(
      `📥 [${requestId}] ${request.method} ${path} ip=${ip}` +
        `${user ? ` user=${user}` : ''}` +
        `${summarizeForLog('query', request.query)}` +
        `${summarizeForLog('body', request.body)}`,
    )

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startedAt
        this.logger.log(
          `📤 [${requestId}] ${request.method} ${path} ${response.statusCode} ${duration}ms` +
            `${summarizeForLog('result', data)}`,
        )
      }),
      catchError((error: unknown) => {
        const duration = Date.now() - startedAt
        const statusCode = getStatusCode(error)
        const message = getErrorMessage(error)
        const stack = error instanceof Error ? error.stack : undefined

        this.logger.error(
          `💥 [${requestId}] ${request.method} ${path} ${statusCode} ${duration}ms error=${message}`,
          stack,
        )

        return throwError(() => error)
      }),
    )
  }
}

export function summarizeForLog(label: string, value: unknown): string {
  if (value === undefined || value === null) {
    return ''
  }

  if (Array.isArray(value)) {
    return ` ${label}=array(len=${value.length})`
  }

  if (typeof value === 'string') {
    return ` ${label}=string(len=${value.length})`
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return ` ${label}=${String(value)}`
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>)
    if (keys.length === 0) {
      return ` ${label}=object(empty)`
    }

    return ` ${label}=keys(${keys.slice(0, 6).join(',')})`
  }

  return ` ${label}=${typeof value}`
}

function getStatusCode(error: unknown): number {
  if (
    typeof error === 'object' &&
    error !== null &&
    'getStatus' in error &&
    typeof error.getStatus === 'function'
  ) {
    return error.getStatus()
  }

  return 500
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return 'Erro desconhecido'
}
