#!/usr/bin/env bash
# recon.sh — varredura SOMENTE LEITURA de sinais suspeitos em sistemas distribuídos.
#
# Uso: recon.sh [raiz-do-repo]
#
# Cada linha "⚑" é uma HIPÓTESE a confirmar na Fase 3 (reprodução), não um achado.
# Ausência de sinal também não prova nada: a varredura é heurística (Node/TS, Compose,
# Nginx, RabbitMQ, Prisma/SQL) e serve para priorizar onde olhar primeiro.

set -uo pipefail

ROOT="${1:-.}"
cd "$ROOT" || { echo "diretório inválido: $ROOT" >&2; exit 2; }

EXCLUDES=(--exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build
          --exclude-dir=.git --exclude-dir=coverage --exclude-dir=.next)
CODE_INCLUDES=(--include=*.ts --include=*.tsx --include=*.js --include=*.mjs
               --include=*.cjs --include=*.go --include=*.java --include=*.kt
               --include=*.py --include=*.cs)

FLAGS=0
section() { printf '\n\033[1m== %s\033[0m\n' "$1"; }
flag()    { FLAGS=$((FLAGS + 1)); printf '  ⚑ %s\n' "$1"; }
show()    { sed 's/^/      /' | head -n "${1:-8}"; }
ok()      { printf '  ✓ %s\n' "$1"; }

code_grep() { grep -rnE "${EXCLUDES[@]}" "${CODE_INCLUDES[@]}" "$@" . 2>/dev/null; }
code_files() { grep -rlE "${EXCLUDES[@]}" "${CODE_INCLUDES[@]}" "$@" . 2>/dev/null; }
is_test() { grep -qE '(\.test\.|\.spec\.|__tests__|/e2e|/scripts/)' <<<"$1"; }

COMPOSE=$(ls docker-compose*.y*ml compose*.y*ml 2>/dev/null | head -n1)
NGINX=$(find . -name 'nginx*.conf' -not -path '*/node_modules/*' 2>/dev/null | head -n1)

echo "Recon adversarial em: $(pwd)"
[ -n "$COMPOSE" ] && echo "compose: $COMPOSE"
[ -n "$NGINX" ] && echo "gateway: $NGINX"

# ---------------------------------------------------------------------------
# Cobertura desta varredura: as heurísticas foram escritas para Node/TS + Compose + Nginx +
# RabbitMQ (amqplib) + Prisma/SQL. Fora disso a varredura vê menos — e precisa dizer isso.
LIMITS=()
count_ext() { find . -type f -name "*.$1" -not -path '*/node_modules/*' -not -path '*/target/*' -not -path '*/vendor/*' -not -path '*/.venv/*' 2>/dev/null | wc -l; }
ts=$(( $(count_ext ts) + $(count_ext js) )); java=$(( $(count_ext java) + $(count_ext kt) )); py=$(count_ext py)
go=$(count_ext go); cs=$(count_ext cs); rs=$(count_ext rs)
stack=""
[ "$ts" -gt 0 ] && stack+="node/ts($ts) "; [ "$java" -gt 0 ] && stack+="jvm($java) "; [ "$py" -gt 0 ] && stack+="python($py) "
[ "$go" -gt 0 ] && stack+="go($go) "; [ "$cs" -gt 0 ] && stack+="dotnet($cs) "; [ "$rs" -gt 0 ] && stack+="rust($rs) "
echo "stack (arquivos): ${stack:-nenhum código reconhecido}"

others=$((java + py + go + cs + rs))
if [ "$ts" -eq 0 ] && [ "$others" -gt 0 ]; then
  LIMITS+=("Código não é Node/TS: os padrões de V1-V8 e V11 são escritos para TS/JS; em Java/Python/Go/C#/Rust só alguns casam por acaso. Percorra esses vetores manualmente.")
elif [ "$others" -gt "$ts" ]; then
  LIMITS+=("Repositório majoritariamente fora de Node/TS: a parte em outras linguagens é coberta só parcialmente.")
