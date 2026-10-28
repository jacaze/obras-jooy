# Plano de Desenvolvimento: Sistema de Almoxarifado de Obras (Node.js + Prisma)

**Projeto:** Sistema de Almoxarifado para Canteiros de Obras (JOOY Construtora + SENAI)  
**Stack de Destino:** Node.js 20+ LTS · TypeScript · Fastify · Prisma ORM · PostgreSQL 16 · React (Vite)  
**Documento de Origem:** `MEMORIA_PROJETO_ALMOXARIFADO.md` (Transposição da stack Java Spring Boot para Node.js)

---

## 1. Visão Geral e Justificativa da Migração

A decisão de migrar o back-end de **Java/Spring Boot** para **Node.js + TypeScript + Prisma** traz benefícios diretos para a equipe e para o cenário operacional da obra:

1. **Unificação da Stack (JavaScript/TypeScript Fullstack):**
   - Elimina a alternância mental entre Java e TypeScript.
   - Compartilhamento de tipagens, schemas de validação (**Zod**) e lógica de validação entre front-end e back-end.
2. **Prisma ORM vs JPA/Hibernate:**
   - Modelagem declarativa e intuitiva em um único arquivo (`schema.prisma`).
   - Migrations em SQL puro e versionado (`prisma migrate dev`), oferecendo total previsibilidade sobre o esquema PostgreSQL.
   - Prevenção do problema de queries ocultas e *N+1* comuns no Hibernate.
   - Concorrência simplificada: facilidade para transações interativas (`prisma.$transaction`) e queries atômicas para disputa de itens no estoque.
3. **Comunicação em Tempo Real Simplificada:**
   - No futuro, a fila de separação do almoxarife se beneficiará de Server-Sent Events (SSE) ou WebSockets para atualização instantânea sem sobrecarga de infraestrutura.
4. **Agilidade no Ambiente Local:**
   - Menor consumo de memória RAM do que a JVM no Windows.
   - Inicialização e reload ultrarrápidos, acelerando o ciclo de desenvolvimento das tasks.

---

## 2. Comparativo de Equivalências de Arquitetura

| Conceito / Recurso | No Spring Boot (Anterior) | No Node.js + Prisma (Atual) |
|---|---|---|
| **Linguagem** | Java 21 | TypeScript 5 (Strict Mode) |
| **Framework HTTP** | Spring Boot 4 / Spring Web | Fastify (alta performance e validação de schema) |
| **Acesso a Dados** | Spring Data JPA + Hibernate | Prisma Client |
| **Migrações de Banco** | Flyway (`V1__...sql`) | Prisma Migrate (`prisma/migrations/`) |
| **Validação de DTOs** | Bean Validation (`@NotBlank`, etc.) | Zod Schemas |
| **Segurança / Autenticação** | Spring Security + Nimbus JWT | `@fastify/jwt` + middlewares customizados de perfil |
| **Documentação da API** | Springdoc OpenAPI (Swagger) | `@fastify/swagger` + `@fastify/swagger-ui` |
| **Injeção de Dependências** | Spring `@Autowired` / Construtor | Inversão de dependência pragmática via construtor ou fábricas |
| **Testes Automatizados** | JUnit 5 + AssertJ | Vitest + Supertest / Fastify Inject |

---

## 3. Modelo de Dados Alvo (`schema.prisma`)

Abaixo está o modelo completo unificado que atende a todas as regras de negócio levantadas com a JOOY:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ----------------------------------------------------
// ENUMS DO DOMÍNIO
// ----------------------------------------------------

enum PerfilUsuario {
  ADMIN
  ALMOXARIFE
  ENGENHARIA
  ADMINISTRACAO
  ENCARREGADO
}

enum TipoControleMaterial {
  CONSUMO
  FERRAMENTA
  EQUIPAMENTO
}

enum PropriedadeAtivo {
  PROPRIA
  ALUGADA
  TERCEIRO
}

enum StatusAtivo {
  DISPONIVEL
  EMPRESTADA
  AGUARDANDO_TESTE
  MANUTENCAO
  DANIFICADA
  PERDIDA
  BAIXADA
}

enum TipoMovimentacao {
  ENTRADA_RECEB
  SAIDA_REQ
  ENTRADA_DEVOL
  SAIDA_TRANSF
  ENTRADA_TRANSF
  AJUSTE_INV
  ESTORNO
}

