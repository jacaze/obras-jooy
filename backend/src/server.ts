import { buildApp } from './app.js'
import { env } from './config/env.js'

async function start() {
  const app = await buildApp()

  try {
    const address = await app.listen({
      port: env.PORT,
      host: env.HOST,
    })
    console.log(`Servidor rodando em: ${address}`)
    console.log(`Documentacao Swagger disponivel em: ${address}/api/docs`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
