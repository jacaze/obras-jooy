import { z } from 'zod'

export const StatusFerramentaEnum = z.enum(['DISPONIVEL', 'EMPRESTADO', 'COM_DEFEITO'])

export const criarFerramentaSchema = z.object({
  codigo: z
    .string()
    .min(1, 'O codigo de identificacao da ferramenta e obrigatorio')
    .max(50, 'O codigo deve ter no maximo 50 caracteres')
    .trim()
    .toUpperCase(),
  nome: z
    .string()
    .min(2, 'O nome da ferramenta deve ter no minimo 2 caracteres')
    .max(120, 'O nome da ferramenta deve ter no maximo 120 caracteres')
    .trim(),
  status: StatusFerramentaEnum.default('DISPONIVEL'),
  emprestadoParaId: z.string().uuid('ID de usuario invalido').nullable().optional(),
  ativo: z.boolean().default(true),
})

export const atualizarFerramentaSchema = z.object({
  nome: z
    .string()
    .min(2, 'O nome da ferramenta deve ter no minimo 2 caracteres')
    .max(120, 'O nome da ferramenta deve ter no maximo 120 caracteres')
    .trim()
    .optional(),
  status: StatusFerramentaEnum.optional(),
  emprestadoParaId: z.string().uuid('ID de usuario invalido').nullable().optional(),
  ativo: z.boolean().optional(),
})

export const registrarEmprestimoSchema = z.object({
  usuarioId: z.string().uuid('Selecione o usuario que esta retirando a ferramenta'),
})

export const registrarDevolucaoSchema = z.object({
  comDefeito: z.boolean().default(false),
})

export const listarFerramentasQuerySchema = z.object({
  busca: z.string().optional(),
  status: StatusFerramentaEnum.optional(),
  somenteAtivas: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true'),
})
