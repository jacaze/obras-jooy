import { z } from 'zod'
import { TipoMovimentacao } from '@prisma/client'

export const criarLocalEstoqueSchema = z.object({
  obraId: z
    .string({ required_error: 'A obra e obrigatoria' })
    .uuid('Identificador da obra invalido'),
  nome: z
    .string({ required_error: 'O nome do local de estoque e obrigatorio' })
    .trim()
    .min(3, 'O nome do local deve ter no minimo 3 caracteres')
    .max(80, 'O nome do local deve ter no maximo 80 caracteres'),
})

export const idLocalParamSchema = z.object({
  id: z.string().uuid('Identificador do local de estoque invalido'),
})

export const atualizarSituacaoLocalSchema = z.object({
  ativo: z.boolean({ required_error: 'O campo ativo e obrigatorio' }),
})

export const filtrosLocalEstoqueSchema = z.object({
  obraId: z.string().uuid('Identificador da obra invalido').optional(),
  somenteAtivos: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
})

export const registrarMovimentacaoSchema = z.object({
  localId: z
    .string({ required_error: 'O local de estoque e obrigatorio' })
    .uuid('Identificador do local de estoque invalido'),
  materialId: z
    .string({ required_error: 'O material e obrigatorio' })
    .uuid('Identificador do material invalido'),
  tipo: z.nativeEnum(TipoMovimentacao, {
    errorMap: () => ({ message: 'Tipo de movimentacao de estoque invalido' }),
  }),
  quantidade: z
    .number({
      required_error: 'A quantidade e obrigatoria',
      invalid_type_error: 'A quantidade deve ser um numero valido',
    })
    .positive('A quantidade deve ser maior que zero'),
  usarUnidadeCompra: z.boolean().optional().default(false),
  areaId: z.string().uuid('Identificador da area invalido').optional().nullable(),
  requisicaoId: z.string().uuid('Identificador da requisicao invalido').optional().nullable(),
  observacao: z
    .string()
    .trim()
    .max(255, 'A observacao nao pode exceder 255 caracteres')
    .optional()
    .nullable(),
  chaveIdempotencia: z
    .string()
    .trim()
    .min(1)
    .max(100, 'Chave de idempotencia nao pode exceder 100 caracteres')
    .optional()
    .nullable(),
})

export const filtrosSaldoEstoqueSchema = z.object({
  obraId: z.string().uuid('Identificador da obra invalido').optional(),
  localId: z.string().uuid('Identificador do local invalido').optional(),
  categoriaId: z.string().uuid('Identificador da categoria invalido').optional(),
  busca: z.string().trim().optional(),
})

export const filtrosMovimentacaoSchema = z.object({
  obraId: z.string().uuid('Identificador da obra invalido').optional(),
  localId: z.string().uuid('Identificador do local invalido').optional(),
  materialId: z.string().uuid('Identificador do material invalido').optional(),
  tipo: z.nativeEnum(TipoMovimentacao).optional(),
  limite: z.coerce.number().int().min(1).max(200).optional().default(50),
})
