# Memória do projeto: Sistema de Almoxarifado para Obras (JOOY Construtora + SENAI)

Atualizado em: 26/10/2026
Idioma de trabalho: português do Brasil

---

## 0. Como usar este arquivo (leia primeiro)

Este arquivo é o contexto completo para continuar o desenvolvimento em outra ferramenta (Claude Code, Antigravity ou similar). Ele resume tudo o que foi feito, as decisões tomadas, as regras de negócio, o estado real do repositório e o plano completo do que falta.

**Primeiro passo na nova ferramenta:** confirmar o estado real do repositório (seção 15). Alguns itens aqui estão marcados **[a confirmar]**, porque foram feitos no computador do usuário e a confirmação não chegou a ser vista.

**Regra de ouro:** nunca dar um problema por resolvido só porque o código mudou. Mostrar a evidência (teste, log, execução). Registrar o que **não** foi comprovado.

**Segredos:** este arquivo não contém senhas nem chaves. As variáveis de ambiente aparecem só pelo nome.

Índice: 1 Visão geral · 2 Modo de trabalho com o usuário · 3 Stack · 4 Ambiente · 5 Arquitetura · 6 Repositório e Git · 7 Estado atual · 8 Decisões · 9 Domínio e regras de negócio · 10 Modelo de dados alvo · 11 Plano completo · 12 Pontos em aberto · 13 Riscos e dívidas técnicas · 14 Armadilhas já encontradas · 15 Comandos úteis · 16 Próximos passos imediatos · Apêndices

---

## 1. Visão geral

**Projeto:** trabalho em grupo para a **JOOY Construtora**, em parceria com o **SENAI**: entender e propor um sistema web de controle de **almoxarifado/estoque** usado nas obras.

**Problema central:** falta de rastreabilidade entre o que foi pedido, o que saiu fisicamente e o que foi baixado. Hoje o fluxo é: bloco de requisição em papel, retirada do material e baixa **manual** depois (no Sienge). Disso decorrem: saldo que nunca bate com o físico, consumo sem identificação de quem/onde, ferramentas sem responsável, qualquer pessoa pode retirar material, e conectividade ruim no subsolo.

**Posicionamento:** o **Sienge** continua sendo o sistema de registro de compras e custos. Este sistema é a **camada operacional do canteiro**: requisição, retirada, baixa, ferramentas e limites. Ele deve gerar dados limpos que possam alimentar o Sienge no futuro. Não substitui o Sienge.

**Escopo atual:** **uma única obra** da JOOY (a obra é entendida como uma "filial"). A estrutura de dados já prevê várias obras (`obra_id`), mas não se constroem seletor de obra, tela de cadastro de obras nem vínculo usuário-obra por enquanto.

**Quem usa:**

| Usuário | O que faz |
|---|---|
| Almoxarife (usuário principal) | Recebe material, separa pedidos, confere retirada, empresta ferramentas, registra baixas. Trabalha em um PC com rede cabeada no 1º subsolo |
| Encarregado (somente os dos pedreiros terão login) | Pede material para a equipe, pelo celular, informando área da obra e itens |
| Engenharia | Define limites de material e aprova excedentes |
| Administração da obra / Central | Acompanha estoque, divergências e relatórios |
| Administrador do sistema | Cadastros e usuários |
| Demais frentes e terceirizadas | Não têm login: pedem no balcão ou no papel, e o almoxarife registra |

**Levantamento inicial (resumo das anotações com a empresa):**

- A administração normalmente fica no canteiro; em obras pequenas, o estoque pode ficar separado. Existe também uma Administração Central.
- Todos os materiais têm código. Há entrada e saída de materiais.
- O Sienge hoje faz pedidos de compra e controla estoque; as **baixas são manuais**.
- O requisitante preenche um **bloco de requisição**; depois a baixa é lançada à mão. Há diferentes blocos, e **cada empresa terceirizada tem o seu**.
- Ferramentas precisam ser devolvidas; é preciso registrar quem retirou, horário de saída e de devolução. Quando volta inteira, volta ao estoque.
- Hoje qualquer pessoa pode pegar determinadas ferramentas e materiais. Não existe reserva eletrônica.
- Limites de quantidade por área de atuação serão definidos pela engenharia (a estrutura deve existir, mas os valores vêm depois).
- Equipamentos **alugados** têm controle separado dos próprios. Alguns terceirizados têm ferramentas próprias.
- Alguns materiais chegam de outra loja/unidade **sem nota de transferência** (a ideia da empresa é deixá-los fora do estoque).
- A requisição deve identificar a **área onde o material será usado** e o **requisitante** (principalmente se for terceiro).
- Controle por **pavimento**; também se falou em **ciclo de concretagem** (decisão adiada para a engenharia).
- Na área elétrica há armazéns de **kits** já montados.
- Desejo de funcionar **sem internet** e sincronizar depois: o almoxarife fica no subsolo (futuro estacionamento), onde o celular não pega bem, mas há um PC com Wi-Fi cabeado. As baixas são feitas nesse PC.
- Unidades: algumas compras em unidade diferente da de uso; materiais medidos em m³, un e kg.
- QR Code para solicitação do encarregado: melhoria futura.

---

## 2. Modo de trabalho com o usuário (instruções para a IA)

O usuário é **estudante** e quer **aprender engenharia de software sem escrever manualmente a maior parte do código**. A IA implementa; o usuário executa, avalia e orienta. Combinado:

1. **Postura:** engenheiro de software sênior que usa IA.
2. Antes de mudanças importantes: explicar o problema, o plano, a arquitetura e o fluxo de dados (arquivos e componentes envolvidos).
3. Ao concluir: resumo das mudanças e das decisões técnicas.
4. **Comparar alternativas** em decisões arquiteturais (vantagens, desvantagens, consequências).
5. Apontar riscos de **segurança, desempenho, manutenção e confiabilidade**.
6. **Validar com evidência** (testes, logs, execução). Mostrar como foi validado. Registrar o que não foi comprovado.
7. Para correções de defeitos: ritual **vermelho e depois verde** (o teste falha sem a correção e passa com ela).
8. Fazer **perguntas curtas** de entendimento no fim das respostas, sem exigir código como resposta. Se o usuário não souber, explicar com um exemplo do projeto.
9. **Explicações curtas e diretas** (o usuário pediu para resumir). Sem aulas teóricas longas.
10. Avançar **por blocos** dentro de cada task, sem reenviar código já enviado.
11. Sempre que indicar para subir código (push/PR), enviar junto o **texto do Pull Request** (título e descrição).
12. **Um PR por parte de uma task** (por exemplo, obra e área da obra em PRs separados).
13. Nos textos de PR: seções "O que foi feito", "Como testar", "Evidências" (com `[x]` **somente** no que foi provado) e "Riscos e observações".
14. O usuário roda os comandos e traz a saída. Se a nova ferramenta puder rodar comandos, continue pedindo evidências equivalentes (saídas coladas no chat).
15. Nunca incluir segredos em respostas, commits ou arquivos versionados.

---

