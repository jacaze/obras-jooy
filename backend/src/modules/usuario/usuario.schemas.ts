import { z } from 'zod'
import { PerfilUsuario } from '@prisma/client'

export const loginSchema = z.object({
  login: z.string({ required_error: 'O login e obrigatorio' }).trim().min(1, 'Login nao pode ser vazio'),
  senha: z.string({ required_error: 'A senha e obrigatoria' }).min(1, 'Senha nao pode ser vazia'),
})

export const criarUsuarioSchema = z.object({
  nome: z
    .string({ required_error: 'O nome e obrigatorio' })
    .min(3, 'O nome deve ter no minimo 3 caracteres')
    .max(120, 'O nome deve ter no maximo 120 caracteres')
    .trim(),
  login: z
    .string({ required_error: 'O login e obrigatorio' })
    .min(3, 'O login deve ter no minimo 3 caracteres')
    .max(60, 'O login deve ter no maximo 60 caracteres')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Login deve conter apenas letras, numeros, ponto, sublinhado ou hifen')
    .trim()
    .toLowerCase(),
  senha: z
    .string({ required_error: 'A senha e obrigatoria' })
    .min(6, 'A senha deve possuir no minimo 6 caracteres'),
  perfil: z.nativeEnum(PerfilUsuario, {
    errorMap: () => ({ message: 'Perfil de usuario invalido' }),
  }),
  cargoId: z
    .string({ required_error: 'O cargo e obrigatorio' })
    .uuid('Identificador do cargo invalido'),
})

export const resetarSenhaSchema = z.object({
  novaSenha: z
    .string({ required_error: 'A nova senha e obrigatoria' })
    .min(6, 'A nova senha deve possuir no minimo 6 caracteres'),
})

export const atualizarSituacaoUsuarioSchema = z.object({
  ativo: z.boolean({ required_error: 'A situacao ativa (true/false) e obrigatoria' }),
})

export const atualizarUsuarioSchema = z.object({
  nome: z
    .string()
    .min(3, 'O nome deve ter no minimo 3 caracteres')
    .max(120, 'O nome deve ter no maximo 120 caracteres')
    .trim()
    .optional(),
  login: z
    .string()
    .min(3, 'O login deve ter no minimo 3 caracteres')
    .max(60, 'O login deve ter no maximo 60 caracteres')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Login deve conter apenas letras, numeros, ponto, sublinhado ou hifen')
    .trim()
    .toLowerCase()
    .optional(),
  perfil: z
    .nativeEnum(PerfilUsuario, {
      errorMap: () => ({ message: 'Perfil de usuario invalido' }),
    })
    .optional(),
  cargoId: z
    .string()
    .uuid('Identificador do cargo invalido')
    .optional(),
})
