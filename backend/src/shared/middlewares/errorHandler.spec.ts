import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import fastify, { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { errorHandler } from './errorHandler.js'
import { BusinessRuleError, NotFoundError } from '../errors/AppError.js'

describe('Middleware de Tratamento de Erros (errorHandler)', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = fastify()
    app.setErrorHandler(errorHandler)

    app.get('/test/zod-error', async () => {
      const schema = z.object({
        nome: z.string({ required_error: 'Nome é obrigatório' }),
        quantidade: z.number().positive('Quantidade deve ser positiva'),
      })
      schema.parse({ quantidade: -5 })
    })

    app.get('/test/not-found', async () => {
      throw new NotFoundError('Obra não localizada')
    })

    app.get('/test/business-rule', async () => {
      throw new BusinessRuleError('Saldo insuficiente para separação')
    })

    app.get('/test/unhandled-error', async () => {
      throw new Error('Falha inesperada no driver')
    })

    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('deve formatar ZodError com status 400 e mapeamento de campos', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/test/zod-error',
    })

    expect(response.statusCode).toBe(400)
    const body = JSON.parse(response.body)
    expect(body.erro).toBe('Dados invalidos')
    expect(body.campos).toBeDefined()
    expect(body.campos.nome).toBe('Nome é obrigatório')
    expect(body.campos.quantidade).toBe('Quantidade deve ser positiva')
  })

  it('deve formatar NotFoundError com status 404', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/test/not-found',
    })

    expect(response.statusCode).toBe(404)
    const body = JSON.parse(response.body)
    expect(body.erro).toBe('Obra não localizada')
  })

  it('deve formatar BusinessRuleError com status 422', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/test/business-rule',
    })

    expect(response.statusCode).toBe(422)
    const body = JSON.parse(response.body)
    expect(body.erro).toBe('Saldo insuficiente para separação')
  })

  it('deve mascarar erro inesperado com status 500 sem vazar stack trace', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/test/unhandled-error',
    })

    expect(response.statusCode).toBe(500)
    const body = JSON.parse(response.body)
    expect(body.erro).toBe('Erro interno do servidor')
    expect(body.stack).toBeUndefined()
  })
})
