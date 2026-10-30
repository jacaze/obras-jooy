import fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import jwt from '@fastify/jwt'
import { env } from './config/env.js'
import { setupSwagger } from './config/swagger.js'
import { errorHandler } from './shared/middlewares/errorHandler.js'
import { healthRoutes } from './modules/health/health.routes.js'
import { cargoRoutes } from './modules/cargo/cargo.routes.js'
import { usuarioRoutes } from './modules/usuario/usuario.routes.js'
import { obraRoutes } from './modules/obra/obra.routes.js'
import { areaObraRoutes } from './modules/area-obra/area-obra.routes.js'
import { materialRoutes } from './modules/material/material.routes.js'
import { ferramentaRoutes } from './modules/ferramenta/ferramenta.routes.js'
import { requisicaoRoutes } from './modules/requisicao/requisicao.routes.js'

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

  // 3. Autenticacao JWT
  await app.register(jwt, {
    secret: env.JWT_SECRET,
  })

  // 4. Rate Limit Global (100 req/min por IP)
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })

  // 5. Documentação OpenAPI/Swagger
  await setupSwagger(app)

  // 6. Tratamento de Erros Global Padronizado
  app.setErrorHandler(errorHandler)

  // 7. Registro de Rotas (prefixo /api)
  await app.register(healthRoutes, { prefix: '/api' })
  await app.register(cargoRoutes, { prefix: '/api' })
  await app.register(usuarioRoutes, { prefix: '/api' })
  await app.register(obraRoutes, { prefix: '/api' })
  await app.register(areaObraRoutes, { prefix: '/api' })
  await app.register(materialRoutes, { prefix: '/api' })
  await app.register(ferramentaRoutes, { prefix: '/api' })
  await app.register(requisicaoRoutes, { prefix: '/api' })

  return app
}
