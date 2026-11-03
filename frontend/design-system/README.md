# Design system "Obras"

Estilo da Pierre (lima `#cfff04` + Geist, hover curto, `fade-up`, dropdown por `clip-path`) adaptado ao almoxarifado de obra.
Tema **claro** para o campo (sol, luva) e **escuro** para o PC do almoxarife. Nada aqui está ligado ao app ainda.

Abrir a referência visual: dar dois cliques em `index.html` (precisa de internet só para as fontes Geist e Material Symbols).

| Arquivo | Para quê |
|---|---|
| `tokens.css` | Variáveis `--ob-*` (cores em canais RGB, raios, alvos de toque, tempos). Tema escuro = classe `dark` no `<html>`. |
| `tailwind.preset.js` | Preset Tailwind 3 com **os mesmos nomes de token** do `tailwind.config.js` atual (`primary`, `surface-container-low`, `on-surface-variant`…). |
| `components.css` | Botão, card, badge, medidor de saldo, input, stepper, nav, abas, tabela, toast, dropdown (prefixo `ob-`). |
| `theme.js` | `applyTheme()` / `toggleTheme()` / `setTheme()` com persistência em `localStorage`. |
| `index.html` | Identidade, componentes, movimento e 3 telas (Estoque desktop, Nova requisição e Ferramentas mobile). |

## Como adotar no app (3 passos, nesta ordem)

1. **Fontes** em `frontend/index.html`: trocar o link do Inter por
   `https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap`
   (o Material Symbols continua igual).
2. **CSS** em `frontend/src/index.css`, no **topo, antes** das diretivas `@tailwind`:
   ```css
   @import './../design-system/tokens.css';
   @import './../design-system/components.css';
   ```
   (`@import` tem de vir antes de qualquer regra; alternativa: importar os dois CSS em `main.tsx`.)
   Remover também o `background-color: #faf9fe` e a cor fixa do `html, body` — agora vêm de `bg-surface text-on-surface`.
3. **Tailwind** em `frontend/tailwind.config.js`:
   ```js
   import obras from './design-system/tailwind.preset.js'
   export default { presets: [obras], content: [...], theme: { extend: {} } }
   ```
   **Apague** `colors`, `fontFamily` e `fontSize` do `extend` antigo; se ficarem, sobrescrevem o preset.

Depois disso as telas atuais já mudam de cara sem edição, porque os nomes de classe não mudaram. Ajustes manuais esperados:
`bg-teal-700/800` e gradientes fixos (`from-on-surface`…) em algumas páginas; o `Navbar` usa `bg-primary` para o item ativo, que vira preto no claro e lima no escuro (é o comportamento desejado).

## Mapa semântico

| Token | Significado no almoxarifado |
|---|---|
| `primary` | Ação/seleção principal. Preto no claro, lima no escuro. |
| `accent` / `on-accent` | Lima sempre como **fundo** com texto `#09090b`. |
| `accent-text` | Lima como **texto/ícone**: oliva `#536602` no claro (AA), lima no escuro. |
| `secondary*` | Em estoque / sucesso |
| `tertiary*` | Abaixo do mínimo / atenção |
| `error*` | Sem saldo / crítico / estorno |
| `info*` | Transferência / informativo (novo) |

## Regras

- Lima nunca como texto sobre fundo claro (contraste 1,2:1).
- Alvo de toque mínimo 48 px (`--ob-hit`); ação principal em campo 64 px (`ob-btn--lg`).
- Quantidades, códigos e horários em Geist Mono (`font-mono` / `.ob-mono`) com `tabular-nums`.
- Todos os pares de texto foram conferidos em WCAG AA nos dois temas (o mais baixo: 4,57:1, `secondary` sobre `secondary-container` no claro).
- `prefers-reduced-motion` zera animações e transições.

## Origem e limites

Tokens extraídos do CSS computado de `lp.pierre.finance/lp/converse` para estudo de estilo. Logo, mascotes, ilustrações e o arquivo Rive da Pierre **não** foram copiados nem devem ser.
O `status` de estoque (ok/baixo/crítico) e o tema claro de campo são criações novas: a referência é só escura e não tem esses estados.