enum StatusRequisicao {
  SOLICITADA
  EM_SEPARACAO
  PRONTA
  ATENDIDA
  PARCIAL
  CANCELADA
  EXPIRADA
}

enum MomentoTeste {
  SAIDA
  DEVOLUCAO
}

enum ResultadoTeste {
  APROVADO
  REPROVADO
  NAO_APLICAVEL
}

enum TipoEmpresa {
  PROPRIA
  TERCEIRIZADA
  FORNECEDOR
  LOCADORA
}

// ----------------------------------------------------
// TABELAS BASE (T04, T05, T06)
// ----------------------------------------------------

model Usuario {
  id           String        @id @default(uuid()) @db.Uuid
  nome         String        @db.VarChar(120)
  login        String        @unique @db.VarChar(60)
  senhaHash    String        @map("senha_hash") @db.VarChar(255)
  perfil       PerfilUsuario
  ativo        Boolean       @default(true)
  criadoEm     DateTime      @default(now()) @map("criado_em")

  // Relacionamentos operacionais
  movimentacoes MovimentacaoEstoque[]
  testesFeitos  TesteAtivo[]

  @@map("usuario")
}

model Obra {
  id          String     @id @default(uuid()) @db.Uuid
  codigo      String     @unique @db.VarChar(30) // Ex: "OBRA-01", maiúsculas e imutável
  nome        String     @db.VarChar(120)
  ativa       Boolean    @default(true)
  criadaEm    DateTime   @default(now()) @map("criada_em")

  areas       AreaObra[]
  locais      LocalEstoque[]
  limites     LimiteMaterial[]

  @@map("obra")
}

model AreaObra {
  id          String     @id @default(uuid()) @db.Uuid
  obraId      String     @map("obra_id") @db.Uuid
  nome        String     @db.VarChar(80)
  ordem       Int        @default(0) // Negativo para subsolo, 0 para térreo, etc.
  ativa       Boolean    @default(true)
  criadaEm    DateTime   @default(now()) @map("criada_em")

  obra        Obra       @relation(fields: [obraId], references: [id])
  requisicoes Requisicao[]

  @@unique([obraId, nome], name: "area_obra_nome_unico")
  @@map("area_obra")
}

model Empresa {
  id          String      @id @default(uuid()) @db.Uuid
  razaoSocial String      @map("razao_social") @db.VarChar(150)
  cnpj        String?     @unique @db.VarChar(18)
  tipo        TipoEmpresa
  ativa       Boolean     @default(true)
  criadaEm    DateTime    @default(now()) @map("criada_em")

  pessoas     Pessoa[]
  ativos      Ativo[]

  @@map("empresa")
}

model Pessoa {
  id          String       @id @default(uuid()) @db.Uuid
  nome        String       @db.VarChar(120)
  matricula   String?      @db.VarChar(40)
  empresaId   String       @map("empresa_id") @db.Uuid
  ativa       Boolean      @default(true)
  criadaEm    DateTime     @default(now()) @map("criada_em")

  empresa     Empresa      @relation(fields: [empresaId], references: [id])
  emprestimos EmprestimoAtivo[]
  requisicoes Requisicao[]

  @@map("pessoa")
}

// ----------------------------------------------------
// CATÁLOGO DE MATERIAIS (T07)
// ----------------------------------------------------

model UnidadeMedida {
  id          String     @id @default(uuid()) @db.Uuid
  sigla       String     @unique @db.VarChar(10) // un, kg, m3, cx, sc
  descricao   String     @db.VarChar(60)
  grandeza    String     @db.VarChar(40)

  materiaisCompra      Material[] @relation("UnidadeCompra")
  materiaisUtilizacao  Material[] @relation("UnidadeUtilizacao")

  @@map("unidade_medida")
}

model CategoriaMaterial {
  id          String     @id @default(uuid()) @db.Uuid
  nome        String     @unique @db.VarChar(80)

  materiais   Material[]

  @@map("categoria_material")
}

