import { z } from 'zod'

export const TipoControleMaterialEnum = z.enum(['CONSUMO', 'FERRAMENTA_PATRIMONIO'])

// Schemas de Categoria
export const criarCategoriaSchema = z.object({
  nome: z
    .string()
    .min(2, 'O nome da categoria deve ter no minimo 2 caracteres')
    .max(80, 'O nome da categoria deve ter no maximo 80 caracteres')
    .trim(),
})

export const atualizarCategoriaSchema = z.object({
  nome: z
    .string()
    .min(2, 'O nome da categoria deve ter no minimo 2 caracteres')
    .max(80, 'O nome da categoria deve ter no maximo 80 caracteres')
    .trim(),
})

// Schemas de Unidade de Medida
export const criarUnidadeMedidaSchema = z.object({
  sigla: z
    .string()
    .min(1, 'A sigla e obrigatoria')
    .max(10, 'A sigla deve ter no maximo 10 caracteres')
    .trim()
    .toUpperCase(),
  descricao: z
    .string()
    .min(2, 'A descricao deve ter no minimo 2 caracteres')
    .max(60, 'A descricao deve ter no maximo 60 caracteres')
    .trim(),
})

export const atualizarUnidadeMedidaSchema = z.object({
  descricao: z
    .string()
    .min(2, 'A descricao deve ter no minimo 2 caracteres')
    .max(60, 'A descricao deve ter no maximo 60 caracteres')
    .trim(),
})

// Schemas de Material
export const criarMaterialSchema = z.object({
  codigo: z
    .string()
    .min(1, 'O codigo e obrigatorio')
    .max(50, 'O codigo deve ter no maximo 50 caracteres')
    .trim()
    .toUpperCase(),
  descricao: z
    .string()
    .min(3, 'A descricao deve ter no minimo 3 caracteres')
    .max(180, 'A descricao deve ter no maximo 180 caracteres')
    .trim(),
  categoriaId: z.string().uuid('ID da categoria invalido'),
  tipoControle: TipoControleMaterialEnum.default('CONSUMO'),
  unidadeCompraId: z.string().uuid('ID da unidade de compra invalido'),
  unidadeConsumoId: z.string().uuid('ID da unidade de consumo invalido'),
  fatorConversao: z
    .number()
    .positive('O fator de conversao deve ser maior que zero')
    .default(1.0),
  ehKit: z.boolean().default(false),
  exigeTesteQualidade: z.boolean().default(false),
  ativo: z.boolean().default(true),
})

export const atualizarMaterialSchema = z.object({
  descricao: z
    .string()
    .min(3, 'A descricao deve ter no minimo 3 caracteres')
    .max(180, 'A descricao deve ter no maximo 180 caracteres')
    .trim()
    .optional(),
  categoriaId: z.string().uuid('ID da categoria invalido').optional(),
  tipoControle: TipoControleMaterialEnum.optional(),
  unidadeCompraId: z.string().uuid('ID da unidade de compra invalido').optional(),
  unidadeConsumoId: z.string().uuid('ID da unidade de consumo invalido').optional(),
  fatorConversao: z
    .number()
    .positive('O fator de conversao deve ser maior que zero')
    .optional(),
  ehKit: z.boolean().optional(),
  exigeTesteQualidade: z.boolean().optional(),
  ativo: z.boolean().optional(),
})

export const atualizarSituacaoMaterialSchema = z.object({
  ativo: z.boolean({ required_error: 'O status ativo e obrigatorio' }),
})

export const listarMateriaisQuerySchema = z.object({
  busca: z.string().optional(),
  categoriaId: z.string().uuid().optional(),
  tipoControle: TipoControleMaterialEnum.optional(),
  somenteAtivos: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true'),
})
