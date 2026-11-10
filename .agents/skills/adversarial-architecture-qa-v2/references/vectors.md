# Os 12 vetores de ataque

Cada vetor tem: **pergunta**, **sinais** (onde olhar), **como reproduzir**, **padrão de
correção** e **regressão** (que teste deixar). Os exemplos usam TypeScript/SQL/RabbitMQ,
mas os princípios valem para qualquer stack (Kafka, SQS, gRPC, Java, Go...).

Severidade sugerida: 🔴 crítico (dinheiro, dados, privilégio, perda de evento) ·
🟠 alto (corrupção sob carga, Saga travada) · 🟡 médio (credibilidade, operação).

---

## V1 — Zero trust do cliente 🔴

**Pergunta:** o que o cliente envia que o servidor aceita como verdade?

**Sinais**
- Schemas de criação com `price`, `total`, `amount`, `discount`, `status`, `role`,
  `userId`, `ownerId`, `isAdmin`, `approved`.
- Total calculado a partir de itens do body ("calcula no servidor" com preço do cliente
  ainda é preço do cliente).
- Campos de "simulação"/debug que mudam regra de negócio (`simulateOutcome: 'APPROVED'`
  pode furar antifraude).
- `userId` lido do body em vez do token.

**Reproduzir:** envie a requisição legítima com o campo adulterado (preço 0.01,
`userId` de outra pessoa, `status: PAID`) e confira o efeito persistido.

**Correção:** o cliente envia apenas intenção (`productId`, `quantity`). Valores vêm da
fonte de verdade (catálogo, tabela de preços) e identidade vem do token. Ganchos de
demonstração só podem *piorar* o resultado (forçar falha), nunca aprovar.

**Regressão:** teste unitário do use case com fake do catálogo + cenário E2E que envia
o campo adulterado e verifica o valor cobrado.

---

## V2 — Identidade e autorização 🔴

**Pergunta:** quem atribui papéis, e cada recurso verifica dono/papel?

**Sinais**
- Cadastro público que aceita `role`/`isAdmin` (o caso mais grave e mais esquecido:
  anula todas as proteções "somente admin" de uma vez).
- Atalhos de dev no frontend que *criam* contas admin.
- Rotas com `requireAuth` mas sem checagem de posse (IDOR): `/orders/:id`,
  `/payments/:orderId`, `/invoices/:id`, `/users/:id`.
- Endpoints internos/operacionais da Saga (`/saga-event`, `/reserve`, `/process`,
  `/release`) acessíveis a qualquer usuário autenticado.
- Endpoint restrito a ADMIN quando deveria ser "dono ou ADMIN" (o cliente não vê o
  próprio pagamento) — erro funcional, não de segurança, mas conta.

**Reproduzir:** registre-se com `role: ADMIN` e veja o papel retornado; com o token de
um cliente A, acesse o recurso do cliente B; com token de cliente, chame os endpoints
internos.

**Correção:** papéis privilegiados só por provisionamento do servidor (bootstrap por
variável de ambiente, migração, painel interno); cadastro público força o papel
mínimo. Regra de posse dentro do use case (`resource.ownerId === requester.id ||
requester.role === 'ADMIN'`), não só no middleware. Endpoints internos exigem ADMIN
ou credencial de serviço — ou não são expostos pelo gateway.

**Regressão:** teste do use case de posse (dono / admin / intruso) + E2E de escalada.

---

## V3 — Borda, proxy e rate limit 🔴

**Pergunta:** as proteções de borda resistem a quem controla a requisição?

**Sinais**
- Serviços atrás de proxy aplicando rate limit por `req.ip` sem `trustProxy`: todos os
  clientes têm o IP do proxy → o limite "por IP" vira **global** (um cliente
  agressivo bloqueia o site inteiro).
- `trustProxy` ligado com o proxy *anexando* `X-Forwarded-For`
  (`$proxy_add_x_forwarded_for`): o cliente forja o próprio IP e escapa do limite.