## 3. Stack e versões

**Back-end** (`backend/`)

| Item | Versão / detalhe |
|---|---|
| Java | 21 (projeto). A IDE às vezes rodou com 25: alinhar a configuração de execução para 21 |
| Spring Boot | **4.0.8** (Spring Framework 7.0.9, Spring Security 7.0.7, Hibernate 7.2.24) |
| Banco | PostgreSQL 16 (Docker) |
| Migrations | Flyway 11.14.1 (`ddl-auto: validate`; o Flyway é dono do esquema) |
| Segurança | Spring Security, JWT HS256 com Nimbus (starter `spring-boot-starter-security-oauth2-resource-server`), BCrypt |
| Documentação | springdoc-openapi **3.0.3** (a série 3.x é a do Boot 4; a 3.0.1 não era compatível com Boot 4.1) |
| Outros | Lombok, Bean Validation, Spring Data JPA, DevTools |
| Testes | JUnit 5 + AssertJ (via starters do Spring Boot). **Sem** JUnit 4 e **sem** TestNG |
| Build | Maven Wrapper (`mvnw`) |

**Front-end** (`frontend/`)

React + TypeScript (template Vite 8), React Router, TanStack Query, Axios, react-hook-form + zod + @hookform/resolvers, lint com **oxlint**, build com `tsc -b && vite build`. Node 20.19+ ou 22 LTS.

**Infra:** Docker Compose (só o PostgreSQL por enquanto), monorepo Git/GitHub.

**Portas:** front 5173 (proxy `/api` para o back), back 8080, banco **5433** (mapeada para 5432 no container, para evitar conflito com um PostgreSQL local).

---

## 4. Ambiente do usuário

- Windows, **PowerShell 5.1** no terminal do IntelliJ; IntelliJ IDEA Community (back-end) e VS Code (front-end); DBeaver; Docker Desktop (precisa estar aberto).
- **Variáveis de ambiente** (arquivo `.env` na raiz, **nunca versionado**; `.env.example` versionado com placeholders):
  `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT` (5433), `JWT_SECRET` (mínimo de 32 caracteres), `JWT_EXPIRATION_MINUTES` (padrão 480), `ADMIN_LOGIN`, `ADMIN_PASSWORD`, `DB_HOST` (opcional, padrão localhost).
- O `application.yml` importa o `.env` por `spring.config.import` (`../.env` e `./.env`).
- **Admin inicial:** o `AdminInitializer` cria o usuário `ADMIN` na primeira execução (tabela `usuario` vazia e `ADMIN_PASSWORD` definido).
- Usuário de teste usado nas validações: `maria` (perfil ALMOXARIFE), criada pela API pelo admin.

---

## 5. Arquitetura

**Clean Architecture pragmática** (por módulo e, dentro dele, por camada). A entidade do domínio **tem as anotações JPA** (sem entidade JPA separada e sem mapper). A porta (interface do repositório) fica no domínio, e o repositório Spring Data a implementa diretamente.

```
backend/src/main/java/br/com/almoxarifado/
  BackendApplication.java
  config/        SecurityConfig, JwtConfig, OpenApiConfig
  shared/
    domain/        BusinessRuleException, NotFoundException
    presentation/  GlobalExceptionHandler, HealthController
  usuario/  obra/  material/  estoque/  recebimento/  requisicao/
  limite/  ferramenta/  cadastros/  relatorio/
    domain/          entidades (@Entity) + regras + portas (interfaces)
    application/     casos de uso (uma classe por ação, @Service)
    infrastructure/  repositório JPA que implementa a porta, JWT etc.
    presentation/    controllers e DTOs (records)
```

**Regras de convivência (seguir sempre):**

1. Dependências apontam para dentro: `presentation -> application -> domain`; `infrastructure -> domain`. O `domain` não importa Spring (exceto `jakarta.persistence`) nem camadas externas.
2. **Controller só chama casos de uso.** Nunca injeta repositório e nunca devolve entidade (sempre um DTO `record`).
3. **Um caso de uso por ação**, com `@Transactional` (`readOnly = true` nas consultas).
4. Regra que envolve **uma só entidade** vai dentro da entidade (métodos com nome de negócio: `inativar()`, `renomear()`). Regra que envolve vários agregados fica no caso de uso.
5. IDs são `UUID` gerados no construtor da entidade (sem `@GeneratedValue`), o que prepara a idempotência e o offline.
6. **Entre módulos, referenciar por ID** (`UUID obraId`), nunca por `@ManyToOne` entre módulos. A chave estrangeira existe no banco.
7. Um módulo só usa o `application` ou o `domain` de outro, nunca o `infrastructure`.
8. **Nunca excluir** cadastros usados: campo `ativo`/`ativa`; chaves estrangeiras restritivas.
9. Unicidade: validar no caso de uso (mensagem amigável, 422) **e** garantir com restrição/índice no banco (a violação vira 409).
10. Timestamps: `Instant.now().truncatedTo(ChronoUnit.MICROS)` (o Postgres guarda microssegundos; evita POST e GET com valores diferentes). Tokens: truncados em segundos.
11. Sem `@Data` do Lombok em entidades; sem `@Setter` público (usar métodos de negócio).
12. Quando uma regra depende de consulta e de alteração, **validar antes de alterar a entidade** (evita o auto flush do Hibernate gravar o UPDATE antes da checagem).
13. Comentários de arquivos `.yml` e `.sql` **sem acentos** (problema de codificação com o Maven).
14. Migration aplicada **nunca se edita**: mudança vira a próxima versão.

**Formato de erro da API:** `{"erro": "mensagem"}`; validação: `{"erro":"Dados inválidos","campos":{...}}`.

| Código | Quando |
|---|---|
| 400 | Dados inválidos, JSON malformado |
| 401 | Sem token, token inválido/expirado, credenciais inválidas (mesma mensagem para usuário inexistente, inativo ou senha errada) |
| 403 | Autenticado, mas sem o perfil necessário |
| 404 | Não encontrado (inclui acesso a recurso de outra obra) |
| 409 | Violação de restrição do banco (corrida de duplicidade) |
| 422 | Regra de negócio violada |

**Segurança (estado):** API sem sessão (stateless), CSRF desativado, JWT no cabeçalho `Authorization: Bearer`. Públicos: `/api/health`, `/api/auth/login`, `/error`, Swagger. O restante exige autenticação; autorização por perfil com `@PreAuthorize` (`@EnableMethodSecurity`). Claim `perfil` vira `ROLE_<PERFIL>`.

**Front-end:** `src/api` (cliente Axios e chamadas), `src/features/<módulo>`, `src/pages`, `src/components`, `src/types`. Contexto de autenticação (`AuthProvider`, `useAuth`), guarda de rotas `ProtectedRoute` como rota-pai (exige login e, opcionalmente, perfis). Sessão no `localStorage` (`almox.token`, `almox.usuario`, `almox.expiraEm`). O cliente HTTP envia o token e, ao receber 401 (fora do login), limpa a sessão e dispara o evento `auth:expirada`. O cache do React Query é limpo ao entrar e ao sair. Um arquivo de componente só exporta componentes (regra do lint): contexto, provedor e hook ficam em arquivos separados.

