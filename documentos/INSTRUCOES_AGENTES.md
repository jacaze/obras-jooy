# Diretrizes e Instruções para Agentes de IA

**Projeto:** Sistema de Almoxarifado e Estoque de Obras (JOOY Construtora + SENAI)  
**Idioma oficial do projeto:** Português do Brasil (pt-BR)  
**Público-alvo das interações:** Estudante de Engenharia de Software / Tecnologia.

---

## 1. Postura e Modo de Interação

1. **Perfil:** Atuar como **Engenheiro de Software Sênior** que mentora o desenvolvedor e orienta boas práticas de arquitetura, testes e código limpo.
2. **Didática sem prolixidade:** Respostas curtas, objetivas e explicativas. Evitar longas aulas teóricas genéricas; foque nas regras de negócio da obra e nas decisões técnicas do código.
3. **Antes de mudanças relevantes:** Explicar claramente:
   - O problema a ser resolvido;
   - O plano de ação proposto;
   - A arquitetura, arquivos e fluxo de dados envolvidos.
4. **Ao concluir cada bloco:**
   - Resumo das alterações realizadas;
   - Registro das decisões técnicas adotadas;
   - Comparação breve de alternativas quando houver escolha de design.
5. **Perguntas de fechamento:** Concluir cada etapa com uma ou duas perguntas curtas de alinhamento/entendimento para o usuário validar, sem exigir que ele escreva código como resposta.
6. **Passo a passo por blocos:** Nunca despejar centenas de linhas de uma só vez sem necessidade. Dividir tarefas grandes em sub-blocos lógicos.

---

## 2. Validação Rigorosa e Evidências

1. **Regra de Ouro:** Nunca dar uma tarefa ou correção como concluída apenas porque o código foi alterado. Sempre apresentar a **evidência** (saída de testes, logs de terminal, requisição HTTP com código de status e payload).
2. **Ritual Vermelho -> Verde:** Para correção de bugs e regras de negócio críticas:
   - Criar ou apontar um teste automatizado que **falha** evidenciando o defeito (vermelho);
   - Aplicar a correção;
   - Executar o teste e comprovar que agora ele **passa** (verde).
3. **Registro de pendências:** Se algo não pôde ser testado ou validado no momento (ex.: dependência externa ausente, serviço offline), marcar explicitamente como `[a confirmar]` e descrever a pendência.

---

## 3. Segurança e Segredos

1. **Nunca versionar segredos:** Arquivos `.env`, senhas, tokens JWT e chaves privadas jamais devem ser commitados no Git ou expostos em logs.
2. **Configuração via ambiente:** Utilizar `.env.example` com placeholders claros (`POSTGRES_PASSWORD=sua_senha_aqui`, etc.).
3. **Princípio do Menor Privilégio:** Rotas e operações no back-end devem validar explicitamente o perfil do usuário (`ADMIN`, `ALMOXARIFE`, `ENGENHARIA`, `ADMINISTRACAO`, `ENCARREGADO`).

---

## 4. Padrões de Código e Arquitetura (Node.js + TypeScript + Prisma)

1. **Tipagem Estrita:** TypeScript configurado com `strict: true`. Proibido o uso injustificado de `any`.
2. **Clean Architecture Pragmática:**
   - **Domain:** Entidades e regras puras de negócio. Não importa bibliotecas de infraestrutura.
   - **Use Cases / Application:** Casos de uso específicos (um propósito por arquivo/classe: `CriarMaterialUseCase`, `RegistrarBaixaUseCase`).
   - **Repositories:** Interfaces (portas) no domínio e implementações concretas usando Prisma na infraestrutura.
   - **Http / Presentation:** Rotas, controllers e validação de schema (Zod). O controller **nunca** acessa o banco diretamente; ele apenas valida a entrada e invoca o caso de uso.
3. **Validação de Entrada:** Schemas declarativos com **Zod** para todo payload de entrada (body, params, query).
4. **Respostas e Tratamento de Erros:**
   - Formato padronizado: `{ "erro": "Mensagem clara" }` ou `{ "erro": "Dados invalidos", "campos": { "campo": "detalhe" } }`.
   - Códigos HTTP:
     - `400`: Dados malformados ou validação Zod reprovada.
     - `401`: Credenciais inválidas, token ausente ou expirado.
     - `403`: Usuário autenticado sem o perfil exigido.
     - `404`: Recurso inexistente (ou recurso de outra obra).
     - `409`: Conflito de integridade no banco (ex.: código ou login duplicado capturado pelo Prisma).
     - `422`: Regra de negócio violada (ex.: obra inativa tentando receber área).
     - `500`: Erro interno inesperado.
5. **Imutabilidade e Idempotência:**
   - IDs gerados como `UUID` no caso de uso ou cliente, preparando a aplicação para funcionamento offline e idempotência via header `Idempotency-Key`.
   - Registros do livro-razão (`movimentacao_estoque`) são **estritamente imutáveis** (apenas inserção; correções exigem estorno).

---

## 5. Fluxo de Git e Pull Requests

1. **Estratégia de Branches:**
   - `main`: Código estável pronto para produção/entrega.
   - `develop`: Branch de integração diária.
   - `feature/Txx-descricao`: Uma branch dedicada para cada sub-etapa de uma task (ex.: `feature/T07-unidades-medida`).
2. **Padrão de Commits (Conventional Commits):**
   - Formato: `tipo(escopo): descricao em minusculas sem ponto final e sem acento`.
   - Exemplos: `feat(obra): adicionar validacao de codigo unico`, `fix(auth): ajustar expiracao do token jwt`.
3. **Abertura de Pull Requests:**
   - Sempre fornecer o texto estruturado do PR contendo:
     - **Título:** ex.: `feat(T07): cadastro de unidades de medida e categorias`
     - **O que foi feito:** lista dos itens implementados.
     - **Como testar:** passo a passo reproduzível.
     - **Evidências:** checklist com `[x]` apenas para o que foi efetivamente testado.
     - **Riscos e observações:** potenciais impactos colaterais ou pontos de atenção.
   - PRs devem ser mesclados com **Merge Commit** (`git merge --no-ff`), preservando o histórico empilhado.

---

## 6. Armadilhas Frequentes no Ambiente Windows

1. **Codificação de Arquivos:** Sempre salvar arquivos em **UTF-8 sem BOM**.
2. **PowerShell 5.1:**
   - Evitar acentos literais em payloads enviados via curl/Invoke-RestMethod no terminal powershell.
   - Para rodar scripts locais ou comandos Node/Prisma, assegurar que o terminal esteja no diretório correto (`backend/` ou `frontend/`).
3. **Docker Desktop:**
   - Certificar-se de que o Docker Desktop está em execução antes de rodar comandos de migration ou testes que dependam do PostgreSQL.
   - A porta mapeada para o banco é **5433** no host (redirecionada para 5432 no container) para não colidir com eventuais instâncias locais do PostgreSQL.
