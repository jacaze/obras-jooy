export class AppError extends Error {
  public readonly statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.statusCode = statusCode
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado') {
    super(message, 404)
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string) {
    super(message, 422)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Não autorizado ou credenciais inválidas') {
    super(message, 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acesso negado para este perfil de usuário') {
    super(message, 403)
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Registro conflitante ou já existente') {
    super(message, 409)
  }
}