---

## 6. Repositório e Git

**Monorepo:** `backend/`, `frontend/`, `docs/`, `docker-compose.yml`, `.env.example`, `.gitignore`, `README.md`. Três `.gitignore` (raiz, `backend/`, `frontend/`) que se somam.

**Branches:** `main` (estável) <- `develop` (integração) <- `feature/Txx-descricao` (uma por parte de uma task). `main` e `develop` protegidas (PR com 1 aprovação). **Merge de PR: "Create a merge commit"**, nunca *Squash* (as branches são empilhadas e os commits precisam ser preservados).

**Commits:** `tipo(escopo): descrição` (feat, fix, chore, docs, test, refactor), sem acentos nas mensagens. Commits pequenos por assunto. Antes de commitar: `git status --short` e `git diff --stat`; **nunca** devem entrar `.env`, `.idea/`, `target/`, `node_modules/`, `dist/`, `*.bak`. Usar `git add` com caminhos explícitos quando houver mais de um assunto.

**PRs já mergeados na `develop`:** #1 (T01), #2 (T02), #3 (T03), #4 (T04 back-end), #5 (T04 front-end). A `develop` estava em `4b9c37d` (merge do PR #5) na última verificação.

**T05 (em andamento), dois PRs separados e empilhados:**

| Branch | Conteúdo | Situação |
|---|---|---|
| `feature/T05-estrutura-obra` | 5 commits: decisões, `feat(obra)`, `fix(usuario)` (microssegundos), `chore(backend)` (remove JUnit 4 e TestNG do pom), decisões atualizadas. Hashes: `01117a2`, `7e0760d`, `46ec54a`, `e286652`, `ec212e1` | Commitada localmente. Push e PR 1 **[a confirmar]** |
| `feature/T05-areas-obra` (criada a partir da anterior) | Áreas da obra (migration V5, casos de uso, API, `AreaObraTest`) | Código criado e **validado pela API** (ver 7.4). Commit e push **[a confirmar]**. O PR 2 só deve ser aberto **depois** do merge do PR 1 (antes, trazer a `develop` com `git merge origin/develop --no-edit`) |

---

## 7. Estado atual

### 7.1 Tasks concluídas (mergeadas)

| Task | Entrega |
|---|---|
| T01 | Repositório, branches, `docker-compose` com PostgreSQL por variáveis de ambiente, `.env.example`, README |
| T02 | Spring Boot (Maven), Flyway (V1 vazia), Swagger, `/api/health`, tratamento global de erros, estrutura de pacotes |
| T03 | React + Vite + TS, proxy `/api`, React Router, React Query, Axios, tela inicial que consulta o health |
| T04 | Login JWT, perfis, cadastro/listagem de usuários (ADMIN), perfil `ENCARREGADO`, expiração do token em segundos, tela de login, rotas protegidas por perfil, página de usuários, botão Sair |

### 7.2 Migrations

| Versão | Conteúdo |
|---|---|
| V1 | `SELECT 1` (inicial) |
| V2 | Tabela `usuario` (perfil com CHECK `usuario_perfil_check`) |
| V3 | Inclui `ENCARREGADO` na restrição de perfis |
| V4 | Tabela `obra` (`obra_codigo_key` único) |
| V5 | Tabela `area_obra` (índice `area_obra_nome_unico` em `(obra_id, lower(nome))`) |

### 7.3 API implementada

| Método e rota | Acesso |
|---|---|
| `GET /api/health` | Público |
| `POST /api/auth/login` | Público. Devolve `token`, `tipo` ("Bearer"), `expiraEm`, `usuario` |
| `GET /api/auth/me` | Autenticado (barra usuário inativo) |
| `GET/POST /api/usuarios` | Somente ADMIN |
| `GET /api/obras`, `GET /api/obras/{id}` | Autenticado |
| `POST /api/obras`, `PATCH /api/obras/{id}` (renomear), `PATCH /api/obras/{id}/situacao` | ADMIN, ADMINISTRACAO |
| `GET /api/obras/{obraId}/areas?somenteAtivas=` | Autenticado |
| `POST /api/obras/{obraId}/areas`, `PUT .../{areaId}`, `PATCH .../{areaId}/situacao` | ADMIN, ADMINISTRACAO |

**Perfis:** `ADMIN`, `ALMOXARIFE`, `ENGENHARIA`, `ADMINISTRACAO`, `ENCARREGADO`.

**Tabelas atuais:** `usuario` (id, nome, login único, senha_hash, perfil, ativo, criado_em); `obra` (id, codigo único e imutável em maiúsculas, nome, ativa, criada_em); `area_obra` (id, obra_id FK, nome até 80, ordem inteira (negativa para subsolo), ativa, criada_em).

**Regras de obra e área já implementadas:** código normalizado em maiúsculas; obra inativa **pode** ser renomeada; obra inativa **não recebe novas áreas**; nome de área único por obra ignorando maiúsculas; uma área só é acessada pela sua própria obra (senão 404); listagem ordenada por `ordem` e nome.

### 7.4 Evidências obtidas

- Login, `/me`, `/usuarios` como admin; 401 sem token e com senha errada; 403 para ALMOXARIFE em `/usuarios`; 400 com senha curta; hashes BCrypt no banco.
- Banco criado do zero com as migrations aplicadas em sequência (confirmado indiretamente).
- Token com `expiraEm` em segundos exatos; teste `JwtTokenServiceTest` com ciclo vermelho/verde.
- Obras: criar (código normalizado), duplicada 422, nome vazio 400, renomear, inativar, leitura por ALMOXARIFE OK e escrita 403, código duplicado direto no banco recusado (`obra_codigo_key`).
- `criadaEm` do POST igual ao da leitura em 5 de 5 amostras (correção dos microssegundos).
- Suíte com **11 testes** passando no estado "obra" (1 contexto + 5 Obra + 4 Usuario + 1 Jwt).
- Áreas: ordem numérica (`-1, 0, 1, 2, 10`), duplicada ignorando maiúsculas 422, mesmo nome em outra obra OK, obra inativa 422, nome vazio 400, obra inexistente 404, edição válida OK, ALMOXARIFE lê (5) e não escreve (403), banco recusa índice duplicado, chave estrangeira inexistente e exclusão de obra com áreas.

### 7.5 Pendências de evidência (T05)

- `./mvnw clean test` com **18 testes** (11 + 7 do `AreaObraTest`) no estado final. **[a confirmar]**
- Acesso cruzado entre obras (404) e renomear área para nome existente (422). **[a confirmar]**
- Inativar área e filtro `somenteAtivas` (5 e 4). **[a confirmar]**
- Vermelho do `ObraTest` de microssegundos nunca visto (só o do `Usuario`); a correção está provada pela verificação ponta a ponta.
- Linhas `org.hibernate.SQL` do PATCH (aprendizado sobre *dirty checking*): opcional.
- Teste de microssegundos pode passar sem a correção em Linux/macOS (relógio com resolução menor). Melhoria: injetar um `Clock`.