model Material {
  id               String               @id @default(uuid()) @db.Uuid
  codigo           String               @unique @db.VarChar(40) // Código de catálogo Sienge
  descricao        String               @db.VarChar(200)
  categoriaId      String               @map("categoria_id") @db.Uuid
  tipoControle     TipoControleMaterial @map("tipo_controle")
  unCompraId       String               @map("un_compra_id") @db.Uuid
  unUtilizacaoId   String               @map("un_utilizacao_id") @db.Uuid
  fatorConversao   Decimal              @default(1.0) @map("fator_conversao") @db.Decimal(12, 4)
  ehKit            Boolean              @default(false) @map("eh_kit")
  exigeTeste       Boolean              @default(false) @map("exige_teste")
  ativo            Boolean              @default(true)
  criadoEm         DateTime             @default(now()) @map("criado_em")

  categoria        CategoriaMaterial    @relation(fields: [categoriaId], references: [id])
  unidadeCompra    UnidadeMedida        @relation("UnidadeCompra", fields: [unCompraId], references: [id])
  unidadeUtilizacao UnidadeMedida       @relation("UnidadeUtilizacao", fields: [unUtilizacaoId], references: [id])

  saldos           EstoqueSaldo[]
  movimentacoes    MovimentacaoEstoque[]
  parametros       ParametroEstoque[]
  itensRequisicao  RequisicaoItem[]
  ativos           Ativo[]
  limites          LimiteMaterial[]

  @@map("material")
}

// ----------------------------------------------------
// ESTOQUE E LIVRO-RAZÃO (T08, T09, T10)
// ----------------------------------------------------

model LocalEstoque {
  id          String     @id @default(uuid()) @db.Uuid
  obraId      String     @map("obra_id") @db.Uuid
  nome        String     @db.VarChar(80) // Ex: "Almoxarifado Principal - Subsolo 1"
  ativo       Boolean    @default(true)

  obra        Obra       @relation(fields: [obraId], references: [id])
  saldos      EstoqueSaldo[]
  movimentacoes MovimentacaoEstoque[]
  parametros  ParametroEstoque[]

  @@map("local_estoque")
}

model EstoqueSaldo {
  localId     String     @map("local_id") @db.Uuid
  materialId  String     @map("material_id") @db.Uuid
  quantidade  Decimal    @default(0.0) @db.Decimal(12, 4)
  reservado   Decimal    @default(0.0) @db.Decimal(12, 4) // Em processo de separação
  versao      Int        @default(1) // Controle de concorrência otimista

  local       LocalEstoque @relation(fields: [localId], references: [id])
  material    Material     @relation(fields: [materialId], references: [id])

  @@id([localId, materialId])
  @@map("estoque_saldo")
}

model MovimentacaoEstoque {
  id           String           @id @default(uuid()) @db.Uuid // UUID gerado pelo cliente/backend
  localId      String           @map("local_id") @db.Uuid
  materialId   String           @map("material_id") @db.Uuid
  tipo         TipoMovimentacao
  quantidade   Decimal          @db.Decimal(12, 4) // Sempre positiva
  areaId       String?          @map("area_id") @db.Uuid
  requisicaoId String?          @map("requisicao_id") @db.Uuid
  usuarioId    String           @map("usuario_id") @db.Uuid
  estornoDeId  String?          @map("estorno_de_id") @db.Uuid
  observacao   String?          @db.VarChar(255)
  ocorridaEm   DateTime         @map("ocorrida_em") // Data física informada
  registradaEm DateTime         @default(now()) @map("registrada_em")

  local        LocalEstoque     @relation(fields: [localId], references: [id])
  material     Material         @relation(fields: [materialId], references: [id])
  usuario      Usuario          @relation(fields: [usuarioId], references: [id])

  @@map("movimentacao_estoque")
}

model ParametroEstoque {
  localId     String       @map("local_id") @db.Uuid
  materialId  String       @map("material_id") @db.Uuid
  minimo      Decimal      @default(0.0) @db.Decimal(12, 4)
  maximo      Decimal      @default(0.0) @db.Decimal(12, 4)

  local       LocalEstoque @relation(fields: [localId], references: [id])
  material    Material     @relation(fields: [materialId], references: [id])

  @@id([localId, materialId])
  @@map("parametro_estoque")
}

// ----------------------------------------------------
// REQUISIÇÕES E RETIRADAS (T11, T12, T13)
// ----------------------------------------------------

