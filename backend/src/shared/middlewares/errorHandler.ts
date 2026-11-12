import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'
import { AppError } from '../errors/AppError.js'
import { env } from '../../config/env.js'

export function errorHandler(
  error: FastifyError | Error,
  _request: FastifyRequest,
  reply: FastifyReply
) {
  if (error instanceof ZodError) {
    const campos: Record<string, string> = {}
    const mensagens: string[] = []
    for (const issue of error.issues) {
      const campo = issue.path.join('.') || 'root'
      campos[campo] = issue.message
      mensagens.push(`${campo}: ${issue.message}`)
    }
    return reply.status(400).send({
      erro: 'Dados invalidos',
      mensagem: mensagens.join('. '),
      campos,
    })
  }

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      erro: error.message,
    })
  }

  // Fastify validation errors (e.g., FST_ERR_VALIDATION)
  if ('validation' in error && error.validation) {
    return reply.status(400).send({
      erro: 'Dados invalidos',
      detalhes: error.message,
    })
  }

  console.error('Unhandled Internal Error:', error)

  return reply.status(500).send({
    erro: 'Erro interno do servidor',
  })
}