### 7.6 Front-end atual

Páginas: `LoginPage`, `HomePage` (saudação e status da API), `UsuariosPage` (lista, só ADMIN), `SemPermissaoPage`, `NotFoundPage`. `Layout` com nome, perfil, link "Usuários" (ADMIN) e botão Sair. Ainda **não há** telas de obras, áreas nem formulário de criação de usuário.

---

## 8. Decisões de projeto (registradas em `docs/decisoes.md`)

1. **Uma obra por enquanto, estrutura pronta para várias.** Mantém tabela `obra` e `obra_id`; sem seletor de obra, cadastro de obras na tela nem vínculo usuário-obra. API recebe `obraId` explícito; no front, a obra atual é escolhida em **um único ponto** (`useObraAtual`). Revisar quando surgir a 2ª obra.
2. **Área da obra = local/pavimento**, tabela simples (`nome`, `ordem`, `ativa`), sem tipo e sem hierarquia. A engenharia definirá granularidade, ciclos de concretagem e ambientes (entram como colunas/tabelas opcionais, por exemplo `pai_id`). O `area_id` das requisições referencia `area_obra`.
3. **Quem acessa:** perfis `ADMIN`, `ALMOXARIFE`, `ENGENHARIA`, `ADMINISTRACAO`, `ENCARREGADO`. Entre as frentes, **somente os encarregados dos pedreiros** terão login para solicitar; as outras frentes pedem no balcão e o almoxarife registra. A restrição "só pedreiros" é operacional (quem recebe login), não codificada.
4. **Token no `localStorage`** (aceito para o MVP; risco de XSS; troca por cookie `httpOnly` fica restrita a `storage.ts` e `client.ts`).
5. **Cadastros usados nunca são excluídos** (`ativa`/`ativo`, FK restritiva).
6. **Obra inativa pode ser renomeada** (o código continua imutável).
7. **Dependências de teste:** só JUnit 5 via starters; nenhuma dependência com escopo `compile` para teste nem versão `RELEASE`/`LATEST`. Ler `git diff --stat` antes de cada commit.

**Decisões de desenho discutidas (ainda não implementadas):**

8. **Separar o pedido da retirada** para evitar fila no subsolo: o encarregado pede antes (onde há sinal), o almoxarife separa antes da chegada, o encarregado retira com **QR/código curto**. O ganho vale só para o grupo que tem login (pedreiros).
9. **Reservar na separação e baixar na retirada**: `disponível = saldo - reservado`. Reservas esquecidas **expiram** (tempo configurável) e voltam ao disponível.
10. **Pedir não é reservar.** A disputa pela última unidade é resolvida na reserva, de forma atômica (`UPDATE ... WHERE (quantidade - reservado) >= qtd` conferindo as linhas afetadas, ou trava de linha). Prioridade da fila: `necessario_ate`, depois `solicitada_em` (horário do **servidor**), depois `id`.
11. **Offline:** pedido (intenção) pode esperar a rede, com fila local no celular (PWA), UUID gerado no cliente e idempotência (`Idempotency-Key`); pedido pendente **não tem código de retirada** até o servidor confirmar. Na estação do almoxarife, no MVP, **bloquear a baixa sem rede e usar o bloco de papel**, lançando depois com a hora real (`ocorrida_em` separada de `registrada_em`). **Retirada física já ocorrida deve ser registrada mesmo que o saldo fique negativo** (com alerta de divergência); já um pedido pode ser recusado.
12. **Atualização da tela do almoxarife:** polling de ~10 s (React Query `refetchInterval`) no MVP, isolado em um hook (`usePedidosAoVivo`); SSE depois, se necessário. Evento SSE (se um dia houver) traz só o aviso "mudou", e o front busca a lista na rota normal. Contadores (Novos, Em separação, Prontos), título da aba com o total, urgência por cor, botão "assumir pedido", ficha de separação ordenada pela posição física, e **medir** `solicitada_em -> pronta_em` e `pronta_em -> retirada_em`.
13. **Fluxo de telas da retirada (almoxarife):** fila de retirada -> identificar retirante (QR/código + crachá; recusa se inativo, expirado ou já usado) -> conferir pedido e destino (área da obra; alteração exige justificativa e fica auditada) -> se há ferramenta, teste de saída e empréstimo -> confirmar retirada (baixa e empréstimos) -> comprovante.
14. **Frentes de pedido na interface do almoxarife:** consumo, ferramenta diária e ferramenta locada, com selos distintos (ícone + texto, não só cor), fila única com abas e contadores; o tipo **não é digitado**: vem de `material.tipo_controle` combinado com `ativo.propriedade`. Uma requisição pode misturar tipos (itens agrupados por seção).
15. **Autorização por dono (T11):** o encarregado só vê e cancela as próprias requisições (404 para as de outros), além do controle por perfil.
16. **Sobre refazer em Node:** discutido; **sem decisão**. Recomendação: não reescrever só por causa de SSE; se for mudar, o momento mais barato é antes da T07. Os testes e cenários atuais serviriam como especificação.

---

## 9. Domínio e regras de negócio (alvo)

### 9.1 Tipos de item

| Tipo | Controle | Baixa do estoque? | Exemplo |
|---|---|---|---|
| Material de consumo | Por quantidade | Sim, na retirada | Cimento, espaçador |
| Ferramenta reutilizável | Por quantidade ou unidade individual | Não: empréstimo e devolução | Martelo, trena |
| Equipamento próprio | Unidade individual (patrimônio) | Não | Furadeira |
| Equipamento alugado | Unidade individual + contrato/locadora | Não; controle separado, com prazo | Betoneira |
| Material de terceiros | Controle separado | Não entra no saldo próprio | Ferramenta da empreiteira |
| Kit pré-montado | Como um único item (`eh_kit`) | Sim, o kit sai inteiro | Kit elétrico |

Dois eixos independentes: `tipo_controle` (CONSUMO, FERRAMENTA, EQUIPAMENTO) no material e `propriedade` (PROPRIA, ALUGADA, TERCEIRO) na unidade física.

### 9.2 Fluxo completo do material

Compra/entrada prevista (pedido nasce no Sienge; só registrar o número) -> **recebimento** (NF, transferência ou sem documento; conversão da unidade de compra para a de utilização) -> armazenamento (local de estoque) -> **requisição** -> aprovação (só se necessária) -> **separação** (reserva) -> **retirada** -> **baixa** -> devolução (ferramentas e sobras) -> transferências -> inventário -> relatórios.

### 9.3 Requisição

