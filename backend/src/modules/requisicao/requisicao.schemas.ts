import { z } from 'zod'
import { StatusRequisicao } from '@prisma/client'

export const idRequisicaoParamSchema = z.object({
  id: z.string().uuid('Identificador da requisicao invalido'),
})

export const itemRequisicaoSchema = z
  .object({
    materialId: z.string().uuid('ID do material invalido').optional().nullable(),
    ferramentaId: z.string().uuid('ID da ferramenta invalido').optional().nullable(),
    quantidade: z
      .number({ invalid_type_error: 'A quantidade deve ser um numero valido' })
      .positive('A quantidade deve ser maior que zero')
      .default(1),
  })
  .refine((data) => data.materialId || data.ferramentaId, {
    message: 'Cada item deve indicar um material ou uma ferramenta',
  })
  .refine((data) => !(data.materialId && data.ferramentaId), {
    message: 'Um item nao pode ser material e ferramenta simultaneamente',
  })

export const criarRequisicaoSchema = z.object({
  areaId: z
    .string({ required_error: 'A area de aplicacao da obra e obrigatoria' })
    .uuid('Identificador da area invalido'),
  etapaId: z
    .string({ required_error: 'A etapa de execucao da obra e obrigatoria' })
    .uuid('Identificador da etapa invalido'),
  observacao: z.string().max(255, 'Observacao nao pode exceder 255 caracteres').optional().nullable(),
  chaveIdempotencia: z.string().max(100).optional().nullable(),
  itens: z
    .array(itemRequisicaoSchema, { required_error: 'A requisicao deve conter itens' })
    .min(1, 'A requisicao deve conter no minimo 1 item'),
})

export const filtrosRequisicaoSchema = z.object({
  status: z.nativeEnum(StatusRequisicao).optional(),
  areaId: z.string().uuid().optional(),
  etapaId: z.string().uuid().optional(),
  obraId: z.string().uuid().optional(),
  requisitanteId: z.string().uuid().optional(),
  exportadaSienge: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
})

export const itemAtendimentoSchema = z.object({
  itemId: z.string().uuid('Identificador do item da requisicao invalido'),
  quantidadeEntregue: z
    .number({ invalid_type_error: 'A quantidade entregue deve ser um numero valido' })
    .min(0, 'A quantidade entregue nao pode ser negativa'),
  localId: z.string().uuid('Identificador da locacao de estoque invalido').optional().nullable(),
})

export const atenderRequisicaoSchema = z.object({
  retiradoPor: z
    .string({ required_error: 'O nome de quem esta retirando o material e obrigatorio' })
    .trim()
    .min(2, 'Informe o nome completo ou identificacao de quem retirou (minimo 2 caracteres)')
    .max(120, 'O nome do responsavel pela retirada nao pode exceder 120 caracteres'),
  observacao: z.string().trim().max(255).optional().nullable(),
  itens: z.array(itemAtendimentoSchema).optional(),
})

export const exportarSiengeSchema = z.object({
  requisicaoIds: z.array(z.string().uuid('ID de requisicao invalido')).optional(),
  obraId: z.string().uuid('ID da obra invalido').optional(),
  incluirJaExportadas: z.boolean().optional().default(false),
})
