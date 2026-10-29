import { z } from 'zod'

export const criarObraSchema = z.object({
  codigo: z
    .string({ required_error: 'O codigo da obra e obrigatorio' })
    .trim()
    .min(2, 'O codigo deve ter no minimo 2 caracteres')
    .max(30, 'O codigo deve ter no maximo 30 caracteres')
    .regex(/^[a-zA-Z0-9_-]+$/, 'O codigo deve conter apenas letras, numeros, traco ou sublinhado')
    .transform((val) => val.toUpperCase()),
  nome: z
    .string({ required_error: 'O nome da obra e obrigatorio' })
    .trim()
    .min(3, 'O nome deve ter no minimo 3 caracteres')
    .max(120, 'O nome deve ter no maximo 120 caracteres'),
  cidade: z
    .string({ required_error: 'A cidade da obra e obrigatoria' })
    .trim()
    .min(2, 'A cidade deve ter no minimo 2 caracteres')
    .max(80, 'A cidade deve ter no maximo 80 caracteres'),
})

export const atualizarObraSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(3, 'O nome deve ter no minimo 3 caracteres')
    .max(120, 'O nome deve ter no maximo 120 caracteres')
    .optional(),
  cidade: z
    .string()
    .trim()
    .min(2, 'A cidade deve ter no minimo 2 caracteres')
    .max(80, 'A cidade deve ter no maximo 80 caracteres')
    .optional(),
})

export const atualizarSituacaoObraSchema = z.object({
  ativa: z.boolean({ required_error: 'A situacao da obra e obrigatoria' }),
})

export const listarObrasQuerySchema = z.object({
  somenteAtivas: z
    .string()
    .optional()
    .transform((val) => val !== 'false'),
})