model Requisicao {
  id              String           @id @default(uuid()) @db.Uuid
  numeroSequencial Int             @default(autoincrement()) @map("numero_sequencial")
  areaId          String           @map("area_id") @db.Uuid
  requisitanteId  String           @map("requisitante_id") @db.Uuid
  registradaPorId String           @map("registrada_por_id") @db.Uuid
  status          StatusRequisicao @default(SOLICITADA)
  codigoRetirada  String?          @unique @map("codigo_retirada") @db.VarChar(12)
  chaveIdempotencia String?        @unique @map("chave_idempotencia") @db.VarChar(100)
  necessarioAte   DateTime?        @map("necessario_ate")
  observacao      String?          @db.VarChar(255)
  solicitadaEm    DateTime         @default(now()) @map("solicitada_em")
  prontaEm        DateTime?        @map("pronta_em")
  retiradaEm      DateTime?        @map("retirada_em")

  area            AreaObra         @relation(fields: [areaId], references: [id])
  requisitante    Pessoa           @relation(fields: [requisitanteId], references: [id])
  itens           RequisicaoItem[]

  @@map("requisicao")
}

model RequisicaoItem {
  id            String     @id @default(uuid()) @db.Uuid
  requisicaoId  String     @map("requisicao_id") @db.Uuid
  materialId    String     @map("material_id") @db.Uuid
  qtdSolicitada Decimal    @map("qtd_solicitada") @db.Decimal(12, 4)
  qtdSeparada   Decimal    @default(0.0) @map("qtd_separada") @db.Decimal(12, 4)
  qtdAtendida   Decimal    @default(0.0) @map("qtd_atendida") @db.Decimal(12, 4)
  excedeLimite  Boolean    @default(false) @map("excede_limite")

  requisicao    Requisicao @relation(fields: [requisicaoId], references: [id])
  material      Material   @relation(fields: [materialId], references: [id])

  @@unique([requisicaoId, materialId])
  @@map("requisicao_item")
}

model LimiteMaterial {
  id           String    @id @default(uuid()) @db.Uuid
  obraId       String    @map("obra_id") @db.Uuid
  materialId   String    @map("material_id") @db.Uuid
  areaId       String?   @map("area_id") @db.Uuid
  quantidadeMax Decimal  @map("quantidade_max") @db.Decimal(12, 4)
  criadoEm     DateTime  @default(now()) @map("criado_em")

  obra         Obra      @relation(fields: [obraId], references: [id])
  material     Material  @relation(fields: [materialId], references: [id])

  @@map("limite_material")
}

// ----------------------------------------------------
// GESTÃO DE FERRAMENTAS E ATIVOS (T14, T15, T16)
// ----------------------------------------------------

model Ativo {
  id             String           @id @default(uuid()) @db.Uuid
  materialId     String           @map("material_id") @db.Uuid
  patrimonio     String           @unique @db.VarChar(50)
  serie          String?          @db.VarChar(60)
  propriedade    PropriedadeAtivo
  empresaDonaId  String?          @map("empresa_dona_id") @db.Uuid
  status         StatusAtivo      @default(DISPONIVEL)
  criadoEm       DateTime         @default(now()) @map("criado_em")

  material       Material         @relation(fields: [materialId], references: [id])
  empresaDona    Empresa?         @relation(fields: [empresaDonaId], references: [id])
  emprestimos    EmprestimoAtivo[]
  testes         TesteAtivo[]

  @@map("ativo")
}

model EmprestimoAtivo {
  id              String      @id @default(uuid()) @db.Uuid
  ativoId         String      @map("ativo_id") @db.Uuid
  retiradoPorId   String      @map("retirado_por_id") @db.Uuid
  retiradoEm      DateTime    @default(now()) @map("retirado_em")
  prevDevolucao   DateTime    @map("prev_devolucao")
  devolvidoEm     DateTime?   @map("devolvido_em")
  status          String      @default("EM_USO") @db.VarChar(20) // EM_USO, DEVOLVIDO, PERDIDO

  ativo           Ativo       @relation(fields: [ativoId], references: [id])
  retiradoPor     Pessoa      @relation(fields: [retiradoPorId], references: [id])
  testes          TesteAtivo[]

  @@map("emprestimo_ativo")
}