fi
if grep -rqE "kafkajs|@aws-sdk/client-sqs|spring-kafka|confluent_kafka|kafka-python|sarama|segmentio/kafka-go|nats|@google-cloud/pubsub|pika|Azure\.Messaging" . \
     --include='*.json' --include='*.ts' --include='*.js' --include='*.py' --include='*.go' --include='*.java' \
     --include='*.kt' --include='*.cs' --include='*.xml' --include='*.gradle' --include='*.toml' --include='go.mod' \
     --exclude-dir=node_modules --exclude-dir=target --exclude-dir=vendor 2>/dev/null; then
  LIMITS+=("Broker diferente de RabbitMQ/amqplib detectado (Kafka/SQS/NATS/Pub-Sub...): as checagens de confirms, prefetch e reconexão (V5, V6, V9) não se aplicam ao pé da letra — verifique acks/commits de offset, idempotência e DLQ do broker real.")
fi
if [ -z "$COMPOSE" ]; then
  if grep -rlqE "^kind: (Deployment|StatefulSet|Service)" . --include='*.yaml' --include='*.yml' 2>/dev/null; then
    LIMITS+=("Sem docker-compose, mas há manifestos Kubernetes: V9/V10 (healthchecks, ordem de subida, portas expostas) precisam ser verificados nos probes, Services e Ingress — a varredura não lê isso.")
  else
    LIMITS+=("Sem docker-compose: as checagens de infraestrutura (V9 healthchecks/ordem de subida, V10 portas expostas) foram puladas.")
  fi
fi
[ -z "$NGINX" ] && LIMITS+=("Sem nginx.conf: as checagens de borda (V3 X-Forwarded-For/429, V10) foram puladas; se houver outro gateway (Traefik, Kong, API Gateway de nuvem), verifique-o manualmente.")
if [ "${#LIMITS[@]}" -gt 0 ]; then
  echo
  echo "LIMITES DESTA VARREDURA (o que ela NÃO consegue ver aqui):"
  for l in "${LIMITS[@]}"; do echo "  ! $l"; done
fi

# ---------------------------------------------------------------------------
section "V1 — Zero trust do cliente"
hits=$(code_grep '\b(price|unitPrice|total|amount|discount)\b[[:space:]]*:[[:space:]]*\{[[:space:]]*type' \
       | grep -viE 'response|reply|test|spec|/models?/|schema\.ts|entities/' )
if [ -n "$hits" ]; then
  flag "Schemas de entrada aceitam campo financeiro — o servidor usa esse valor como verdade?"
  echo "$hits" | show
fi
hits=$(code_grep '\b(simulate[A-Z][A-Za-z]*|debugMode|force[A-Z][A-Za-z]*|bypass[A-Z][A-Za-z]*)[[:space:]]*[?]?[:=]' | grep -viE 'test|spec' )
[ -n "$hits" ] && { flag "Campos de simulação/debug alcançáveis pelo cliente — só podem PIORAR o resultado?"; echo "$hits" | show 5; }
hits=$(code_grep '(body|params|query)\.(userId|ownerId|customerId|role|isAdmin)\b')
[ -n "$hits" ] && { flag "Identidade/papel lido da requisição em vez do token"; echo "$hits" | show 5; }

# ---------------------------------------------------------------------------
section "V2 — Identidade e autorização"
hits=$(code_grep "role[[:space:]]*:[[:space:]]*\{[^}]*enum[^}]*ADMIN" | grep -viE 'response|test|spec')
[ -n "$hits" ] && { flag "Schema de entrada aceita papel ADMIN — cadastro público pode escolher papel?"; echo "$hits" | show 5; }
hits=$(code_grep "register\([^)]*\)|role:[[:space:]]*['\"]ADMIN['\"]" | grep -iE 'frontend|src/pages|src/components|client' | grep -viE 'test|spec')
[ -n "$hits" ] && { flag "Frontend cria/registra contas com papel privilegiado"; echo "$hits" | show 5; }
hits=$(code_grep "['\"]/[a-z/:_-]*(saga|reserve|release|process|internal|admin)[a-z/:_-]*['\"]" \
       | grep -E '\.(get|post|put|patch|delete)\(|path' | grep -viE 'test|spec|frontend')
