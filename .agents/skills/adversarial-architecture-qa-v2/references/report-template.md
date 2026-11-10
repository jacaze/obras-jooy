# Modelo de relatório

```markdown
## Auditoria Adversarial — <projeto> (<commit/branch>)

### Veredito: <Aprovado | Aprovado com ressalvas | Reprovado> — Nota: X,X/10
<Uma frase: o que mais pesou na nota.>

**Como foi auditado:** <stack subida do zero? E2E rodado? experimentos executados?
o que NÃO foi possível executar e por quê>

### 🔴 Falhas críticas
1. **<Nome>** — `<arquivo:linha>` · vetor V<n> · <confirmada | suspeita>
   - **Risco real:** <o que acontece na prática, em termos de negócio>
   - **Evidência:** `<comando>` → `<saída observada>`
   - **Correção:** <padrão/código>
   - **Regressão:** <teste a criar e em que nível>

### 🟠 Falhas altas
...

### 🟡 Credibilidade e higiene
- <Afirmação do README> → <o que o código faz> (`arquivo:linha`)

### ✅ Pontos fortes validados
- <O que foi verificado executando e se sustentou>

### 📊 Nota
| Dimensão | Peso | Obtido | Motivo |
|---|---|---|---|
| ... | | | |
| **Base** | 10 | X,X | |
| **Teto aplicado** | | Y,Y | <condição> |

### ⏭️ Próximos passos por impacto na nota
1. <ação> → +<pontos estimados>
```

Ao reportar **depois de corrigir**, troque as seções de falhas por uma tabela
"antes → depois" com a evidência dos dois lados:

```markdown
| Falha | Antes (evidência) | Depois (evidência) | Teste de regressão |
|---|---|---|---|
| Overselling | estoque 5 → 14 reservas, -9 | 5 reservas, saldo 0 | e2e: concorrência |
```
