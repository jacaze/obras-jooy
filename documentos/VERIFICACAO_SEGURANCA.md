# Checklist e Diretrizes de Segurança da Aplicação

**Projeto:** Sistema de Almoxarifado de Obras (JOOY Construtora + SENAI)  
**Stack:** Node.js · TypeScript · Fastify · Prisma ORM · PostgreSQL · React

Este documento estabelece as verificações e padrões obrigatórios de segurança que **todo agente ou desenvolvedor deve validar** antes de submeter código ou abrir um Pull Request.

---

## 1. Prevenção contra Injeção de Código (SQL Injection & NoSQL Injection)

### 1.1 Regra com Prisma ORM
- **Princípio:** O Prisma utiliza consultas parametrizadas (*prepared statements*) nativamente para todos os métodos de modelo (`findMany`, `create`, `update`, `delete`, etc.). Isso neutraliza SQL Injection por padrão.
- **Proibição Estrita de `$queryRawUnsafe`:**
  - ❌ **Nunca** utilizar `prisma.$queryRawUnsafe("SELECT * FROM ... WHERE id = '" + id + "'")`.
  - ✅ Em caso de necessidade de consulta SQL bruta, utilizar **obrigatoriamente** `prisma.$queryRaw` com tagged templates:
    ```typescript
    // Correto: o Prisma parametriza automaticamente as variáveis no tagged template
    await prisma.$queryRaw`SELECT * FROM material WHERE codigo = ${codigo};`;
    ```
- **Campos de Ordenação Dinâmica (`orderBy`):**
  - Nunca passar strings brutas vindas da query HTTP direto para o `orderBy`.
  - Utilizar uma lista branca (*allowlist*) de campos permitidos validada com Zod.

---

## 2. Rate Limiting e Proteção contra Força Bruta

### 2.1 Implementação com `@fastify/rate-limit`
- **Rate Limit Global:**
  - Limite para todas as rotas da API para mitigar ataques de negação de serviço (DoS) e scraping indevido.
  - Padrão: 100 requisições por minuto por IP.
- **Rate Limit Estrito na Autenticação (`POST /api/auth/login`):**
  - Proteção contra ataques de dicionário e força bruta na quebra de senhas de operários e administradores.
  - Padrão estrito: **máximo de 5 tentativas consecutivas a cada 1 minuto por IP**.
  - Resposta padrão ao exceder: HTTP `429 Too Many Requests` com cabeçalho `Retry-After`.

---

## 3. Política de CORS (Cross-Origin Resource Sharing)

### 3.1 Implementação com `@fastify/cors`
- ❌ **Proibido em produção:** `origin: "*"` permitindo qualquer domínio.
- ✅ **Configuração Restritiva:**
  - Em desenvolvimento local: permitir exclusivamente a origem do front-end Vite (`http://localhost:5173`).
  - Em produção: permitir apenas os domínios homologados da JOOY Construtora.
  - Métodos permitidos restritos: `GET, POST, PUT, PATCH, DELETE, OPTIONS`.
  - Cabeçalhos expostos e permitidos: `Authorization, Content-Type, Idempotency-Key`.
  - Preflight com cache adequado (`maxAge: 86400`).

---

## 4. Proteção de Cabeçalhos HTTP (Security Headers)

### 4.1 Implementação com `@fastify/helmet`
- Ativação obrigatória de cabeçalhos de segurança padrão da indústria:
  - `Content-Security-Policy` (CSP): mitigação de Cross-Site Scripting (XSS).
  - `X-Frame-Options: DENY`: prevenção contra Clickjacking em iframes maliciosos.
  - `X-Content-Type-Options: nosniff`: previne MIME-sniffing de arquivos.
  - `Strict-Transport-Security` (HSTS): força HTTPS em ambientes de produção.
  - `X-XSS-Protection`: filtro adicional contra XSS em navegadores legados.
  - `hidePoweredBy: true`: remove o cabeçalho `X-Powered-By` (não revelar a tecnologia do servidor).

---

## 5. Validação de Entrada e Proteção contra Mass Assignment

### 5.1 Validação Estrita com Zod
- **Toda rota** deve possuir schema Zod validando `body`, `params` e `querystring`.
- **Prevenção de Mass Assignment:**
  - Nunca passar o payload HTTP bruto diretamente para o `prisma.create({ data: req.body })`.
  - O controller deve desestruturar e mapear explicitamente apenas os campos autorizados para aquele caso de uso:
    ```typescript
    // Incorreto
    await prisma.usuario.create({ data: request.body });

    // Correto
    const dadosValidados = criarUsuarioSchema.parse(request.body);
    await criarUsuarioUseCase.executar({
      nome: dadosValidados.nome,
      login: dadosValidados.login,
      senha: dadosValidados.senha,
      perfil: dadosValidados.perfil
    });
    ```
- **Limitação de Payload:**
  - Configurar `bodyLimit` no Fastify (máximo 1MB para requisições JSON padrão) para evitar ataques de estouro de memória.

---

## 6. Autenticação, Autorização e Criptografia de Senhas

### 6.1 Senhas e Hashing
- Utilizar **BCrypt** (`bcryptjs` ou `argon2`) com fator de custo (*salt rounds*) no mínimo igual a **10**.
- **Nunca** armazenar senhas em texto puro.
- **Higienização de DTOs:** O campo `senhaHash` deve ser **estritamente omitido** de qualquer resposta da API ou logs.

### 6.2 Token JWT
- Assinatura com algoritmo seguro **HS256**.
- `JWT_SECRET` obrigatório com entropia alta (mínimo de 32 caracteres gerados aleatoriamente). O sistema deve recusar inicializar se o segredo for fraco ou default.
- Expiração finita e obrigatória (padrão: 8 horas / 480 minutos para o turno de trabalho).
- O payload do JWT deve conter apenas dados não sensíveis: `sub` (ID do usuário), `login`, `nome` e `perfil`.

### 6.3 Controle de Acesso Baseado em Perfis (RBAC)
- Toda rota autenticada deve passar por um middleware `autenticarJwt`.
- Rotas sensíveis devem aplicar o pre-handler `autorizarPerfis(['ADMIN', 'ADMINISTRACAO'])`.
- O encarregado só pode visualizar e cancelar requisições criadas por ele mesmo (autorização por dono de recurso).

---

## 7. Sanitização de Erros e Logs Seguros

1. **Mensagens de Erro Transparentes:**
   - Erros `500 Internal Server Error` nunca devem expor stack traces de banco de dados ou caminhos de arquivos ao cliente final.
   - Mensagem padronizada: `{"erro": "Erro interno do servidor"}`. Detalhes completos devem ser registrados apenas nos logs internos.
2. **Logs Limpos:**
   - Proibido logar cabeçalhos `Authorization`, senhas em texto puro ou payloads completos contendo dados sensíveis.

---

## 8. Checklist de Verificação por Pull Request (Segurança)

Antes de submeter o PR para aprovação, confira:

- [ ] As novas rotas possuem validação de entrada declarativa via Zod?
- [ ] O endpoint de login possui proteção de rate limit ativo?
- [ ] As queries ao banco utilizam o Prisma Client ou `$queryRaw` parametrizado (sem interpolação de strings)?
- [ ] O controle de perfil (RBAC) está ativo nas rotas com perfis autorizados explicitamente?
- [ ] O campo `senhaHash` está excluído de todos os retornos JSON?
- [ ] Nenhum segredo, senha ou chave privada está commitada nos arquivos?
- [ ] Os testes automatizados cobrem cenários de acesso não autenticado (401) e perfil não autorizado (403)?
