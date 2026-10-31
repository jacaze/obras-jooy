# Checklist de revisão linha a linha

Aplique a cada bloco de linhas os itens **pertinentes** e registre o resultado no ledger.
Os exemplos vêm de defeitos reais encontrados em código gerado por IA.

## 1. Entradas e validação
- Toda entrada externa (body, params, headers, payload de evento, variável de ambiente) é
  validada **antes** do uso? Tipo, formato, faixa, tamanho.
- O valor vem de quem deveria? Preço, total, papel, dono e status nunca vêm do cliente.
- Campos extras são rejeitados ou descartados conscientemente?

## 2. Nulo, vazio e defaults
- `??`, `||` e `?.` escondem um campo obrigatório faltando? (`customerId ?? 'anonymous'`,
  `discount ?? 0` transformam bug em dado errado silencioso.)
- `||` usado onde `0`, `''` ou `false` são valores válidos?
- Arrays vazios e strings só com espaços tratados?

## 3. Tipos
- `any`, `as` e `!` (non-null assertion): cada um justificado? Um `as X` pode mentir.
- `String(x)` / `Number(x)` sobre valores que podem ser `undefined` (`"undefined"`, `NaN`)?
- Números de dinheiro: arredondamento, ponto flutuante, `toFixed` retornando string.

## 4. Condições e limites
- `>` vs `>=`, `<` vs `<=`: o limite está do lado certo? Teste mentalmente o valor exato do limite.
- Lógica booleana: `&&`/`||` invertidos, negação dupla, precedência.
- `if` sem `else` que deveria tratar o outro caminho; `switch` sem `default`.
- Comparações com valores mágicos: deveriam ser constantes nomeadas?

## 5. Erros
- `catch` que engole o erro, só loga, ou devolve sucesso.
- Erro genérico (`new Error('X')`) onde o chamador precisa distinguir o tipo.
- Mapeamento erro → status HTTP: todos os erros de domínio mapeados? Algum vira 500 indevido?
- Mensagens de erro vazando detalhes internos (stack, SQL, segredos).
- `finally` liberando recursos.

## 6. Estado e transições
- Toda transição de estado tem guarda (estado de origem permitido)?
- Estados terminais protegidos (não regridem)?
- Atualização "lê e depois escreve" sobre estado compartilhado (check-then-act)?

## 7. Assíncrono e concorrência
- `await` esquecido; `void promise` sem tratamento; `forEach` com callback async.
- Duas execuções simultâneas da mesma função quebram algo? (flag de reentrância, idempotência)
- Timers (`setInterval`) que podem sobrepor execuções.
- Operações em loop com `await` que deveriam ser em lote, ou vice-versa (ordem importa?).

## 8. Dependências externas
- Toda chamada de rede/IO tem timeout?
- O que acontece se a dependência falhar, demorar, responder malformado ou parcialmente?
- Retentativas: idempotentes? com backoff?

## 9. Segurança
- Autenticação e **autorização** (dono vs. outro usuário vs. admin) no lugar certo.
- Injeção (SQL/NoSQL/comando/header); queries parametrizadas.
- Segredos e dados pessoais em logs, respostas ou mensagens.

## 10. Observabilidade
- Logs no ponto de decisão importante, com contexto (ids), sem ruído.
- Nível de log coerente (erro de verdade vs. aviso).

## 11. Clareza e manutenção (melhorias)
- Nome diz o que faz? Função faz uma coisa? Mais de ~40 linhas ou 3 níveis de aninhamento?
- Duplicação que deveria ser extraída (ou abstração prematura que deveria ser inlinada)?
- Código morto, parâmetros não usados, ramos impossíveis.
- Comentário que mente ou repete o código; TODO sem dono.
- Dependências na direção errada (domínio importando infraestrutura).