model TesteAtivo {
  id             String          @id @default(uuid()) @db.Uuid
  ativoId        String          @map("ativo_id") @db.Uuid
  emprestimoId   String?         @map("emprestimo_id") @db.Uuid
  momento        MomentoTeste
  resultado      ResultadoTeste
  observacao     String?         @db.VarChar(255)
  testadoPorId   String          @map("testado_por_id") @db.Uuid
  testadoEm      DateTime        @default(now()) @map("testado_em")

  ativo          Ativo           @relation(fields: [ativoId], references: [id])
  emprestimo     EmprestimoAtivo? @relation(fields: [emprestimoId], references: [id])
  testadoPor     Usuario         @relation(fields: [testadoPorId], references: [id])

  @@map("teste_ativo")
}
```

---

## 4. Roteiro de Tasks Adaptadas (T01 a T20)

### Bloco 1: Infraestrutura e Fundamentos (T01 - T04)

- **T01 — Estrutura Base e Banco de Dados**
  - Configurar Docker Compose com PostgreSQL 16 na porta 5433 (com volume persistente).
  - Criar `.env.example` com placeholders das variáveis (`DATABASE_URL`, `JWT_SECRET`, etc.).
  - Definir scripts no `package.json` raiz para orquestração.
- **T02 — Setup Back-end Node.js / TypeScript com Fastify e Prisma**
  - Inicialização do TypeScript em modo estrito (`tsconfig.json`).
  - Configuração do Fastify com tratamento global de erros (Zod e AppError formatados em JSON).
  - Configuração do Prisma Client e conexão testada com o banco.
  - Endpoint de verificação `/api/health` e documentação OpenAPI Swagger em `/api/docs`.
- **T03 — Setup Front-end React + Vite + TS**
  - Setup do projeto React com Vite 8, React Router e TanStack Query.
  - Configuração do proxy reverso (`/api` para `http://localhost:8080`).
  - Tela inicial com consulta e exibição do status da API.
- **T04 — Autenticação JWT e Gestão de Usuários**
  - Tabela `usuario` via migration Prisma.
  - Script de seed para criação do usuário `admin` inicial caso a tabela esteja vazia.
  - Endpoints: `POST /api/auth/login`, `GET /api/auth/me`, `GET /api/usuarios`, `POST /api/usuarios`.
  - Controle de perfis (RBAC): `ADMIN`, `ALMOXARIFE`, `ENGENHARIA`, `ADMINISTRACAO`, `ENCARREGADO`.
  - Front-end: Tela de Login, contexto `AuthContext`, rotas protegidas por perfil e página de listagem de usuários.

### Bloco 2: Estrutura da Obra e Cadastros Base (T05 - T06)

- **T05 — Cadastro de Obra e Áreas da Obra**
  - Modelos `Obra` e `AreaObra` via Prisma.
  - Regras: Código da obra único e maiúsculo; área pertence à obra; unicidade de nome da área por obra; ordenação por ordem numérica (negativo para subsolo); obra inativa não recebe novas áreas.
  - Endpoints de CRUD com validação Zod e proteção de perfil (apenas ADMIN e ADMINISTRACAO criam/alteram).
- **T06 — Empresas e Pessoas**
  - Modelos `Empresa` e `Pessoa`.
  - Cadastro de fornecedores, empreiteiras terceirizadas e funcionários requisitantes.
  - Validações de CNPJ e inativação lógica (sem exclusão física de registros vinculados).

### Bloco 3: Catálogo de Materiais e Estoque Físico (T07 - T10)

- **T07 — Unidades de Medida, Categorias e Materiais**
  - Modelos `UnidadeMedida`, `CategoriaMaterial` e `Material`.
  - Regra de conversão: Unidade de compra para unidade de utilização com fator de conversão > 0.
  - Código único de catálogo (compatível com Sienge).
  - Front-end: Listagem com filtros e modal de cadastro de materiais.
- **T08 — Estoque Base e Livro-Razão Imutável**
  - Modelos `LocalEstoque`, `EstoqueSaldo` e `MovimentacaoEstoque`.
  - Regra central: A soma das movimentações do livro-razão deve ser identicamente igual ao saldo atual.
  - Concorrência: Trava otimista ou atômica via `prisma.$transaction()` para evitar que duas saídas simultâneas vendam a mesma unidade.
  - Regra de obra: Saída física real no canteiro pode deixar o saldo negativo se necessário (registrando divergência de inventário para auditoria).
