import { describe, expect, it } from 'vitest'
import {
  AppError,
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from './AppError.js'

describe('Classes de Erro da Aplicação', () => {
  it('deve instanciar AppError com status padrão 400', () => {
    const error = new AppError('Erro genérico')
    expect(error.message).toBe('Erro genérico')
    expect(error.statusCode).toBe(400)
    expect(error).toBeInstanceOf(Error)
  })

  it('deve instanciar NotFoundError com status 404', () => {
    const error = new NotFoundError('Item não encontrado')
    expect(error.message).toBe('Item não encontrado')
    expect(error.statusCode).toBe(404)
  })

  it('deve instanciar BusinessRuleError com status 422', () => {
    const error = new BusinessRuleError('Obra inativa não pode receber áreas')
    expect(error.message).toBe('Obra inativa não pode receber áreas')
    expect(error.statusCode).toBe(422)
  })

  it('deve instanciar UnauthorizedError com status 401', () => {
    const error = new UnauthorizedError()
    expect(error.message).toBe('Não autorizado ou credenciais inválidas')
    expect(error.statusCode).toBe(401)
  })

  it('deve instanciar ForbiddenError com status 403', () => {
    const error = new ForbiddenError()
    expect(error.message).toBe('Acesso negado para este perfil de usuário')
    expect(error.statusCode).toBe(403)
  })

  it('deve instanciar ConflictError com status 409', () => {
    const error = new ConflictError('Código já cadastrado')
    expect(error.message).toBe('Código já cadastrado')
    expect(error.statusCode).toBe(409)
  })
})