- Erros do gateway em HTML (429/502) quebrando clientes que esperam JSON.
- CORS `*` com credenciais; headers de identidade (`X-User-Id`) aceitos do cliente.

**Reproduzir:** dispare N requisições de um cliente e veja se outro cliente é
bloqueado; envie `X-Forwarded-For` aleatório a cada requisição e veja se o limite
some; force um 429 e confira o `Content-Type`.

**Correção:** a borda sobrescreve `X-Forwarded-For` com `$remote_addr`; os serviços
confiam no proxy apenas a partir de redes privadas (`trustProxy: 'loopback,
uniquelocal'` ou lista explícita); páginas de erro do gateway em JSON com
`Retry-After` e correlation id.

**Regressão:** teste de carga leve no E2E com cliente que respeita `Retry-After`;
verificação manual documentada de spoof.

---

## V4 — Concorrência (check-then-act / TOCTOU) 🔴

**Pergunta:** existe leitura seguida de escrita sobre um recurso disputado?

**Sinais**
- `findUnique`/`SELECT` de saldo seguido de `update`/`decrement` (estoque, saldo,
  limite de crédito, vagas, cupom de uso único).
- Unicidade verificada na aplicação sem constraint (`if (!exists) create`).
- Consumers sem `prefetch`/limite: processam muitas mensagens em paralelo.
- Ausência de `CHECK (qty >= 0)` ou `UNIQUE` no banco.

**Reproduzir:** estado com saldo pequeno (ex.: 5) e N≫saldo requisições
**simultâneas** (`Promise.all`, `xargs -P`, `&` no shell) contra a stack real. Confira
o estado final no banco.

**Correção:** decremento condicional atômico e checagem de linhas afetadas:

```sql
UPDATE inventory_items
   SET available_qty = available_qty - $1, reserved_qty = reserved_qty + $1
 WHERE sku = $2 AND available_qty >= $1;   -- 0 linhas afetadas = sem saldo
```

Com vários itens, faça tudo numa transação e aborte (rollback) no primeiro item sem
saldo; registre a rejeição numa transação separada. Adicione `CHECK` como última
barreira e trate violação de unicidade concorrente (ex.: Prisma `P2002`) como
"já processado", não como erro para a DLQ. Alternativas: `SELECT ... FOR UPDATE`,
lock otimista com versão.

**Regressão:** E2E/integração com banco real: N pedidos simultâneos por M unidades ⇒
exatamente M aprovados e saldo final 0. **Nunca** com fake em memória.

---

## V5 — Atomicidade entre estado e evento 🔴

**Pergunta:** existe janela em que o estado muda sem o evento sair (ou o contrário)?

**Sinais**
- `publish()` dentro do use case/controller após (ou antes de) gravar no banco.
- Outbox existe, mas o relay marca `published = true` logo após `channel.publish()`
  — que só escreve no buffer local, não confirma recebimento.
- Relay sem proteção contra execução sobreposta (`setInterval` com handler async
  lento) ou com várias réplicas sem `FOR UPDATE SKIP LOCKED`.

**Reproduzir:** pare o broker, execute a operação, verifique que o evento ficou
pendente na outbox; religue e verifique que foi entregue e o fluxo concluiu. Mate o
serviço entre gravar e publicar (se o código publicar direto, o evento some).

**Correção:** Transactional Outbox (estado + evento na mesma transação); relay com
**publisher confirms** (`createConfirmChannel` + callback por publish ou
`waitForConfirms`) e só então `published = true`; guarda de reentrância; `SKIP LOCKED`
para réplicas. Aceite at-least-once e garanta idempotência no consumidor (V6).

**Regressão:** teste de caos documentado/automatizado (broker parado durante a
criação ⇒ pedido conclui após religar).

---

## V6 — Entrega duplicada e mensagens venenosas 🟠

**Pergunta:** a mesma mensagem processada duas vezes causa efeito duplo? Uma mensagem
ruim trava ou some?

**Sinais**
- Consumer sem chave de idempotência (`messageId` → tabela `processed_messages`) na
  **mesma transação** do efeito.