if [ -n "$hits" ]; then
  flag "Rotas operacionais/internas — conferir se exigem ADMIN ou credencial de serviço:"
  echo "$hits" | show 10
fi

# ---------------------------------------------------------------------------
section "V3 — Borda, proxy e rate limit"
if code_files 'rate-?limit|rateLimit' >/dev/null && [ -n "$NGINX" ]; then
  if ! code_grep 'trustProxy|trust proxy|X-Forwarded-For' >/dev/null; then
    flag "Rate limit nos serviços atrás de proxy sem trustProxy: todo cliente tem o IP do gateway (limite vira GLOBAL)"
  fi
fi
if [ -n "$NGINX" ]; then
  grep -nE 'proxy_add_x_forwarded_for' "$NGINX" >/dev/null && \
    flag "Gateway ANEXA X-Forwarded-For (\$proxy_add_x_forwarded_for): com trustProxy o cliente forja o próprio IP"
  grep -nE 'limit_req' "$NGINX" >/dev/null && ! grep -nE 'error_page[[:space:]]+429' "$NGINX" >/dev/null && \
    flag "Gateway com rate limit mas sem error_page 429 em JSON (responde HTML)"
fi
hits=$(code_grep "origin:[[:space:]]*(true|['\"]\*['\"])")
[ -n "$hits" ] && { flag "CORS aberto para qualquer origem"; echo "$hits" | show 5; }

# ---------------------------------------------------------------------------
section "V4 — Concorrência (check-then-act)"
while IFS= read -r f; do
  is_test "$f" && continue
  if grep -qE '(findUnique|findFirst|findOne|SELECT )' "$f" && \
     grep -qE '(decrement|increment|-=|\+=|availableQty|balance|stock)' "$f" && \
     ! grep -qE '(updateMany|FOR UPDATE|gte:|>=[[:space:]]*\$|WHERE[^;]*>=|version)' "$f"; then
    flag "Leitura seguida de escrita sem update condicional/lock: $f"
  fi
done < <(code_files '(decrement|availableQty|balance|stock)' )
if code_files '\.consume\(|\.subscribe\(|eachMessage' >/dev/null && \
   ! code_grep 'prefetch\(|maxMessages|partitionsConsumedConcurrently|concurrency:' >/dev/null; then
  flag "Consumers sem prefetch/limite de concorrência em nenhum lugar do código"
