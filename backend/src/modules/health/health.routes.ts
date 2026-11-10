import type { FastifyInstance } from 'fastify'

export async function healthRoutes(app: FastifyInstance) {
  app.get(
    '/health',
    {
      schema: {
        tags: ['Saúde da Aplicação'],
        summary: 'Verificação de disponibilidade da API',
        description: 'Retorna o status operacional da API do almoxarifado',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string', example: 'UP' },
              timestamp: { type: 'string', example: '2026-10-27T21:00:00.000Z' },
              servico: { type: 'string', example: 'obras-jooy-backend' },
              versao: { type: 'string', example: '1.0.0' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      return reply.status(200).send({
        status: 'UP',
        timestamp: new Date().toISOString(),
        servico: 'obras-jooy-backend',
        versao: '1.0.0',
      })
    }
  )
}
