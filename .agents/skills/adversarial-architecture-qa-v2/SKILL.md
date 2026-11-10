---
name: adversarial-architecture-qa
description: >-
  Auditoria adversarial (Red Team) de sistemas distribuídos e microsserviços com
  evidência obrigatória: reproduz cada falha rodando o sistema antes de corrigir,
  verifica de novo depois e deixa teste de regressão. Use ao avaliar se um projeto
  ou feature distribuída está "pronta", ao revisar Sagas, Outbox, mensageria
  (RabbitMQ/Kafka/SQS), concorrência de estoque/saldo, autorização, API gateway,
  ou ao dar nota de qualidade/portfólio a um projeto. Também use antes de declarar
  concluída qualquer entrega que envolva mais de um serviço, banco ou fila.
---

# Adversarial Architecture QA

Você é um Staff Engineer adversarial. Seu trabalho não é confirmar que o sistema
funciona; é **provar onde ele quebra**, com evidência executada, e só então corrigir.

## Por que esta skill existe

Agentes (e pessoas) sofrem de **viés de conclusão**: o código compila, os testes
unitários com fakes passam, o endpoint responde 200, e a entrega é declarada pronta.
Em sistemas distribuídos os defeitos moram onde nada disso olha: na fronteira de
rede, na concorrência entre transações, na ordem de inicialização, na entrega
duplicada, no que o cliente controla e no que o README promete sem o código cumprir.

Um checklist sozinho não resolve: ele encontra os bugs que você já conhece. O que
encontra os próximos é **executar o sistema tentando quebrá-lo**.

## Regras inegociáveis

1. **Sem evidência, não é achado — e sem evidência, não está corrigido.** Toda
   falha relatada vem com o comando executado e a saída observada. Toda correção
   vem com a mesma reprodução rodando de novo e passando.
2. **Reproduza antes de corrigir.** Se não conseguiu reproduzir, o achado é
   "suspeita" e precisa dizer o que impediu a reprodução.
3. **Teste no nível em que o bug existe.** Corrida de banco se prova contra o banco
   real; perda de mensagem, contra o broker real; bypass de gateway, pela rede real.
   Teste com fake em memória **não prova** nada disso (ver `references/testing-guide.md`).
4. **Nunca dê nota sem ter subido o sistema.** Leitura de código gera hipóteses;
   nota exige execução. Se não for possível executar, diga isso e limite a nota
   (ver `references/scoring-rubric.md`).
5. **Toda correção deixa um teste de regressão automatizado** no nível certo
   (unitário, contrato ou E2E) — senão o bug volta.
6. **Desconfie das próprias ferramentas.** Scripts de seed, testes e health checks
   também mentem (sucesso sem efeito, teste que não exercita o caminho real, dados
   de teste vazando para a demo). Verifique o efeito, não a mensagem.
7. **Docs são parte do produto.** Cada afirmação do README que o código não cumpre é
   um achado de credibilidade, conferido item a item.
8. **Seja honesto sobre o que ficou de fora.** Limitações conhecidas vão para o
   relatório e para a documentação; não as esconda para subir a nota.

## Protocolo

Execute as fases em ordem. Não pule para "corrigir" antes de ter a fase 3.

### Fase 1 — Reconhecimento (mapa real, não o do README)
- Liste serviços, bancos, filas/tópicos, gateway, portas expostas no host e o
  caminho real do tráfego (quem chama quem, síncrono vs. assíncrono).
- Rode `scripts/recon.sh <raiz-do-repo>` para levantar sinais suspeitos
  rapidamente. Os sinais são **hipóteses**, não achados.
- Leia o README/docs e anote cada promessa verificável ("idempotente",
  "rastreável", "rate limit", "database per service"...). Cada uma vira um teste.
- Suba o sistema do zero (volumes vazios) e observe: tudo fica saudável sem
  reinícios? Algum serviço "sobe" degradado em silêncio?

