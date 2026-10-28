# Esqueleto e Arquitetura do Projeto

**Sistema de Almoxarifado para Canteiros de Obras (JOOY Construtora)**  
**Estrutura de Repositório:** Monorepo (`backend/`, `frontend/`, `documentos/`)

---

## 1. Visão Geral da Arquitetura

O sistema adota uma **Clean Architecture Pragmática** combinada com **Domain-Driven Design (DDD)** modular:

```
[ Cliente HTTP / Front-end React ]
               │
               ▼
   [ Fastify / Express Router ]        <-- Camada de Apresentação (HTTP)
               │ (validação Zod)
               ▼
      [ Controller / Handler ]
               │
               ▼
     [ Caso de Uso (Use Case) ]        <-- Camada de Aplicação (@Application)
        │                   │
        │                   ▼
        │            [ Regras de Domínio ]  <-- Camada de Domínio (Entidades/Value Objects)
        ▼
[ Interface de Repositório (Port) ]
        ▲
        │
[ Repositório Prisma (Adapter) ]       <-- Camada de Infraestrutura (@Infrastructure)
        │
        ▼
   [ PostgreSQL 16 ]
```

---

## 2. Árvore de Diretórios do Monorepo

```
obras-jooy/
├── .gitignore                      # Regras globais de exclusão do Git
├── docker-compose.yml              # PostgreSQL 16 na porta 5433
├── .env.example                    # Modelo de variáveis de ambiente
├── README.md                       # Apresentação do projeto e inicialização
│
├── documentos/                     # Instruções, arquitetura e planos
│   ├── INSTRUCOES_AGENTES.md       # Regras de atuação para IAs e devs
│   ├── ESQUELETO_PROJETO.md        # Este arquivo (arquitetura e estrutura)
│   └── PLANO_DESENVOLVIMENTO_NODE.md # Cronograma de tasks e regras de negócio
│
├── backend/                        # API Node.js + TypeScript + Prisma
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   ├── prisma/
│   │   ├── schema.prisma           # Modelagem declarativa do banco de dados
│   │   ├── seed.ts                 # Criação do usuário ADMIN inicial e dados base
│   │   └── migrations/             # Histórico versionado de migrações SQL
│   └── src/
│       ├── server.ts               # Inicialização do servidor HTTP (porta 8080)
│       ├── app.ts                  # Registro de plugins, middlewares e rotas
│       ├── config/                 # Variáveis de ambiente validadas, JWT e Swagger
│       │   ├── env.ts              # Validação do process.env com Zod
│       │   ├── jwt.ts              # Configurações de assinatura/expiração
│       │   └── swagger.ts          # Configuração OpenAPI/Swagger
│       ├── shared/                 # Recursos compartilhados entre módulos
│       │   ├── errors/             # AppError, NotFoundError, BusinessRuleError
│       │   ├── middlewares/        # Autenticação JWT, autorização por perfil (RBAC)
│       │   ├── database/           # Instância única do PrismaClient
│       │   └── utils/              # Funções utilitárias (datas, formatadores)
│       └── modules/                # Módulos de domínio desacoplados
│           ├── usuario/
│           ├── obra/
│           ├── material/
│           ├── estoque/
│           ├── recebimento/
│           ├── requisicao/
│           ├── limite/
│           ├── ferramenta/
│           ├── cadastros/
│           └── relatorio/
│               │
│               # Estrutura interna de cada módulo:
│               ├── domain/         # Entidades puras, Enums e Interfaces (Portas)
│               ├── use-cases/      # Implementação dos fluxos de negócio
│               ├── repositories/   # Implementação concreta via Prisma
│               └── http/           # Schemas Zod, Controllers e Rotas Fastify
│
└── frontend/                       # SPA React + TypeScript + Vite
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts              # Proxy reverso /api -> http://localhost:8080
    ├── index.html
    └── src/
        ├── api/                    # Cliente Axios configurado e interceptors
        ├── assets/                 # Imagens, logos e ícones
        ├── components/             # Componentes de UI reutilizáveis (botões, inputs, modais)
        ├── contexts/               # AuthContext, ObraAtualContext
        ├── hooks/                  # useAuth, useObraAtual, useDebounce
        ├── layouts/                # Layout base (sidebar, header, container)
        ├── routes/                 # ProtectedRoute, AppRoutes
        ├── types/                  # Tipos TypeScript compartilhados
        └── pages/                  # Telas da aplicação
            ├── Login/
            ├── Home/
            ├── Usuarios/
            ├── Obras/
            ├── Materiais/
            ├── Estoque/
            ├── Requisicoes/
            └── Ferramentas/
```

---

## 3. Decisões Tecnológicas do Back-end

| Componente | Tecnologia | Justificativa |
|---|---|---|
| **Linguagem** | TypeScript 5.x | Tipagem estática fim a fim, reduzindo erros em tempo de execução. |
| **Runtime** | Node.js (20 ou 22 LTS) | Ecossistema maduro, unificação de linguagem com o front-end. |
| **Framework HTTP** | Fastify | Alta performance, baixo overhead, validação de schema nativa e facilidade para Server-Sent Events (SSE) futuro. |
| **ORM / Migrations** | Prisma ORM | Modelagem tipada, migrations SQL seguras e geradas automaticamente (`prisma migrate`), suporte robusto a transações. |
| **Validação de Dados** | Zod | Schemas declarativos para payloads, parâmetros e variáveis de ambiente com geração automática de tipos TS. |
| **Autenticação** | JWT HS256 (@fastify/jwt) | Stateless, seguro e compatível com as regras de perfil do canteiro. |
| **Criptografia** | bcryptjs / argon2 | Hash seguro de senhas no cadastro e login. |
| **Documentação API** | @fastify/swagger + Swagger UI | OpenAPI interativo em `/api/docs`. |
| **Testes** | Vitest + Supertest | Execução ultra-rápida, compatível com TypeScript nativo e fácil mock. |

---

## 4. Regras de Camadas e Convivência

1. **Isolamento de Domínio:** O código em `domain/` não conhece o Prisma, o Fastify ou qualquer detalhe de infraestrutura.
2. **Dependência Invertida:** Os casos de uso dependem de **interfaces** de repositório (ex.: `MaterialRepository`), nunca da implementação concreta do Prisma.
3. **Comunicação Inter-Módulos:** Referências entre agregados de módulos distintos ocorrem **apenas por ID** (`obraId: string`), sem relacionamentos acoplados em cascata entre módulos.
4. **Tratamento de Exceções Centralizado:** Erros de negócio lançam classes customizadas (`BusinessRuleError`, `NotFoundError`). Um middleware interceptor global formata a saída HTTP padronizada.
5. **Transações Críticas:** Operações que alteram saldo de estoque e criam movimentação no livro-razão obrigatoriamente utilizam `prisma.$transaction()`, garantindo consistência atômica.