- Cabeçalho: requisitante, empresa do requisitante, **área da obra** (`area_id`, obrigatória), `ciclo_id` (opcional e adiado), local de estoque (vem do usuário logado), `registrada_por` (quem digitou, diferente de quem pediu), número do bloco de papel (transição), `necessario_ate`, observação, número sequencial, status, datas, código de retirada (único, com expiração).
- Itens: material, `qtd_solicitada`, `qtd_aprovada`, `qtd_separada`, `qtd_atendida`, `excede_limite`.
- Validações: ao menos 1 item; sem material repetido (somar); quantidade inteira para unidades contadas (decimal só em kg e m³); áreas e requisitante ativos; terceirizado identificado por nome; destino da área pertence à obra do almoxarifado.
- **Estados:** `SOLICITADA -> EM_SEPARACAO -> PRONTA -> ATENDIDA`; ramos `PENDENTE_APROVACAO` (V2), `PARCIAL`, `CANCELADA`, `EXPIRADA`. Transições são métodos da entidade (transição inválida lança exceção de negócio).
- Limites verificados ao registrar; no MVP só **alertam**.

### 9.4 Controle de ferramentas

- Unidade individual (`ativo`): patrimônio, material (catálogo), propriedade, dono, contrato, local, status: `DISPONIVEL`, `EMPRESTADA`, `AGUARDANDO_TESTE`, `MANUTENCAO`, `DANIFICADA`, `PERDIDA`, `BAIXADA`.
- **Empréstimo:** quem retirou (pessoa e empresa), área de uso, horário de retirada, devolução prevista (atraso é derivado, não guardado), horário de devolução, quem entregou e quem recebeu. Status do empréstimo: `EM_USO`, `DEVOLVIDA`, `PERDIDA`.
- **Testes (campos pedidos pelo usuário):** teste **antes da entrega** (reprovado bloqueia o empréstimo e manda a ferramenta para `MANUTENCAO`), status **devolvida** e teste **após a devolução** (a ferramenta passa por `AGUARDANDO_TESTE`; aprovada volta a `DISPONIVEL`, reprovada vai para `MANUTENCAO` ou `DANIFICADA` com ocorrência ligada ao empréstimo). Tabela `teste_ativo` (momento SAIDA/DEVOLUCAO, resultado APROVADO/REPROVADO/NAO_APLICAVEL, observação, testado_por, testado_em). Aprovado na saída e reprovado na devolução prova que o dano ocorreu durante aquele empréstimo.
- Material com campo `exige_teste` (ferramentas simples podem ser `NAO_APLICAVEL`).
- Ocorrências: `PERDA`, `DANO`, `MANUTENCAO`. Quem arca com o custo: **decisão da empresa** (em aberto).

### 9.5 Limites de material

Quantidade máxima por **escopo** (obra, material, área; ciclo no futuro), com regra `ALERTAR` (MVP), `EXIGIR_APROVACAO` ou `BLOQUEAR` (V2), vigência (início/fim), versionado (cada alteração da Engenharia gera nova versão com usuário, data e justificativa). Consumido = saídas menos devoluções no escopo.

### 9.6 Situações especiais

- **Material sem nota de transferência:** registrar o recebimento como `SEM_DOCUMENTO` em situação "pendente de regularização" (visível e sinalizado), em vez de deixá-lo fora do estoque. Decisão final da empresa **em aberto**.
- **Transferência entre obras/locais:** saída da origem, "em trânsito", entrada no destino só na confirmação; divergência de quantidade fica registrada (V2).
- **Devolução de sobra:** entrada ligada à requisição original, reduz o consumido do escopo.
- **Equipamento alugado:** `ativo` com propriedade ALUGADA e contrato com data de fim prevista; alerta de prazo.
- **Ferramenta de terceirizada:** `ativo` com propriedade TERCEIRO e dono; nunca entra no saldo próprio.
- **Mesmo material em várias áreas:** a área é atributo da requisição e da movimentação, não do estoque.

---

## 10. Modelo de dados alvo (resumo; a criar nas próximas tasks)

| Tabela | Colunas principais |
|---|---|
| `unidade_medida` | sigla única, descrição, grandeza |
| `categoria_material` | nome único (sem diferenciar maiúsculas) |
| `material` | codigo (único e imutável, o do Sienge), descrição, categoria_id, tipo_controle, un_compra_id, un_utilizacao_id, fator_conversao > 0 (1 un. compra = N un. utilização), eh_kit, exige_teste, ativo, criado_em |
| `kit_composicao` (V2) | kit_id, componente_id, quantidade |
| `local_estoque` | id, obra_id (nulo = Administração Central), nome, tipo (ALMOXARIFE_OBRA, KITS, CENTRAL), ativo |
| `estoque_saldo` | local_id, material_id (PK composta), quantidade, reservado, version |
| `movimentacao_estoque` (livro-razão, imutável) | id (UUID do cliente), local_id, material_id, tipo (ENTRADA_RECEB, SAIDA_REQ, ENTRADA_DEVOL, SAIDA_TRANSF, ENTRADA_TRANSF, AJUSTE_INV, ESTORNO), quantidade positiva, área, vínculos (requisição, recebimento etc.), usuario_id, ocorrida_em, registrada_em, estorno_de |
| `parametro_estoque` | local_id, material_id, minimo, maximo |
| `empresa` | razão social, cnpj, tipo (PROPRIA, TERCEIRIZADA, FORNECEDOR, LOCADORA), ativa |
| `pessoa` | nome, matrícula, empresa_id, ativa (e `usuario.pessoa_id` opcional) |
| `recebimento` e `recebimento_item` | local, fornecedor, tipo_documento (NF, TRANSFERENCIA, SEM_DOCUMENTO), número, pedido_sienge, status, recebido_por/em; item com qtd de compra e de utilização |
| `requisicao` e `requisicao_item` | ver 9.3 |
| `aprovacao` (V2) | requisição, aprovador, decisão, justificativa |
| `limite_material` | obra, material, área (opcional), quantidade, regra, vigência, criado_por, justificativa |
| `contrato_locacao` | locadora, obra, início, fim previsto |
| `ativo` | material_id, patrimônio, série, propriedade, empresa_dona, contrato, local, status |
| `emprestimo_ativo` | ativo, retirado_por, empresa, área, retirado_em, devolução prevista/efetiva, entregue_por, recebido_por, status |
| `teste_ativo`, `ocorrencia_ativo` | ver 9.4 |
| `transferencia` e `transferencia_item` (V2) | origem, destino, status, qtd enviada e recebida |
| `inventario` e `inventario_item` (V2) | local, data, status, qtd do sistema e contada |
| `auditoria` | entidade, ação, usuário, antes/depois, data |

**Invariante do estoque:** a soma do livro-razão por `(local, material)` deve igualar `estoque_saldo.quantidade`, atualizada na **mesma transação** da movimentação.

---

## 11. Plano completo

### 11.1 Ordem recomendada

`T05 (fechar) -> T07 -> T08 -> T09 -> T10 -> T06 -> T11 -> T12 -> T13 -> T14 -> T15 -> T16 -> T17 -> T18 -> T19 -> T20`. A T06 (empresas e pessoas) sobe antes da T11 porque a requisição precisa de empresa e requisitante. Cada item abaixo tem uma parte de back-end e, quando indicado, de front-end; **cada parte vai em PR próprio**.

### 11.2 Tasks

