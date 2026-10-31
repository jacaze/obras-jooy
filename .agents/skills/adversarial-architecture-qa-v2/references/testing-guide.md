# Testes que provam comportamento distribuído

## 0. A regra que invalida metade dos testes

> **Um teste só prova o que o ambiente dele consegue reproduzir.**

| Comportamento | Fake em memória prova? | Precisa de |
|---|---|---|
| Regra de negócio, cálculo, transição de estado | ✅ | unitário |
| Corrida entre transações (TOCTOU, unicidade) | ❌ — o fake roda num event loop e não tem isolamento transacional; o teste passa com o bug | banco real |
| Idempotência sob reentrega concorrente | ❌ | banco real (+ broker) |
| Perda/duplicação de mensagem, confirms, reconexão | ❌ | broker real |
| Ordem de inicialização, healthchecks | ❌ | stack real (Compose) |
| Gateway, rate limit, headers, CORS | ❌ | stack real pela rede |

Use fakes para a lógica e infraestrutura real para tudo que é distribuído. Se o
projeto só tem testes com fakes, a nota de "testes" é limitada (ver rubrica).

Opções de infraestrutura real, da mais leve à mais completa:
1. **Testcontainers** por serviço (Postgres/RabbitMQ efêmeros por suíte).
2. **Stack do Compose** + suíte E2E que fala só com o gateway (recomendado para
   portfólio e para Sagas, porque exercita o sistema inteiro).

---

## 1. Concorrência contra o banco real

```typescript
// Integração: repositório REAL apontando para um Postgres efêmero (Testcontainers)
it('não vende mais do que o estoque sob concorrência', async () => {
  await repo.upsertStock({ sku: 'RACE-1', productId: 'p1', availableQty: 4 });

  const results = await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      repo.reserve({ orderId: `o-${i}`, items: [{ sku: 'RACE-1', quantity: 1 }] })
    )
  );

  expect(results.filter((r) => r.status === 'STOCK_RESERVED')).toHaveLength(4);
  const stock = await repo.findBySku('RACE-1');
  expect(stock).toMatchObject({ availableQty: 0, reservedQty: 4 });
});
```

Para validar que o teste é capaz de falhar, rode-o uma vez contra a versão com
check-then-act: ele **tem** que ficar vermelho. Teste que nunca falhou não prova nada.

Sem Testcontainers, o mesmo experimento pela stack, no shell:

```bash
for i in $(seq 20); do
  curl -s -X POST "$GW/api/inventory/reserve" -H "Authorization: Bearer $ADMIN" \
    -H 'Content-Type: application/json' \
    -d "{\"orderId\":\"race-$i\",\"items\":[{\"sku\":\"RACE-1\",\"quantity\":1}]}" &
done | sort | uniq -c; wait
```

---

## 2. Idempotência sob reentrega concorrente

```typescript
it('a mesma mensagem 10x em paralelo produz um único efeito', async () => {
  const msg = { messageId: 'm-1', orderId: 'o-dup', items: [{ sku: 'DUP', quantity: 3 }] };
  const results = await Promise.all(Array.from({ length: 10 }, () => useCase.execute(msg)));

  expect(results.filter((r) => r.status === 'STOCK_RESERVED')).toHaveLength(1);
  expect(results.filter((r) => r.status === 'ALREADY_PROCESSED')).toHaveLength(9);
  expect(await repo.findBySku('DUP')).toMatchObject({ reservedQty: 3 });
});
```

Nenhuma das 10 pode terminar em erro/DLQ por violação de unicidade: corrida de
duplicata é "já processado", não falha.

---

## 3. Contrato de eventos

Verifique o payload **gravado** (outbox) contra o que cada consumidor lê — não o
objeto em memória.

```typescript
it('STOCK_RESERVED satisfaz o contrato do payment-service', async () => {
  await repo.reserve({ orderId: 'o-100', userId: 'u-1', total: 299.9,
                       items: [{ sku: 'KB-1', quantity: 1, price: 299.9 }] });

  const row = await prisma.outbox.findFirstOrThrow({
    where: { aggregateId: 'o-100', eventType: 'STOCK_RESERVED' },
  });
  expect(row.payload).toMatchObject({
    orderId: 'o-100',
    userId: 'u-1',
    total: 299.9,
    items: [expect.objectContaining({ sku: 'KB-1', quantity: 1 })],
  });
});
```

Complemente com um cenário E2E que **só passa se o campo trafegar** (ex.: compra acima
do limite antifraude deve ser recusada — se o `total` se perder no caminho, ela é
aprovada e o teste falha).

---

## 4. Suíte E2E contra a stack real

Princípios de um harness confiável:

- **Só pelo gateway.** O caminho testado deve ser o caminho real do usuário.
- **Isolamento por execução.** Crie os próprios dados com identificador único
  (`SKU-<runId>-<n>`), sem depender de estado prévio; deve passar rodando 2× seguidas.
- **Limpeza.** Desative/remova o que criou ao final (dados de teste não podem
  aparecer na demo).
- **Espera por condição, não por `sleep`.** Faça polling do estado final com timeout
  explícito; para muitos recursos, consulte a listagem (1 requisição por ciclo) em
  vez de N consultas individuais.
- **Cliente bem-comportado.** Respeite `429 + Retry-After`; um E2E que estoura o rate
  limit está testando o limite, não o fluxo.
- **Assert no estado de todos os serviços,** não só no recurso principal (pedido
  `PAID` **e** estoque com `reserved = 0` **e** pagamento com o valor certo).
- **Falha alta.** Exit code ≠ 0 em qualquer falha; no CI, anexe logs dos containers.

Cenários mínimos para uma Saga de pedido:

| Cenário | Assert |
|---|---|
| Caminho feliz | status final, valor cobrado = total do servidor, reserva convertida em baixa |
| Compensação | status cancelado e estoque integralmente restaurado |
| Rejeição na primeira etapa | cancelado, **nenhum** efeito nas etapas seguintes (sem cobrança) |
| Regra de negócio dependente de campo propagado | ex.: antifraude recusa acima do limite |
| Adulteração pelo cliente | valor do servidor prevalece |
| Concorrência | N pedidos por M unidades ⇒ exatamente M concluídos |
| Rastreabilidade | correlation id ecoado/propagado |
| Autorização | escalada de papel, IDOR, endpoints internos ⇒ negados |

---

## 5. Caos e cold start

Cold start (deve ficar 100% saudável sem reinícios e sem serviço degradado em silêncio):

```bash
docker compose -p qa-check up -d --build --wait --wait-timeout 300
docker compose -p qa-check logs | grep -iE "ECONNREFUSED|could not connect|unavailable"
docker compose -p qa-check down -v   # destrói SÓ o projeto isolado
```

Queda do broker no meio do fluxo:

```bash
docker stop <broker>
# crie um pedido → deve ser aceito e ficar pendente na outbox; health deve ir a 503
docker start <broker>
# em segundos: serviços reconectam e o pedido conclui sem perda de evento
```

Registre os tempos e a saída — isso vira evidência no relatório e roteiro no README.

---

## 6. Testes no CI

Pipeline mínimo para nota alta:
1. Build + testes unitários por serviço (matriz).
2. Job E2E: sobe a stack do zero com `--wait`, roda seed, roda a suíte E2E, anexa
   logs em falha, derruba tudo com `down -v`.

Antes de confiar no job, simule-o localmente num projeto Compose isolado (volumes
vazios) — é aí que aparecem bootstrap de admin, migrações em banco virgem e seeds que
só funcionavam por causa de estado antigo.
