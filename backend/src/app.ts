import fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { env } from './config/env.js'
import { setupSwagger } from './config/swagger.js'
import { errorHandler } from './shared/middlewares/errorHandler.js'
import { healthRoutes } from './modules/health/health.routes.js'

export async function buildApp() {
  const app = fastify({
    logger: env.NODE_ENV === 'test' ? false : true,
    bodyLimit: 1048576, // Limite de 1MB para mitigar ataques DoS
  })

  // 1. Headers de Segurança (Helmet)
  await app.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === 'production',
  })

  // 2. CORS Restritivo
  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  })

  // 3. Rate Limit Global (100 req/min por IP)
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })

  // 4. Documentação OpenAPI/Swagger
  await setupSwagger(app)

  // 5. Tratamento de Erros Global Padronizado
  app.setErrorHandler(errorHandler)

  // 6. Registro de Rotas (prefixo /api)
  await app.register(healthRoutes, { prefix: '/api' })

  return app
}
