import { z } from 'zod'

export const idOrcamentoParamSchema = z.object({
  id: z.string().uuid('Identificador do item de orcamento invalido'),
})

export const filtrosLimitesObraSchema = z.object({
  obraId: z.string().uuid('Identificador da obra invalido').optional(),
})

export const filtrosOrcamentoObraSchema = z.object({
  obraId: z.string().uuid('Identificador da obra invalido').optional(),
  status: z
    .enum(['TODOS', 'ULTRAPASSADO', 'ATENCAO', 'DENTRO_DO_LIMITE'])
    .optional(),
  busca: z.string().trim().optional(),
})

export const criarOrcamentoObraSchema = z.object({
  obraId: z
    .string({ required_error: 'A obra e obrigatoria' })
    .uuid('Identificador da obra invalido'),
  materialId: z
    .string({ required_error: 'O material e obrigatorio' })
    .uuid('Identificador do material invalido'),
  quantidadeOrcada: z
    .number({
      required_error: 'A quantidade orcada (limite) e obrigatoria',
      invalid_type_error: 'A quantidade orcada deve ser um numero valido',
    })
    .positive('A quantidade orcada deve ser maior que zero'),
  observacao: z
    .string()
    .trim()
    .max(255, 'A observacao nao pode exceder 255 caracteres')
    .optional()
    .nullable(),
})

export const atualizarOrcamentoObraSchema = z.object({
  quantidadeOrcada: z
    .number({
      required_error: 'A quantidade orcada (limite) e obrigatoria',
      invalid_type_error: 'A quantidade orcada deve ser um numero valido',
    })
    .positive('A quantidade orcada deve ser maior que zero'),
  observacao: z
    .string()
    .trim()
    .max(255, 'A observacao nao pode exceder 255 caracteres')
    .optional()
    .nullable(),
})
