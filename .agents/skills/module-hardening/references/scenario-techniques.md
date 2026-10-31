# Técnicas para gerar a matriz de cenários

O objetivo é **não depender de criatividade**: cada técnica gera uma família de cenários de
forma mecânica. Aplique todas as que couberem a cada função, rota ou handler público.

## 1. Partição de equivalência + valores-limite (cada entrada)
Para cada parâmetro, liste as classes e teste um representante de cada uma mais os limites:

| Tipo | Classes / limites a cobrir |
|---|---|
| Número | negativo, `0`, mínimo válido, máximo válido, máximo + 1, decimal, `NaN`, `Infinity` |
| String | vazia, só espaços, mínimo, máximo, máximo + 1, unicode/acentos, caracteres de controle |
| Coleção | vazia, 1 item, N itens, limite máximo, duplicados |
| Opcional | ausente, `null`, presente |
| Id/referência | existente, inexistente, formato inválido, de outro dono |
| Dinheiro | `0`, centavos (`0.01`), arredondamento (`0.005`), limite de regra (valor exato do limite, ±0.01) |

## 2. Tabela de decisão (regras com várias condições)
Liste as condições, gere todas as combinações relevantes e o resultado esperado de cada uma.
Exemplo (cupom de desconto):

| cupom válido | cupom expirado | carrinho ≥ mínimo | Resultado esperado |
|---|---|---|---|
| sim | não | sim | desconto aplicado |
| sim | não | não | recusado: valor mínimo |
| sim | sim | sim | recusado: expirado |
| não | — | sim | recusado: inválido |
| sim | não | sim (2ª vez, mesmo pedido) | **?** — o cupom pode ser aplicado duas vezes? |

Linhas com "?" são achados: o comportamento não está definido.

## 3. Transição de estados
Monte a tabela estado × evento. Teste **todas** as células: as válidas (transição esperada)
e as inválidas (deve ser ignorada ou rejeitada, nunca regredir). Inclua o mesmo evento duas vezes.

## 4. Falha de cada dependência
Para cada dependência (banco, broker, HTTP, relógio, gerador de id):

| Falha | Esperado |
|---|---|
| erro/exceção | erro mapeado, nada parcial gravado |
| timeout / lentidão | timeout explícito, resposta coerente |
| resposta malformada / campo faltando | rejeição explícita, não default silencioso |
| sucesso parcial (ex.: gravou mas não publicou) | atomicidade ou compensação |

## 5. Repetição e concorrência
- Mesma chamada 2× em sequência (idempotência).
- Mesma chamada N× em paralelo (corrida) — **prova só com infraestrutura real**.
- Eventos fora de ordem.

## 6. Autorização
Anônimo, token inválido/expirado, dono, outro usuário, admin — para cada operação.

## 7. Saída e efeitos
Para cada cenário, verifique **todos** os efeitos, não só o retorno: o que foi gravado, o que
foi publicado (outbox), o que foi logado, o que **não** deveria ter acontecido.

## Formato da matriz

| # | Função | Técnica | Cenário | Esperado | Teste | Status |
|---|---|---|---|---|---|---|
| 1 | `applyCoupon` | limite | carrinho = mínimo exato | desconto aplicado | `Coupon.test.ts › mínimo exato` | ok |
| 2 | `applyCoupon` | repetição | mesmo cupom 2× no pedido | recusado | — | **lacuna** |
