import { describe, it, expect, vi } from 'vitest'
import api from './api'

describe('api service', () => {
  it('should export an axios instance', () => {
    expect(api).toBeDefined()
    expect(api.defaults.baseURL).toBe('/api')
  })

  it('should include Content-Type header', () => {
    expect(api.defaults.headers['Content-Type']).toBe('application/json')
  })
})