- `ack` antes de concluir o efeito; `ack` também no erro (mensagem perdida); `nack`
  com requeue infinito (loop quente).
- Fila sem dead-letter exchange.
- Idempotência só por "já existe registro?" sem constraint (corrida entre duas
  entregas simultâneas).

**Reproduzir:** publique a mesma mensagem 10× em paralelo (mesmo `messageId`) e
confira que o efeito ocorreu uma vez; publique um payload inválido e confira que foi
para a DLQ sem travar a fila.

**Correção:** registro de mensagem processada + efeito na mesma transação, com
`UNIQUE(messageId)`; transições condicionais (`UPDATE ... WHERE status = 'RESERVED'`);
`nack(requeue=false)` para a DLQ em erro; DLQ por fila.

**Regressão:** teste de reentrega concorrente contra banco real; teste unitário do
caminho "ALREADY_PROCESSED".

---

## V7 — Contrato de eventos 🔴

**Pergunta:** cada evento carrega tudo o que **todos** os consumidores precisam?

**Sinais**
- Evento intermediário que "esquece" campos do anterior (`STOCK_RESERVED` sem `total`
  e `userId` ⇒ pagamento calcula 0 e aprova tudo, antifraude nunca dispara,
  compensação nunca acontece).
- Consumidor com fallback silencioso (`amount ?? 0`, `userId ?? 'SYSTEM'`) que esconde
  campo faltando.
- Documentação de eventos divergente do payload real.

**Reproduzir:** leia a última linha da outbox de cada evento e compare com o que cada
consumidor lê; rode o fluxo que depende do campo (ex.: compra acima do limite
antifraude) e confira o desfecho.

**Correção:** payload completo e explícito; consumidor falha (DLQ) em vez de
assumir default para campo de negócio; contrato documentado e testado.

**Regressão:** teste de contrato (payload gravado satisfaz o consumidor) + cenário E2E
que só passa se o campo trafegar (ex.: antifraude).

---

## V8 — Máquina de estados e completude da Saga 🟠

**Pergunta:** algum estado regride? Todo estado intermediário tem saída garantida?

**Sinais**
- Guardas do tipo "se já está PAID, ignora" mas não "se está CANCELLED, ignora" ⇒
  evento atrasado ressuscita pedido cancelado.
- Estados intermediários sem transição de saída: reserva que nunca vira baixa
  definitiva (`reserved_qty` só cresce), reserva que nunca expira se o pagamento não
  responder, pedido eternamente `PENDING` se o broker estiver fora.
- Transições disparáveis por HTTP por quem não deveria (ver V2).

**Reproduzir:** envie eventos fora de ordem (aprovação depois de cancelamento);
acompanhe um recurso do início ao fim e confira o estado final de **todos** os
serviços (não só o do pedido: o estoque reservado voltou a zero?).

**Correção:** tabela explícita de transições permitidas; estados terminais imutáveis
(atenção: `COMPLETED → REFUNDED` pode ser legítimo — terminal é o que o domínio diz);
cada estado intermediário com evento de saída **e** expiração/timeout quando depender
de terceiros.

**Regressão:** testes unitários de transição inválida + E2E que verifica o estado
final em todos os serviços (inclusive `reserved = 0` após pagamento).

---

## V9 — Resiliência de infraestrutura 🔴/🟠

**Pergunta:** o sistema sobe do zero, sobrevive à queda de dependências e se recupera
sozinho?

**Sinais**
- `depends_on` sem `condition: service_healthy`; broker/banco sem healthcheck.
- Conexão com broker feita uma vez no boot, com `catch` que só loga e segue — o
  serviço fica "up" **sem mensageria para sempre** (o pior modo de falha: silencioso).
- Sem handler de `close`/`error` na conexão; sem reconexão com backoff; topologia
  (filas, bindings, consumers) não redeclarada após reconectar.
- Health check que ignora dependências (responde 200 sem banco ou sem broker).
- Chamadas HTTP entre serviços sem timeout.

