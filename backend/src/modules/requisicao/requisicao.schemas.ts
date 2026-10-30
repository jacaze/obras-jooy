import { z } from 'zod'
import { StatusRequisicao } from '@prisma/client'

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
  areaId: z.string({ required_error: 'A area de aplicacao da obra e obrigatoria' }).uuid('Identificador da area invalido'),
  observacao: z.string().max(255, 'Observacao nao pode exceder 255 caracteres').optional().nullable(),
  chaveIdempotencia: z.string().max(100).optional().nullable(),
  itens: z
    .array(itemRequisicaoSchema, { required_error: 'A requisicao deve conter itens' })
    .min(1, 'A requisicao deve conter no minimo 1 item'),
})

export const filtrosRequisicaoSchema = z.object({
  status: z.nativeEnum(StatusRequisicao).optional(),
  areaId: z.string().uuid().optional(),
  obraId: z.string().uuid().optional(),
  requisitanteId: z.string().uuid().optional(),
})

export const atualizarStatusRequisicaoSchema = z.object({
  status: z.nativeEnum(StatusRequisicao, {
    errorMap: () => ({ message: 'Status de requisicao invalido' }),
  }),
})