- **T09 — Recebimento de Materiais**
  - Fluxo de entrada com ou sem nota de transferência.
  - Conversão automática da quantidade comprada para a quantidade em estoque com base no fator de conversão.
- **T10 — Parâmetros de Estoque e Alertas de Mínimo**
  - Configuração de estoque mínimo e máximo por material em cada almoxarifado.
  - Emissão de avisos visuais no front-end quando o saldo atinge o ponto de reposição.

### Bloco 4: Requisições, Separação e Baixas (T11 - T13)

- **T11 — Requisições de Obra**
  - O encarregado solicita materiais para determinada `AreaObra` pelo celular.
  - Header de idempotência (`Idempotency-Key`) para prevenir requisições duplicadas em conexões instáveis.
  - Isolamento de acesso: O encarregado só visualiza suas próprias requisições.
- **T12 — Atendimento, Separação e Baixa de Estoque**
  - O almoxarife assume a requisição no PC (status `EM_SEPARACAO`).
  - O sistema **reserva** a quantidade necessária no saldo (`disponivel = quantidade - reservado`).
  - Ao concluir a separação, gera um código de retirada de 6 caracteres / QR Code (status `PRONTA`).
  - Na retirada física: conferência do código + crachá do retirante e baixa imediata no estoque.
  - Job automático para cancelar e devolver ao saldo disponível reservas expiradas.
- **T13 — Limites de Consumo por Área**
  - Definição pela Engenharia da cota máxima de cada insumo por pavimento/área.
  - No MVP: Emissão de alerta visual quando a requisição excede a cota prevista.

### Bloco 5: Controle Patrimonial de Ferramentas (T14 - T16)

- **T14 — Cadastro de Ativos e Ferramentas**
  - Controle individual por número de patrimônio / série.
  - Separação entre ferramenta própria, locada (com controle de prazo do contrato) e de terceiros.
- **T15 — Empréstimo e Teste de Saída**
  - Registro de saída com prazo previsto de devolução.
  - Se a ferramenta exigir teste operacional, ela deve ser testada e aprovada na saída antes de ser liberada.
- **T16 — Devolução, Teste Pós-Retorno e Ocorrências**
  - Retorno da ferramenta: status `AGUARDANDO_TESTE`.
  - Teste pós-devolução: se reprovada, é gerada ocorrência de dano vinculada ao empréstimo e a ferramenta é enviada para manutenção.

### Bloco 6: Relatórios, Segurança e Finalização (T17 - T20)

- **T17 — Relatórios e Kardex**
  - Consulta de histórico de movimentações (Kardex) por período e material.
  - Relatório de consumo por pavimento/empresa e ferramentas com devolução em atraso.
- **T18 — Auditoria e Endurecimento**
  - Trilha de auditoria das baixas, estornos e alterações de destino.
  - Limite de tentativas de login por IP/usuário para mitigação de ataques de força bruta.
- **T19 — Testes de Integração Ponta a Ponta**
  - Automação do cenário completo: Solicitação pelo encarregado -> Separação pelo almoxarife -> Retirada e baixa -> Conferência do Kardex.
- **T20 — Documentação Final e Manual de Operação**
  - README final detalhado, diagrama entidade-relacionamento (DER) e guia de implantação.

---

## 5. Invariantes e Regras Críticas a Preservar

1. **Invariante do Livro-Razão:**
   $$ \sum \text{Movimentações}(local, material) = \text{SaldoAtual}(local, material) $$
   Nenhum saldo é alterado sem o correspondente registro no livro-razão dentro da mesma transação `prisma.$transaction()`.
2. **Reserva vs Solicitação:**
   - Solicitar um material **não** abate o saldo disponível.
   - O saldo disponível só é reservado quando o almoxarife clica em "Iniciar Separação".
   - Se o material não for retirado até o prazo de expiração, a reserva é desfeita automaticamente.
3. **Imutabilidade de Cadastros Críticos:**
   - O código de uma obra ou material nunca pode ser editado após a criação (utilizado como referência imutável de integração).
   - Registros vinculados a movimentações nunca são excluídos fisicamente do banco de dados (utilizar flag `ativo = false`).
