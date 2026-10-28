import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../../app.js'

describe('Endpoint de Saúde (GET /api/health)', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('deve responder status 200 e payload com status UP', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    })

    expect(response.statusCode).toBe(200)

    const payload = JSON.parse(response.body)
    expect(payload.status).toBe('UP')
    expect(payload.servico).toBe('obras-jooy-backend')
    expect(payload.versao).toBe('1.0.0')
    expect(payload.timestamp).toBeDefined()
    expect(new Date(payload.timestamp).toString()).not.toBe('Invalid Date')
  })

  it('deve ter documentação do Swagger acessível em /api/docs', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/docs',
    })

    // Retorna redirect 302 para /api/docs/ ou 200 com HTML
    expect([200, 302]).toContain(response.statusCode)
  })
})
