# Modelos: ledger, achados e relatório

## Ledger de revisão (um por arquivo)

Gerado por `scripts/ledger.sh <arquivo>`; cada bloco é preenchido durante a leitura.

```markdown
# Ledger — src/use-cases/ApplyCouponUseCase.ts (58 linhas)

| Linhas | O que fazem | Verificações (checklist) | Achado |
|---|---|---|---|
| 1-14 | imports e input | tipos ok; `code` validado na rota | ok |
| 15-40 | validação do cupom | limites: `total > minimum` exclui o valor exato | 🔴 #1 |
| 41-58 | aplica e persiste | repetição: nada impede aplicar o mesmo cupom 2× | 🟠 #2 |
```

Bloco com a coluna "Achado" vazia **não** está revisado. `ok` é um resultado válido.

## Achado

```markdown
### #1 🔴 Carrinho no valor mínimo exato é recusado — ApplyCouponUseCase.ts:27
- **Trecho:** `if (cart.total > coupon.minimum)`
- **Por que é um problema:** a regra diz "a partir de R$ 100"; um carrinho de exatamente 100 é recusado.
- **Teste que prova (falha antes):** `applyCoupon › aceita o valor mínimo exato` → FAIL (recusado)
- **Correção:** `>=`.
- **Depois:** teste PASS; mutante `>=`→`>` agora morto.
```

## Relatório final

```markdown
## Module hardening — <módulo> (<branch/commit>)

### Resultado
| Métrica | Antes | Depois |
|---|---|---|
| Testes | 8 | 21 |
| Pontuação de mutação | 62% | 88% |
| Linhas revisadas (ledger) | — | 640/640 (9 arquivos) |
| Achados 🔴 / 🟠 / 🟡 | — | 2 / 3 / 5 |

### Achados por arquivo
<tabela: arquivo:linha, severidade, resumo, status (corrigido/melhorado/fora do escopo)>

### Matriz de cenários
<tabela da matriz; lacunas restantes com justificativa>

### Sobreviventes de mutação restantes
<cada um: linha, mutação, motivo (equivalente/defensivo)>

### Fora do escopo (sugestões)
<o que foi visto mas pertence a outra tarefa>
```
