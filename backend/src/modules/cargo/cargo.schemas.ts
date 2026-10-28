import { z } from 'zod'

export const criarCargoSchema = z.object({
  nome: z
    .string({ required_error: 'O nome do cargo e obrigatorio' })
    .min(2, 'O nome do cargo deve ter no minimo 2 caracteres')
    .max(80, 'O nome do cargo deve ter no maximo 80 caracteres')
    .trim(),
})

export const atualizarSituacaoCargoSchema = z.object({
  ativo: z.boolean({ required_error: 'A situacao ativa (true/false) e obrigatoria' }),
})

export const listarCargosQuerySchema = z.object({
  somenteAtivos: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
})