| Task | Back-end | Front-end | Prova de pronto |
|---|---|---|---|
| **T05** (em curso) | Obra e área da obra (feito, ver 7) | Telas de áreas: **adiadas** (áreas por API/Swagger por enquanto) | Fechar as pendências de 7.5; PR 1, depois PR 2 |
| **T07 Material** | Unidades de medida, categorias, material com conversão | Lista e cadastro de materiais | Conversão testada em unidade; código único e imutável; fator <= 0 recusado; restrições do banco; 403 para perfil sem escrita |
| **T08 Estoque base** | `local_estoque`, `estoque_saldo`, livro-razão, kardex, saída física com saldo negativo permitido e alerta | Consulta de saldo e kardex | **Teste de concorrência** (duas saídas simultâneas), invariante soma do livro-razão = saldo, estorno |
| **T09 Recebimento** | Recebimento com NF/transferência/sem documento, conversão compra->utilização, entradas no livro-razão | Tela de recebimento | Entrada converte unidades; sem documento fica pendente; divergências registradas |
| **T10 Parâmetros** | Mínimo e máximo por local e material, alerta abaixo do mínimo | Alertas e relatório | Alerta dispara no limite exato |
| **T06 Empresas e pessoas** | Empresas (própria, terceirizada, fornecedora, locadora), pessoas (retirantes), vínculo opcional usuário-pessoa | Cadastros | Unicidade de CNPJ; inativação sem exclusão |
| **T11 Requisição** | Criação com validações de 9.3, `Idempotency-Key`, `necessario_ate`, horário do servidor, autorização por dono, caminho do almoxarife registrando em nome de outros (`registrada_por`) | Encarregado: criar pedido e ver status; almoxarife: registrar | POST repetido com a mesma chave gera 1 requisição; encarregado A não lê pedido do B (404); validações |
| **T12 Atendimento e baixa** | Assumir, separar, **reserva atômica**, PRONTA com código de retirada, retirada (valida código e usuário ativo, confirma destino com justificativa se mudar), baixa automática, parcial, cancelamento, expiração de reservas (job agendado), estorno | Fila do almoxarife (polling 10 s, contadores, título da aba), telas da retirada (9.3 e decisão 13), QR/código no celular | Concorrência pela última unidade (só uma reserva vence); expiração devolve o disponível; parcial; auditoria da mudança de destino; medidas de tempo |
| **T13 Limites** | `limite_material` versionado, verificação ao requisitar (só alerta), histórico | Tela da Engenharia | Consumo no escopo calculado; versão antiga preservada; alerta marca `excede_limite` |
| **T14 Ativos** | Cadastro de unidades individuais, propriedade, contrato de locação | Cadastro | Patrimônio único; status inicial; propriedade e dono coerentes |
| **T15 Empréstimo e teste de saída** | Empréstimo, teste antes da entrega, bloqueio se reprovado | Telas no balcão | Reprovado bloqueia; só `DISPONIVEL` empresta; transições inválidas lançam exceção |
| **T16 Devolução, teste pós e ocorrências** | Devolução, `AGUARDANDO_TESTE`, teste pós, perda/dano/manutenção, atraso derivado | Telas de devolução e ocorrências | Aprovado/saída e reprovado/devolução gera ocorrência ligada ao empréstimo |
| **T17 Relatórios** | Saldo, kardex, consumo por área/empresa/período, ferramentas em aberto, abaixo do mínimo, divergências, tempos de atendimento | Telas de relatório | Totais conferem com o livro-razão |
| **T18 Auditoria e segurança** | Trilha de ações críticas, limite de tentativas de login, revisão da revogação de token | Consulta de auditoria | Tentativas excedidas bloqueiam; ações críticas deixam rastro |
| **T19 Ponta a ponta** | Teste do cenário "encarregado do pavimento 5 pede material" (pedido -> separação -> retirada -> baixa), automatizado com Testcontainers | Roteiro manual | Cenário completo passa e documenta as evidências |
| **T20 Documentação e entrega** | README final, manual de uso, DER, diagramas, decisões, apresentação | | Quem clona o projeto sobe tudo seguindo só o README |

### 11.3 Tarefas transversais

| Item | Descrição |
|---|---|
| X1 CI | GitHub Actions: build e testes do back e do front a cada PR |
| X2 ArchUnit | Teste das regras de camadas (domínio isolado; aplicação sem infraestrutura e sem presentation; presentation sem infraestrutura). Configurar `failOnEmptyShould=false` enquanto houver pacotes vazios |
| X3 Integração | Testes de integração com Testcontainers (PostgreSQL), especialmente concorrência e migrations do zero |
| X4 Execução completa | Dockerfiles e compose do back e do front |
| X5 Dados de demonstração | Script de seed (obra real da JOOY, áreas, materiais). **Não** reaproveitar dados de teste: o código da obra é imutável |
| X6 Endurecimento | Desativar Swagger em produção, segredos fora do código, CORS/HTTPS, backups do banco |
| X7 Observabilidade | Logs estruturados e métricas dos tempos de atendimento |
| X8 Tipos do front | Gerar tipos a partir do OpenAPI (remove a duplicação de `Perfil`) |
| X9 Administração de usuários | Criar, desativar e trocar senha pela interface |

### 11.4 Versão 2 (fora do MVP)

Aprovação formal e bloqueio por limite; transferências entre locais/obras; inventário com ajuste; equipamento alugado com custo e alertas de prazo; composição de kits; offline com fila na estação do almoxarife e no celular; QR Code; integração com o Sienge; vínculo usuário-obra e autorização por obra; refresh token e revogação; ciclo de concretagem e hierarquia de áreas (`pai_id`); atualização em tempo real (SSE); painéis multiobra; custos.

### 11.5 Definição de pronto (para toda task)

1. Compila, testes passam (`./mvnw clean test` no back; `npm run build` e `npm run lint` no front).
2. A migration roda do zero e o `ddl-auto: validate` não reclama.
3. Endpoints aparecem no Swagger; os cenários felizes e de erro (401, 403, 404, 409, 422) foram exercitados, e as **evidências foram registradas** no PR.
4. As restrições do banco foram provadas diretamente (violação de unicidade e de chave estrangeira).
5. Correções de defeitos têm teste que **falha sem a correção**.
6. `git status` e `git diff --stat` conferidos antes do commit; commits pequenos por assunto.
7. Outro integrante revisou o PR.

---

## 12. Pontos em aberto

**Para a JOOY / engenharia:**