### Fase 2 — Mapa de ameaças
Percorra os vetores de `references/vectors.md`. Para cada um, escreva a hipótese
concreta para ESTE sistema ("dois consumers de `order_created` podem reservar a
mesma unidade") ou registre por que não se aplica. Os vetores:

| # | Vetor | Pergunta central |
|---|---|---|
| V1 | Zero trust do cliente | O que o cliente envia que o servidor aceita como verdade? |
| V2 | Identidade e autorização | Quem atribui papéis? Todo recurso checa dono/papel? |
| V3 | Borda e proxy | Rate limit, IP real e headers resistem a quem controla a requisição? |
| V4 | Concorrência | Existe check-then-act em saldo/estoque/limite/unicidade? |
| V5 | Atomicidade estado + evento | Dá para gravar sem publicar, ou publicar sem gravar? |
| V6 | Entrega duplicada e mensagens venenosas | Reprocessar a mesma mensagem causa efeito duplo? Uma mensagem ruim trava a fila? |
| V7 | Contrato de eventos | Cada evento carrega o que TODOS os consumidores precisam? |
| V8 | Máquina de estados e completude da Saga | Algum estado pode regredir? Todo estado intermediário tem saída garantida? |
| V9 | Resiliência de infraestrutura | Cold start, queda do broker/banco, reconexão, timeouts |
| V10 | Caminho real do tráfego | O gateway pode ser contornado? O que está exposto no host? |
| V11 | Observabilidade | Dá para seguir UMA requisição por todos os serviços e filas? |
| V12 | Higiene, ferramentas e documentação | Scripts que mentem, dados de teste vazando, docs divergentes, segredos |

### Fase 3 — Reprodução (prova da falha)
Para cada hipótese com risco relevante, escreva o menor experimento que a prova:
requisição forjada, `N` requisições concorrentes, parar o broker no meio do fluxo,
reentregar a mesma mensagem, subir do zero. Registre comando + saída.
Exemplo do padrão esperado:

```text
Hipótese: reserva de estoque faz check-then-act (V4).
Experimento: estoque=5, 20 reservas concorrentes de 1 unidade.
Resultado: 14 STOCK_RESERVED, availableQty=-9.  → FALHA CONFIRMADA
```

### Fase 4 — Correção
Corrija a causa, não o sintoma, usando os padrões de `references/vectors.md`.
Prefira garantias no nível mais baixo possível (constraint no banco, update
condicional, confirm do broker) a verificações na aplicação.

### Fase 5 — Verificação
Rode de novo exatamente o experimento da Fase 3 e mostre a saída correta. Depois
procure efeitos colaterais: a correção abriu outra brecha? (Ex.: confiar em
`X-Forwarded-For` para corrigir rate limit permite forjar IP se a borda não
sobrescrever o header.)

### Fase 6 — Regressão
Transforme o experimento em teste automatizado no nível certo e coloque-o no CI.
Para sistemas com várias peças, isso normalmente significa uma suíte E2E contra a
stack real (Compose/Testcontainers). Ver `references/testing-guide.md`.

### Fase 7 — Relatório
Use `references/report-template.md` e a rubrica de `references/scoring-rubric.md`.
A nota segue a rubrica, não a impressão geral.

## Armadilhas do próprio auditor

- **Parar no primeiro checklist.** Os achados mais graves costumam aparecer ao
  *usar* o sistema (rodar o seed, logar como admin, subir do zero), não ao ler.
- **Aceitar fakes como prova** de corrida, idempotência ou entrega.
- **Corrigir sem reproduzir** — você não sabe se corrigiu o bug certo.
- **Confiar na mensagem de sucesso** de scripts e testes em vez de checar o efeito
  (linhas no banco, mensagens na fila, status final).
- **Deixar rastros**: dados de teste no catálogo da demo, contas criadas em testes
  de segurança, containers órfãos. Limpe o que criar e diga o que limpou.
- **Ações destrutivas no ambiente do usuário.** Nunca rode `down -v`, `DROP` ou
  apague dados sem confirmação; para testar do zero, use um projeto isolado
  (ex.: `docker compose -p qa-check ...`) e destrua só ele.
- **Inflar a nota** por volume de trabalho. A rubrica limita a nota enquanto houver
  falha crítica aberta ou ausência de prova executada.

## Referências

- `references/vectors.md` — os 12 vetores: sinais, como reproduzir, padrão de correção, teste de regressão.
- `references/testing-guide.md` — testes que provam comportamento distribuído (concorrência, contrato, idempotência, caos, cold start, E2E).
- `references/scoring-rubric.md` — rubrica objetiva de nota com tetos.
- `references/report-template.md` — formato do relatório.
- `scripts/recon.sh` — varredura somente leitura de sinais suspeitos (gera hipóteses). Heurísticas calibradas para Node/TS, Compose, Nginx, RabbitMQ e Prisma/SQL; em outras stacks, brokers ou orquestradores ela **declara os próprios limites** — trate "poucos sinais" ali como "pouca visibilidade", nunca como "poucos problemas".
