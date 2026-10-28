import dotenv from 'dotenv'
import path from 'node:path'
import { z } from 'zod'

// Carrega o arquivo .env da raiz do monorepo (ou local se existir)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })
dotenv.config()

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(8080),
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().url().default('postgresql://almox:sua_senha_segura_do_banco_aqui@localhost:5433/almoxarifado?schema=public'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve possuir no mínimo 32 caracteres').default('chave_secreta_padrao_minimo_32_caracteres_dev'),
  JWT_EXPIRES_IN: z.string().default('8h'),
})

const _env = envSchema.safeParse(process.env)

if (!_env.success) {
  console.error('❌ Erro de validação das variáveis de ambiente:')
  console.error(JSON.stringify(_env.error.format(), null, 2))
  process.exit(1)
}

export const env = _env.data