1. O código do material é o mesmo do Sienge? Existe integração (API ou exportação de arquivo)?
2. Granularidade das áreas da obra (só pavimentos? ambientes? torres/blocos?) e se ciclo de concretagem entra no controle.
3. Quem aprova excedente de limite, e para quais materiais.
4. Os encarregados dos pedreiros são da JOOY ou de uma empreiteira? A restrição aos pedreiros é de um piloto ou permanente?
5. Proporção das retiradas que vem dessa equipe (define o ganho real do pedido antecipado).
6. Tempo máximo para retirar o material já separado (expiração da reserva).
7. Quem pode pedir ferramenta locada (custo)?
8. Leitor de QR/crachá no balcão (webcam ou leitor USB)? O celular do encarregado tem sinal fora do subsolo? O PC do almoxarife tem rede cabeada estável?
9. Ferramentas controladas individualmente (patrimônio) ou por quantidade, por tipo?
10. O que significa "teste" da ferramenta (verificação simples ou checklist por tipo) e quem executa?
11. Quem arca com perda e dano de ferramenta (o sistema só registra?).
12. Material sem nota de transferência: fica fora do estoque ou entra como pendente de regularização?
13. Kits: controlados só como unidade, ou com componentes?
14. Unidades e fatores de conversão: quais materiais têm conversão e quem mantém?
15. Necessidade de guardar CPF dos requisitantes (LGPD).
16. Existem relatórios atuais que precisam ser reproduzidos?
17. Quantas obras, materiais e requisições por dia são esperados?
18. O estoque é separado fisicamente por pavimento (material guardado nos andares)? Se sim, `local_estoque` ganha `pavimento`/área.

**Para o usuário (pendente):** o usuário vai **verificar as questões do estoque** com a empresa e avisar; a **T07** está proposta e aguarda confirmação das suposições (código do Sienge, unidades iniciais: un, kg, m³, cx, saco; tipo de controle; categoria em tabela; mínimo/máximo por local) e a resposta se as unidades já vêm definidas pela JOOY.

---

## 13. Riscos e dívidas técnicas

| Área | Risco | Ação |
|---|---|---|
| Segurança | Login sem limite de tentativas (força bruta) | T18 |
| Segurança | Token vale 8 h mesmo com usuário desativado (só o `/me` barra inativos); não revogável | Aceito no MVP; reavaliar com refresh token |
| Segurança | Token no `localStorage` (XSS) | Decisão 4 |
| Segurança | Qualquer autenticado lê todas as obras e áreas | Autorização por obra quando houver mais de uma |
| Segurança | O histórico do Git contém um `.env` antigo (T03) com a senha do banco da época | **Trocar a senha do banco** (confirmar que foi feito) |
| Confiabilidade | Java 25 rodando em vez do 21 na IDE | Alinhar a configuração de execução |
| Confiabilidade | Concorrência no estoque (última unidade) | T08/T12: trava atômica + teste |
| Manutenção | `Perfil` duplicado entre back e front | X8 |
| Manutenção | Unicidade do nome de área existe no código e no índice, e as duas mudam juntas | Documentado |
| Manutenção | `groupId` do `pom.xml` aparece como `br.comalmoxarifado` (falta um ponto); sem efeito nos pacotes Java | Corrigir em commit à parte |
| Testes | Só testes de unidade e contexto; validação de API é manual | X3 e T19 |
| Testes | Teste de microssegundos depende do relógio | Injetar `Clock` |
| Desempenho | Sem dados sensíveis hoje; atenção a N+1 e paginação quando listas crescerem | Revisar a partir da T08 |

---

## 14. Armadilhas já encontradas (evitar de novo)

1. **Acentos em `.yml` e `.sql`:** arquivo salvo fora de UTF-8 quebra o Maven (`MalformedInputException`). Comentários sem acento; IDE em UTF-8 sem BOM.
2. **Parar o back-end antes de trocar de branch ou rodar `mvnw clean`:** o DevTools reinicia no meio da gravação e um `.class` ficou corrompido (`ClassFormatError ... Code length 0`). Resolvido com `clean` completo.
3. **`.gitignore` não vale para arquivo já rastreado:** `.env`, `.idea` e `target/` entraram em commits; correção com `git rm --cached`. Depois, trocar segredos.
4. **IDE adiciona arquivos ao Git sozinha** ("Add file to Git?"): Settings > Version Control > Confirmation > "Do not add".
5. **Sugestões da IDE ("Add ... to classpath") alteram o `pom.xml`:** entraram `junit:junit` e `testng` (versão `RELEASE`, escopo `compile`). Removidos no PR T05. Ler `git diff --stat` antes de commitar.
6. **Lombok:** precisa do plugin na IDE e de *annotation processing* habilitado.
7. **Teste criado em `src/main`** fica vermelho (sem JUnit no classpath); mover para `src/test`.
8. **Teste no arquivo errado:** o teste de microssegundos do `Usuario` foi parar no `BackendApplicationTests` e no `ObraTest`. Conferir a contagem de `@Test` **por arquivo**.
9. **Docker Desktop fechado** causa `Connection refused` na porta 5433. `28P01` significa que alcançou o servidor, mas a senha falhou (volume antigo, ou outro Postgres local na 5432).
10. **O Postgres só aplica usuário e senha na primeira criação do volume:** mudar `.env` depois exige `docker compose down -v` (apaga dados).
11. **Merge do PR:** *merge commit*, não *Squash* (branches empilhadas). O Vim abre na mensagem do merge: `Esc`, `:wq`, Enter; ou usar `git merge --no-edit`.
12. **PowerShell 5.1:**
    - `@(Invoke-RestMethod ...) | Where-Object` trata uma lista JSON como **um único item**: guardar a lista numa variável e filtrar depois (`$lista | Where-Object ...`).
    - Corpo JSON com acentos chega corrompido: usar nomes de teste sem acento.
    - Um `$id` com vários GUIDs gera URL com espaços e 400.
    - `./mvnw` só funciona dentro de `backend/` (`.\mvnw`).
    - Gravar arquivos por script pode mudar a codificação: editar pela IDE.
13. **Token de sessão de teste expira (8 h):** um 401 inesperado costuma ser token vencido; refazer o login.
14. **`git diff --name-only` e `git log` usam o pager (`less`):** sair com `q` ou usar `git --no-pager`.
15. **Spring Boot 4:** o starter do resource server se chama `spring-boot-starter-security-oauth2-resource-server`; springdoc deve ser 3.x; o Flyway precisa de `flyway-database-postgresql`.
16. **Um teste que nunca roda é pior do que nenhum** (anotação de outro framework): conferir a contagem por arquivo e exigir o vermelho.

---

## 15. Comandos úteis

**Estado do repositório (rodar primeiro na nova ferramenta):**

```powershell
git status --short
git branch --show-current
git --no-pager log --oneline -8
git fetch origin
git --no-pager log --oneline origin/develop..HEAD
git --no-pager diff --name-only origin/develop
```

**Subir tudo:**

```powershell
docker compose up -d                  # banco
cd backend; .\mvnw spring-boot:run    # back-end (8080)
cd frontend; npm run dev              # front-end (5173)
```

**Testar e validar:**

```powershell
cd backend; .\mvnw clean test         # back-end parado e Docker ligado (o contexto precisa do banco)
cd frontend; npm run build; npm run lint
```

**Banco:**

```powershell
docker exec -it almoxarifado-db psql -U almox -d almoxarifado -c "SELECT version, description, success FROM flyway_schema_history;"
docker compose down -v ; docker compose up -d    # recria o banco do zero (apaga dados)
```

