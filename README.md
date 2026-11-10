# Obras Jooy - Gestão de Almoxarifado e Canteiro de Obras

Sistema web progressivo (PWA) de alta disponibilidade voltado para o controle de insumos, equipamentos, ferramentas com cautela e requisições de materiais em canteiros de obras da Construtora Jooy.

---

## Sumário

- [Visão Geral](#visão-geral)
- [Arquitetura e Tecnologias](#arquitetura-e-tecnologias)
- [Funcionalidades Principais](#funcionalidades-principais)
- [Perfis de Acesso (RBAC)](#perfis-de-acesso-rbac)
- [Credenciais Padrão do Seed](#credenciais-padrão-do-seed)
- [Estrutura do Repositório](#estrutura-do-repositório)
- [Como Executar Localmente](#como-executar-localmente)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Testes Automatizados e Qualidade](#testes-automatizados-e-qualidade)
- [Implantação em Produção (Render)](#implantação-em-produção-render)

---

## Visão Geral

O projeto resolve o fluxo operacional entre o escritório, o almoxarifado central e a frente de serviço no canteiro:
- Elimina perdas e desvios de materiais através de controle rigoroso de saldo e livro-razão de movimentações.
- Permite que o encarregado realize pedidos de materiais diretamente pelo celular, mesmo quando estiver em subsolos ou áreas sem cobertura de internet (Offline First via Service Workers e IndexedDB).
- Garante a integridade de ferramentas elétricas e equipamentos por meio de cautela digital com checklist de teste obrigatório na entrega e devolução.
- Integração e exportação de dados analíticos para conferência com ERPs de construção (SIENGE).

---

## Arquitetura e Tecnologias

### Back-end
- **Runtime**: Node.js 20+ com TypeScript (ESM)
- **Framework Web**: Fastify (alto desempenho e baixo overhead de memória)
- **ORM / Banco de Dados**: Prisma ORM com PostgreSQL 16
- **Segurança**: Autenticação stateless com JWT (`@fastify/jwt`), hash criptográfico de senhas com `bcryptjs`, proteção contra DoS via `@fastify/rate-limit` e cabeçalhos seguros via `@fastify/helmet`
- **Validação e Tipagem**: Zod (validação estrita de contratos de entrada e variáveis de ambiente)
- **Documentação de API**: Swagger / OpenAPI 3.0 via `@fastify/swagger` e `@fastify/swagger-ui`

### Front-end
- **Framework**: React 18 com TypeScript e Vite
- **PWA (Progressive Web App)**: `vite-plugin-pwa` e `workbox` (cache de assets estáticos e suporte a instalação no dispositivo)
- **Offline Storage**: IndexedDB com Web Crypto API nativa (SHA-256 + salt exclusivo por aparelho para autenticação local offline)
- **Gerenciamento de Estado de Rede**: TanStack Query (React Query) com invalidação reativa e cache resiliente
- **Estilização**: Tailwind CSS com Design System Stitch WCAG 8pt-grid (paleta baseada em canteiro moderno com suporte a tema claro e escuro)
- **Roteamento**: React Router v6 com rotas protegidas por perfil

---

## Funcionalidades Principais

1. **Gestão de Obras, Torres e Áreas (Setores / Pavimentos)**:
   - Cadastro estruturado de empreendimentos, pavimentos e etapas de execução.
   - Bloqueio de requisições para áreas ou etapas inativas.

2. **Catálogo de Materiais e Insumos**:
   - Cadastro com código de referência, código SIENGE, unidade de medida de consumo e categoria.
   - Conversão e rastreabilidade total de especificações.

3. **Livro-Razão e Controle de Estoque**:
   - Saldo em tempo real por obra e almoxarifado.
   - Registro de entradas, saídas, baixas de requisição e estornos auditáveis.
   - Inserção de itens ao estoque com componente de busca e filtro pesquisável dinâmico.

4. **Requisições de Obra e Atendimento**:
   - Envio de pedidos pelo encarregado selecionando a obra travada e o pavimento de destino.
   - Fila de atendimento no almoxarifado com conferência de quantidade entregue e identificação do recebedor na obra.
   - Exportação de dados de consumo para integração com SIENGE.

5. **Cautela e Controle de Ferramentas**:
   - Cadastro de patrimônio, código, marca e número de série de ferramentas ativas.
   - Empréstimo com validação de teste de funcionamento obrigatório na entrega.
   - Devolução exclusiva pelo almoxarife com verificação de integridade no retorno.

6. **PWA e Modo Offline**:
   - Aplicação instalável na tela inicial do celular ou tablet.
   - Autenticação local offline caso a conexão caia durante a operação.
   - Sincronização em segundo plano das requisições criadas sem internet.

7. **Feature Flags e Modularidade**:
   - Módulo de Orçamento de Obra isolado via variável de ambiente (`FEATURE_ORCAMENTO_ENABLED` / `VITE_FEATURE_ORCAMENTO`), mantendo o código preservado para reativação sob demanda.
   - Painel de acesso rápido de demonstração isolado da tela de login para produção (`VITE_EXIBIR_ACESSO_RAPIDO_TESTE`).

---

## Perfis de Acesso (RBAC)

O sistema opera com 5 perfis hierárquicos e segmentados:

- **ADMIN**: Acesso total, gerenciamento de usuários, permissões, parâmetros e auditoria.
- **ALMOXARIFE**: Controle físico de estoque, entradas, atendimento no balcão e cautela de ferramentas.
- **ENCARREGADO**: Operação móvel de canteiro focada exclusivamente nas requisições da sua obra e pavimento.
- **ENGENHARIA**: Acompanhamento analítico de consumos, relatórios e auditoria técnica.
- **ADMINISTRACAO**: Auditoria fiscal, relatórios e exportações.

---

## Credenciais Padrão do Seed

Na inicialização do banco de dados (`seed`), são criados usuários padrão para cada papel:

| Perfil | Nome | Login | Senha Padrão |
| :--- | :--- | :--- | :--- |
| **ADMIN** | Administrador do Sistema | `admin` | `admin123456` |
| **ALMOXARIFE** | Maria Silva (Almoxarife) | `almoxarife` | `admin123456` |
| **ENCARREGADO** | Marcos Oliveira (Encarregado) | `encarregado` | `admin123456` |
| **ENGENHARIA** | Carlos Mendes (Engenheiro) | `engenharia` | `admin123456` |
| **ADMINISTRACAO** | Ana Paula (Administração) | `administracao` | `admin123456` |

---

## Estrutura do Repositório

```text
obras-jooy/
├── backend/                  # Servidor de API Fastify + Prisma ORM
│   ├── prisma/               # Schema relacional, migrations e seed inicial
│   ├── src/
│   │   ├── config/           # Validadores de ambiente Zod, rotas e swagger
│   │   ├── modules/          # Modulos de negocio (usuario, obra, material, estoque, etc.)
│   │   └── shared/           # Middlewares de seguranca e tratamento global de erros
│   └── package.json
│
├── frontend/                 # Aplicacao PWA React + Vite
│   ├── src/
│   │   ├── api/              # Cliente HTTP Axios com interceptors de JWT
│   │   ├── components/       # Componentes de interface e navegacao
│   │   ├── config/           # Feature flags da aplicacao
│   │   ├── contexts/         # Provedores de contexto (Autenticacao e Sessao)
│   │   ├── pages/            # Telas da aplicacao (Login, Home, Requisicoes, Estoque, etc.)
│   │   ├── services/         # Storage offline com hash criptografico nativo
│   │   └── types/            # Contratos de tipos TypeScript
│   └── package.json
│
├── docker-compose.yml        # PostgreSQL 16 para desenvolvimento local
├── render.yaml               # Infrastructure as Code para deploy no Render
└── README.md
```

---

## Como Executar Localmente

### Pré-requisitos
- Node.js 20 ou superior
- Docker e Docker Compose instalados

### Passo a Passo

1. **Clonar o Repositório**:
   ```bash
   git clone https://github.com/jacaze/obras-jooy.git
   cd obras-jooy
   ```

2. **Subir o Banco de Dados via Docker**:
   ```bash
   docker compose up -d
   ```

3. **Configurar e Iniciar o Back-end**:
   ```bash
   cd backend
   cp .env.example .env
   npm install
   npx prisma migrate dev
   npx prisma db seed
   npm run dev
   ```
   *A API estará acessível em `http://localhost:8080/api` e a documentação Swagger em `http://localhost:8080/docs`.*

4. **Configurar e Iniciar o Front-end**:
   ```bash
   cd ../frontend
   cp .env.example .env
   npm install
   npm run dev
   ```
   *O front-end estará acessível em `http://localhost:5173`.*

---

## Variáveis de Ambiente

### Back-end (`backend/.env`)

| Variável | Padrão Local | Descrição |
| :--- | :--- | :--- |
| `NODE_ENV` | `development` | Ambiente de execução (`development`, `test`, `production`) |
| `PORT` | `8080` | Porta onde o Fastify escuta requisições |
| `HOST` | `0.0.0.0` | Endereço de vinculação de rede |
| `DATABASE_URL` | `postgresql://almox:senha@localhost:5433/almoxarifado` | String de conexão com o PostgreSQL |
| `JWT_SECRET` | *(string de 32+ caracteres)* | Segredo para assinatura de tokens JWT |
| `JWT_EXPIRES_IN` | `8h` | Tempo de validade da sessão |
| `CORS_ORIGIN` | `http://localhost:5173` | Origens autorizadas a se comunicar com a API |
| `ADMIN_LOGIN` | `admin` | Login do usuário administrador do seed |
| `ADMIN_PASSWORD` | `admin123456` | Senha inicial do administrador |
| `FEATURE_ORCAMENTO_ENABLED` | `false` | Ativação do módulo opcional de orçamento de obra |

### Front-end (`frontend/.env`)

| Variável | Padrão Local | Descrição |
| :--- | :--- | :--- |
| `VITE_API_URL` | *(vazio)* | URL da API em produção. Vazio utiliza o proxy local `/api` |
| `VITE_FEATURE_ORCAMENTO` | `false` | Exibição de telas e menus do módulo de orçamento |
| `VITE_EXIBIR_ACESSO_RAPIDO_TESTE` | `false` | Exibição de botões de login rápido na tela inicial |

---

## Testes Automatizados e Qualidade

O projeto adota uma política de testes automatizados com cobertura unitária, de integração e de componentes:

### Executando os Testes do Back-end
```bash
npm --prefix backend test
```
- Total: 129 testes automatizados cobrindo autenticação, regras de estoque, concorrência, cautela de ferramentas e permissões de perfil.

### Executando os Testes do Front-end
```bash
npm --prefix frontend test
```
- Total: 83 testes automatizados cobrindo renderização condicional por perfil, validação de formulários, persistência offline e roteamento seguro.

---

## Implantação em Produção (Render)

O repositório já inclui o arquivo `render.yaml` preparado para implantação automatizada (Blueprint) no Render com:
1. **Banco de Dados**: Render Managed PostgreSQL (`obras-jooy-db`).
2. **Back-end Web Service**: Container Fastify com migrations automáticas (`npm run build` e `prisma migrate deploy`).
3. **Front-end Static Site**: SPA React Vite com redirecionamento de rotas para `index.html`.
