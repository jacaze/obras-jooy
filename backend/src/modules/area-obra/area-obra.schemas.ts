import { z } from 'zod'

export const criarAreaObraSchema = z.object({
  nome: z
    .string({ required_error: 'O nome da area e obrigatorio' })
    .trim()
    .min(2, 'O nome da area deve ter no minimo 2 caracteres')
    .max(80, 'O nome da area deve ter no maximo 80 caracteres'),
  ordem: z
    .number({ invalid_type_error: 'A ordem deve ser um numero inteiro' })
    .int('A ordem deve ser um numero inteiro')
    .default(0),
})

export const atualizarAreaObraSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, 'O nome da area deve ter no minimo 2 caracteres')
    .max(80, 'O nome da area deve ter no maximo 80 caracteres')
    .optional(),
  ordem: z
    .number({ invalid_type_error: 'A ordem deve ser um numero inteiro' })
    .int('A ordem deve ser um numero inteiro')
    .optional(),
})

export const atualizarSituacaoAreaObraSchema = z.object({
  ativa: z.boolean({ required_error: 'A situacao da area e obrigatoria' }),
})

export const listarAreasQuerySchema = z.object({
  somenteAtivas: z
    .string()
    .optional()
    .transform((val) => val !== 'false'),
})