**Login rápido e atalhos de API (PowerShell 5.1):**

```powershell
$senha = (Get-Content .env | Where-Object { $_ -like 'ADMIN_PASSWORD=*' }) -replace '^ADMIN_PASSWORD=',''
$token = (Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/auth/login -ContentType 'application/json' -Body (@{ login = 'admin'; senha = $senha } | ConvertTo-Json)).token
$h = @{ Authorization = "Bearer $token" }

function Codigo($bloco) { try { & $bloco | Out-Null; 'OK' } catch { $_.Exception.Response.StatusCode.value__ } }

function ObraPorCodigo($codigo, $nome) {
  $lista = Invoke-RestMethod http://localhost:8080/api/obras -Headers $h
  $o = $lista | Where-Object { $_.codigo -eq $codigo } | Select-Object -First 1
  if (-not $o) { $o = Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/obras -Headers $h -ContentType 'application/json' -Body (@{ codigo = $codigo; nome = $nome } | ConvertTo-Json) }
  $o
}
```

Para ver a expiração de um token (o JWT é assinado, não criptografado):

```powershell
$p = $token.Split('.')[1].Replace('-','+').Replace('_','/'); while ($p.Length % 4) { $p += '=' }
([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($p)) | ConvertFrom-Json).exp
```

---

## 16. Próximos passos imediatos

1. **Confirmar o estado** com os comandos da seção 15 (branch atual, commits da T05, se houve push, se a `feature/T05-areas-obra` existe e o que está commitado).
2. **Fechar as pendências de evidência da T05** (seção 7.5), em especial `./mvnw clean test` com 18 testes (back-end parado, Docker ligado).
3. **Commitar as áreas** na `feature/T05-areas-obra` (apenas `obra/`, `V5__area_obra.sql` e `AreaObraTest`) e fazer o push.
4. **Abrir o PR 1** (`feature/T05-estrutura-obra` -> `develop`) com o texto do Apêndice A. Depois do merge (merge commit), trazer a `develop` para a branch das áreas e abrir o **PR 2** (Apêndice B).
5. **Registrar em `docs/decisoes.md`** as decisões 8 a 16 da seção 8, se o grupo concordar.
6. **T07 Material:** aguardar o retorno do usuário sobre as questões do estoque e a confirmação das suposições; então propor o primeiro bloco (unidades e categorias), com PR próprio.
7. **Decisão pendente:** manter Spring Boot ou migrar para Node (seção 8, item 16). Se for migrar, fazer **antes da T07**, usando os testes e cenários atuais como especificação.

---

## Apêndice A: texto do PR 1 (obras)

**Título:** `feat(T05): cadastro de obras (back-end)`

```markdown
## O que foi feito

### Obras
- Tabela `obra` (migration `V4`) com código único e imutável, nome e situação (`ativa`)
- API `/api/obras`: listar, buscar, criar, renomear e inativar/reativar
- Leitura para qualquer usuário autenticado; escrita só para `ADMIN` e `ADMINISTRACAO`
- Obras nunca são excluídas; o código é normalizado em maiúsculas
- Violação de restrição do banco passa a responder `409`

### Correções incluídas
- `criadaEm` e `criadoEm` truncados em microssegundos: o Postgres guarda microssegundos, e antes a resposta do POST e a leitura traziam valores diferentes
- Remoção das dependências `junit:junit` (JUnit 4) e `org.testng:testng` (versão `RELEASE`, escopo `compile`) do `pom.xml`. Elas entraram no PR #4 por sugestão da IDE e iam para o JAR de produção

### Documentação
- `docs/decisoes.md` com as decisões de projeto

## Pontos para o revisor
- `backend/pom.xml`: só remove duas dependências, em commit separado (pode ser revertido sozinho)
- As áreas da obra vêm em um PR seguinte, que depende deste (migration `V5`)
- Nenhuma tela neste PR

## Como testar
1. `docker compose up -d` e subir o back-end (migration V4 aplicada)
2. Login como admin; criar uma obra (`POST /api/obras`), renomear e inativar
3. Como ALMOXARIFE: a leitura funciona e a escrita retorna 403

## Evidências
- [x] `./mvnw clean test`: 11 testes passando; `pom.xml` sem `testng` nem JUnit 4 (conferido por busca)
- [x] 5 obras criadas em sequência: `criadaEm` do POST igual ao da leitura nas 5 tentativas
- [x] Código duplicado (422), nome vazio (400), perfil sem permissão (403)
- [x] Código duplicado direto no banco recusado pela restrição `obra_codigo_key`

## Riscos e observações
- Qualquer usuário autenticado lê todas as obras; a autorização por obra fica para quando houver mais de uma
- O teste de microssegundos depende do relógio do sistema e pode passar sem a correção em Linux; a prova está na verificação ponta a ponta
- Não há teste de integração automatizado ainda
```

## Apêndice B: texto do PR 2 (áreas da obra)

**Título:** `feat(T05): áreas da obra (local/pavimento)`

```markdown
## O que foi feito
- Tabela `area_obra` (migration `V5`) com nome, ordem numérica (negativa para subsolo) e situação
- API `/api/obras/{obraId}/areas`: listar (filtro `somenteAtivas`), criar, atualizar e inativar/reativar
- Nome único por obra, sem diferenciar maiúsculas (índice no banco e validação no caso de uso)
- Obra inativa não recebe novas áreas; uma área só é acessada pela sua própria obra (outra obra: 404)
- Áreas nunca são excluídas; leitura para qualquer autenticado, escrita só para `ADMIN` e `ADMINISTRACAO`

## Dependência
Depende do PR de obras (`V4`, tabela `obra`), já mergeado.

## Como testar
1. `docker compose up -d` e subir o back-end (migration V5 aplicada)
2. Login como admin; criar áreas fora de ordem em uma obra e listar
3. Como ALMOXARIFE: a leitura funciona e a escrita retorna 403

## Evidências
- [ ] `./mvnw clean test`: 18 testes passando
- [x] Ordem numérica: Subsolo 1 (-1), Térreo (0), Pavimento 1, 2 e 10
- [x] Duplicada ignorando maiúsculas (422), mesmo nome em outra obra (OK), obra inativa (422), nome vazio (400), obra inexistente (404)
- [x] Edição válida de nome e ordem
- [ ] Acesso cruzado entre obras (404) e renomear para nome existente (422)
- [ ] Inativar e filtro `somenteAtivas` (5 e 4)
- [x] Perfil ALMOXARIFE: leitura OK e escrita 403
- [x] Banco: índice de nome único, chave estrangeira e exclusão de obra com áreas recusados

## Riscos e observações
- A unicidade do nome existe no código e no índice, e as duas precisam mudar juntas
- A ordem aceita qualquer inteiro e não é única; empates aparecem em ordem alfabética
- Qualquer autenticado lê as áreas de todas as obras; a autorização por obra fica para quando houver mais de uma
- Não há teste de integração automatizado ainda
```

Marcar `[x]` somente nos itens efetivamente provados quando o PR for aberto.