fi
if ls -d */prisma services/*/prisma >/dev/null 2>&1 || find . -name '*.sql' -not -path '*/node_modules/*' | grep -q .; then
  find . -name '*.sql' -not -path '*/node_modules/*' -print0 2>/dev/null | xargs -0 grep -lE 'CHECK' >/dev/null 2>&1 || \
    flag "Nenhuma CHECK constraint nas migrações (saldo/estoque negativo permitido pelo banco?)"
fi

# ---------------------------------------------------------------------------
section "V5 — Atomicidade estado + evento"
pub_files=$(code_files '\.publish\(|sendToQueue\(|producer\.send\(' | while read -r f; do is_test "$f" || echo "$f"; done)
if [ -n "$pub_files" ]; then
  if ! code_grep 'createConfirmChannel|waitForConfirms|publisher.?confirm|acks:[[:space:]]*-?1|acks:[[:space:]]*.all' >/dev/null; then
    flag "Publica no broker sem publisher confirms — 'published=true' pode ser marcado sem o broker ter recebido"
    echo "$pub_files" | show
  fi
  hits=$(echo "$pub_files" | grep -iE '/use-?cases?/|/controllers?/|/handlers?/|/routes?/' )
  [ -n "$hits" ] && { flag "Publicação direta fora de relay de outbox (use case/controller)"; echo "$hits" | show; }
fi
code_grep 'outbox' >/dev/null || [ -z "$pub_files" ] || flag "Publica eventos mas não há outbox: gravar e publicar não são atômicos"

# ---------------------------------------------------------------------------
section "V6 — Duplicidade e mensagens venenosas"
if code_files '\.consume\(' >/dev/null; then
  code_grep 'x-dead-letter-exchange|deadLetter|DLQ|dlq' >/dev/null || flag "Consumers sem dead-letter: mensagem venenosa trava ou some"
  code_grep 'processed_?messages|processedMessage|idempoten' >/dev/null || flag "Nenhum registro de mensagens processadas (idempotência)"
  hits=$(code_grep 'nack\([^)]*,[[:space:]]*true\)')
  [ -n "$hits" ] && { flag "nack com requeue=true: risco de loop quente de reentrega"; echo "$hits" | show 5; }
fi

# ---------------------------------------------------------------------------
section "V7 — Contrato de eventos"
hits=$(code_grep '(amount|total|price|userId)[[:space:]]*(\?\?|\|\|)[[:space:]]*(0|["'"'"']SYSTEM|["'"'"']unknown)' | grep -viE 'test|spec')
[ -n "$hits" ] && { flag "Fallback silencioso em campo de negócio de evento — esconde campo faltando no payload"; echo "$hits" | show; }

# ---------------------------------------------------------------------------
section "V8 — Máquina de estados"
hits=$(code_grep "status[[:space:]]*===[[:space:]]*['\"](PAID|COMPLETED|APPROVED)['\"]\)[[:space:]]*return" \
       | grep -viE 'test|spec' | grep -vE 'CANCEL|REJECT|FAIL|REFUND' \
       | while IFS=: read -r file line _; do
           # guarda de estado terminal logo abaixo também conta
           sed -n "${line},$((line + 6))p" "$file" | grep -qE 'CANCEL|REJECT|FAIL' || echo "$file:$line"
         done)
[ -n "$hits" ] && { flag "Guarda só contra o próprio estado-alvo — estados terminais (ex.: CANCELLED) também estão protegidos?"; echo "$hits" | show 5; }
code_grep '(reserved|RESERVED|hold|HOLD)' >/dev/null && ! code_grep '(expire|expiresAt|ttl|TTL|timeout)' >/dev/null && \
  flag "Reservas/holds sem expiração: estado intermediário pode ficar preso se a etapa seguinte não responder"

# ---------------------------------------------------------------------------
section "V9 — Resiliência de infraestrutura"
if [ -n "$COMPOSE" ]; then
  if grep -nE 'depends_on:' "$COMPOSE" >/dev/null && ! grep -nE 'service_healthy' "$COMPOSE" >/dev/null; then
    flag "depends_on sem condition: service_healthy (corrida no cold start)"
  fi
  for svc in rabbitmq kafka postgres mysql mongo redis; do
    if grep -qiE "image:.*$svc" "$COMPOSE"; then
      block=$(awk -v s="$svc" 'BEGIN{IGNORECASE=1} /^  [a-z0-9_-]+:$/{inb=0} $0 ~ "image:.*"s {inb=1} inb' "$COMPOSE")
      grep -q healthcheck <<<"$block" || flag "Dependência '$svc' sem healthcheck no compose"
    fi
  done
fi
conn_files=$(code_files 'amqp\.connect\(|new Kafka\(|createConnection\(' | while read -r f; do is_test "$f" || echo "$f"; done)
for f in $conn_files; do
  grep -qE "on\(['\"]close['\"]|reconnect|backoff|retry" "$f" || \
    flag "Conexão com broker sem reconexão/backoff: $f (cai uma vez e o serviço segue sem mensageria?)"
done
hits=$(code_grep "catch[^{]*\{[^}]*console\.warn[^}]*(RabbitMQ|broker|connect)" )
[ -n "$hits" ] && { flag "Falha de conexão tratada só com warn — serviço sobe degradado em silêncio"; echo "$hits" | show 5; }
hits=$(code_files '(^|[^A-Za-z_.])fetch\(|axios\.(get|post|put|patch|delete|request)\(' \
       | grep -viE 'test|spec|frontend|/web/|/client/|src/pages|scripts/' \
       | while read -r f; do grep -qE 'signal|timeout|AbortSignal' "$f" || echo "$f"; done)
[ -n "$hits" ] && { flag "Chamadas HTTP entre serviços sem timeout em todo o arquivo"; echo "$hits" | show 5; }

# ---------------------------------------------------------------------------
section "V10 — Caminho real do tráfego"
if [ -n "$COMPOSE" ]; then
  published=$(awk '/^  [a-z0-9_-]+:$/{svc=$1} /^    ports:/{p=1; next} p && /^      - /{print svc" "$2; next} {p=0}' "$COMPOSE")
  [ -n "$published" ] && { echo "  portas publicadas no host:"; echo "$published" | show 20; }
  [ "$(echo "$published" | grep -iE 'service|api|backend' | grep -cviE 'gateway|nginx|traefik|envoy|kong|frontend|web')" -gt 0 ] && \
    flag "Serviços internos com porta publicada no host — o gateway pode ser contornado"
fi
hits=$(grep -rnE "${EXCLUDES[@]}" --include=*.ts --include=*.tsx --include=*.js --include=*.env* \
       'localhost:(3[0-9]{3}|4[0-9]{3}|5[0-9]{3})' frontend web client apps 2>/dev/null | grep -vE ':(3002|5173|8080)')
[ -n "$hits" ] && { flag "Frontend apontando para portas de serviços em vez do gateway"; echo "$hits" | show 6; }

# ---------------------------------------------------------------------------
section "V11 — Observabilidade"
if [ -n "$pub_files" ]; then
  code_grep 'correlationId|correlation_id|traceparent|x-correlation-id' >/dev/null || \
    flag "Nenhuma propagação de correlation id / trace context"
  code_grep 'correlationId[[:space:]]*:' >/dev/null && ! code_grep '(publish|send)\([^)]*\{[^}]*correlationId|correlationId:.*correlationId' >/dev/null && \
    flag "Correlation id não parece acompanhar as mensagens publicadas (a trilha morre na fila?)"
fi

# ---------------------------------------------------------------------------
section "V12 — Higiene, ferramentas e documentação"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  tracked=$(git ls-files | grep -E '(^|/)(graphify-out|\.obsidian|\.agents|coverage|dist|build|node_modules)/' | head -n 10)
  [ -n "$tracked" ] && { flag "Artefatos gerados/metadados de ferramentas versionados"; echo "$tracked" | show; }
  envs=$(git ls-files | grep -E '(^|/)\.env$')
  [ -n "$envs" ] && { flag ".env versionado (segredos?)"; echo "$envs" | show; }
  ls LICENSE* >/dev/null 2>&1 || flag "Sem arquivo LICENSE"
fi
hits=$(code_grep "console\.log\([^)]*(sucesso|success|Concluído|done)" | grep -E 'scripts?/|seed' )
[ -n "$hits" ] && echo "  (scripts com mensagem de sucesso — conferir se verificam o efeito e fazem exit 1 em erro)" && echo "$hits" | show 4
if [ -f README.md ]; then
  claims=$(grep -noiE '(idempot[a-z]*|exactly.?once|database per service|banco[s]? (isolado|por serviço)|propagad[oa][^.]*todos|[0-9]+ testes|zero downtime|alta disponibilidade)' README.md)
  [ -n "$claims" ] && { echo "  afirmações do README a verificar executando:"; echo "$claims" | show 12; }
fi

# ---------------------------------------------------------------------------
printf '\n%d hipótese(s) levantada(s). Confirme cada uma reproduzindo (Fase 3) antes de reportar.\n' "$FLAGS"
if [ "${#LIMITS[@]}" -gt 0 ]; then
  printf 'Atenção: %d limite(s) de cobertura listados no início. Poucas hipóteses aqui NÃO significam poucos problemas.\n' "${#LIMITS[@]}"
fi