**Reproduzir:** `docker compose down && docker compose up -d` e leia os logs de cada
serviço procurando "could not connect"/`ECONNREFUSED`; pare o broker com o sistema
rodando, faça operações, religue e confira a recuperação; derrube o serviço chamado
de forma síncrona e veja o tempo de resposta do chamador.

**Correção:** healthchecks em toda dependência e `service_healthy`; conexão
resiliente com backoff exponencial limitado e redeclaração de topologia; health
retorna 503 com o estado de cada dependência; workers sem HTTP sinalizam prontidão
(arquivo/porta) para o orquestrador; timeouts em toda chamada síncrona.

**Regressão:** CI que sobe a stack do zero com `--wait` antes do E2E; teste de caos
documentado.

---

## V10 — Caminho real do tráfego 🟠

**Pergunta:** o gateway pode ser contornado? O que está exposto?

**Sinais**
- Frontend/scripts apontando para portas de serviços (`:3000`, `:3004`) em vez do
  gateway — rate limit, auth de borda e correlation id viram código morto.
- `ports:` publicados no host para serviços internos e bancos sem necessidade.
- Health/admin endpoints internos expostos publicamente.

**Reproduzir:** `docker compose ps` (portas publicadas); `curl` direto nas portas dos
serviços; inspecione as URLs base do frontend e dos scripts.

**Correção:** uma única URL base (gateway) em frontend, scripts e testes; serviços sem
`ports:` no host; health de cada serviço exposto pelo gateway em rota própria.

**Regressão:** E2E que roda **só** pelo gateway (falha se alguém reexpor portas e
apontar para elas é aceitável — o objetivo é o caminho testado ser o caminho real).

---

## V11 — Observabilidade e rastreabilidade 🟡

**Pergunta:** dá para seguir uma requisição por todos os serviços **e filas**?

**Sinais**
- Correlation id gerado no gateway mas não gravado na outbox nem enviado como
  propriedade/header da mensagem — a trilha morre na primeira fila.
- Logs sem o id; header duplicado (gateway e serviço adicionam o mesmo header).
- Nenhuma forma documentada de reconstruir um fluxo.

**Reproduzir:** faça uma operação, pegue o id da resposta e `grep` nos logs de todos
os serviços. Conte em quantos ele aparece.

**Correção:** id aceito do cliente ou gerado na borda → coluna `correlationId` na
outbox → propriedade da mensagem → restaurado no consumer (ex.: `AsyncLocalStorage`)
→ herdado pelo próximo evento. Logar id em cada passagem. Evoluir para tracing com
spans (OpenTelemetry) quando fizer sentido.

**Regressão:** E2E que envia um id próprio e verifica o eco; roteiro de `grep`
documentado no README.

---

## V12 — Higiene, ferramentas e documentação 🟡

**Pergunta:** o repositório, os scripts e os docs dizem a verdade?

**Sinais**
- Scripts (seed, migração, setup) que imprimem "sucesso" sem verificar o efeito —
  ou que leem o campo errado da resposta e seguem em frente.
- Suítes de teste que deixam dados na demo (produtos/contas de teste visíveis).
- README/docs com afirmações que o código não cumpre (banco por serviço que não é
  usado, "propagado por todos os serviços", contagem de testes desatualizada,
  terminologia errada como "coordinator" numa Saga coreografada).
- Docs desatualizados listando como "débito" o que já foi resolvido (ou o inverso).
- Artefatos gerados e metadados de ferramentas versionados (`graphify-out/`,
  `.obsidian/`, caches); `.gitignore` adicionado sem `git rm --cached`.
- Segredos reais em `.env` versionado; ausência de `LICENSE`.

**Reproduzir:** rode cada script do README do zero e confira o efeito no banco; liste
as afirmações do README e marque cada uma como verificada/falsa; `git ls-files` por
artefatos gerados.

**Correção:** scripts que falham alto (`exit 1`) e checam o efeito; suítes que limpam
o que criam; docs reescritos a partir do código (código vence); limitações conhecidas
declaradas.

**Regressão:** o próprio CI roda o seed e o E2E; revisão de docs como item de PR.
