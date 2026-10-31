---
name: module-hardening
description: >-
  Endurecimento de um módulo recém-desenvolvido antes de declará-lo pronto: revisão de
  código UM ARQUIVO POR VEZ, LINHA A LINHA, com registro de cobertura da leitura;
  enumeração sistemática de cenários de erro e condições (limites, estados, dependências,
  concorrência, autorização); testes no nível certo provados por teste de mutação; e
  correção das falhas e melhorias do código com guarda-corpos. Use sempre que um módulo,
  serviço, use case, endpoint ou feature for concluído (por você ou por outra IA), ao
  revisar código gerado, ou quando pedirem para "revisar tudo", "testar todos os cenários"
  ou "deixar pronto para produção" um trecho específico de código.
---

# Module Hardening

Um módulo só está pronto quando cada linha foi lida, cada condição tem um teste que a
prova, e os testes foram provados capazes de falhar. Esta skill transforma "compila e os
testes passam" em evidência.

Complementa a `adversarial-architecture-qa`: aquela audita o **sistema** (rede, broker,
gateway, Saga); esta endurece **um módulo** e suas fronteiras.

## Regra central: um arquivo por vez, linha a linha

Revisão por amostragem é o principal motivo de bugs passarem por revisões de IA: o modelo
lê o começo, "entende a ideia" e extrapola o resto. Por isso:

1. **Um arquivo por vez.** Termine a revisão de um arquivo (ledger completo) antes de abrir
   o próximo. Só abra outro arquivo para confirmar um contrato (tipo, assinatura,
   comportamento de dependência); anote no ledger o que foi confirmado e volte.
2. **Leia o arquivo inteiro com números de linha.** Nunca revise por `grep`, por trechos
   soltos ou por resumo. Arquivos grandes são lidos em blocos sequenciais de até 40 linhas,
   sem pular nenhum.
3. **Linha a linha, com registro.** Para cada bloco, escreva no **ledger de revisão**
   (`scripts/ledger.sh` cria o esqueleto) o que as linhas fazem e o resultado de cada item
   aplicável do `references/line-review-checklist.md`. "Ok" é um resultado válido — linha
   não registrada não é.
4. **Cobertura de leitura = 100%.** Antes de passar para o próximo arquivo, rode
   `scripts/ledger.sh --check <ledger>`: todos os intervalos de linha precisam estar
   preenchidos. Arquivo com bloco vazio não está revisado.
5. **Ordem de dentro para fora:** domínio → use cases → adaptadores de infraestrutura →
   pontos de entrada (rotas, workers, server). Quem chama é revisado conhecendo quem é chamado.

## Regras inegociáveis

- **Sem teste que falha, não é correção.** Todo bug corrigido ganha um teste que falha
  antes (mostre a saída) e passa depois.
- **Um teste que nunca falhou não prova nada.** A qualidade dos testes é medida com
  **teste de mutação** no módulo (`references/mutation-testing.md`). Mutante sobrevivente é
  um achado: ou falta teste, ou o código tem lógica morta/redundante.
- **Teste no nível em que o comportamento existe.** Regra de negócio → unitário com fake.
  Corrida, transação, broker, rede → infraestrutura real (ver a skill
  `adversarial-architecture-qa`). Não declare provado com fake o que fake não reproduz.
- **Correção primeiro, melhoria depois, em commits separados.** Refatoração só com todos os
  testes verdes e sem mudar comportamento observável.
- **Não sair do escopo.** O que estiver fora do módulo vira anotação no relatório, não
  mudança.
- **"Todos os cenários" significa sistemático, não infinito.** Use as técnicas de
  `references/scenario-techniques.md` e o critério de parada abaixo; seja explícito sobre o
  que ficou fora.

## Protocolo

### Fase 0 — Escopo
`scripts/scope.sh <diretório-ou-base-git>` lista os arquivos do módulo na ordem de revisão
(com contagem de linhas) e quem os importa. Confirme o escopo antes de começar.

### Fase 1 — Linha de base (antes de mudar qualquer coisa)
Registre: typecheck, lint, testes, cobertura e **pontuação de mutação** do módulo. É contra
esses números que a entrega será comparada.

### Fase 2 — Revisão linha a linha (arquivo por arquivo)
Para cada arquivo, na ordem do escopo:
1. `scripts/ledger.sh <arquivo>` → esqueleto do ledger. **Veja os blocos gerados antes de
   escrever**: a revisão segue os intervalos do ledger, não intervalos inventados.
2. Leia o arquivo inteiro com números de linha; preencha cada bloco do ledger aplicando o
   checklist. Se a ferramenta de leitura devolver uma versão resumida ou com linhas omitidas,
   leia de novo por outro meio (ex.: `cat -n`) — revisão sobre conteúdo parcial não vale.
3. Liste os achados do arquivo com severidade (🔴 bug · 🟠 risco · 🟡 melhoria), linha e
   evidência (por que é um problema, com o trecho).
   Suspeitas que dependem de execução (corrida, comportamento do framework, broker) entram
   como **hipótese** e são reproduzidas antes de virar achado. Hipóteses **refutadas** também
   vão para o relatório, com o experimento que as derrubou.
4. `scripts/ledger.sh --check` → 100% antes de seguir.

### Fase 3 — Matriz de cenários
Para cada função/rota/handler público do módulo, gere os cenários com as técnicas de
`references/scenario-techniques.md` (partições e limites, tabela de decisão, transições de
estado válidas **e inválidas**, falhas de cada dependência, repetição/concorrência,
autorização). Cada linha da matriz aponta o teste que a cobre ou fica marcada como lacuna.

### Fase 4 — Testes para as lacunas
Escreva os testes faltantes. Para cada achado 🔴/🟠, o teste é escrito **antes** da correção e
precisa falhar — registre a saída. Se o código não tem costura para testar (lógica dentro de um
callback, de um handler de framework), faça primeiro uma extração **sem mudar comportamento**,
em commit próprio, e só então escreva os testes que falham.

Se o teste só pode rodar contra infraestrutura real (repositório, broker), rode-o **contra a
versão sem a correção** e mostre a falha. Se ele passar mesmo sem a correção, ele não prova a
correção: rebaixe o achado para "não reproduzido" e diga isso.

### Fase 5 — Correções
Corrija a causa, não o sintoma. Rode tudo. Procure efeitos colaterais: a correção mudou o
comportamento de algum chamador listado no escopo?

### Fase 6 — Melhorias (com testes verdes)
Aplique as melhorias 🟡 seguindo `references/improvement-rules.md`. Testes continuam verdes a
cada passo; commit separado das correções.

### Fase 7 — Verificação e critério de parada
O módulo está pronto quando **todos** valem:
- ledger com 100% das linhas de todos os arquivos revisadas;
- matriz de cenários sem lacunas (ou lacunas justificadas: ex. coberto por E2E/infra real);
- typecheck, lint e testes verdes;
- pontuação de mutação ≥ **80%** (ou a meta do projeto) no **escopo testável por unidade**,
  com cada sobrevivente restante explicado (equivalente, defesa em profundidade, defensivo);
  adaptadores provados só por infraestrutura real (repositórios, conexão com broker) ficam fora
  dessa conta **declaradamente**, e o relatório aponta o teste E2E/caos que os cobre;
- nenhum 🔴 aberto.

### Fase 8 — Relatório
Use `references/report-template.md`: antes → depois (testes, cobertura, mutação), achados
por arquivo e linha, matriz de cenários, o que foi corrigido, melhorado e o que ficou fora.

## Armadilhas

- Revisar por amostragem ("o resto do arquivo segue o mesmo padrão") — proibido.
- Aceitar o próprio teste novo sem vê-lo falhar.
- Matar mutantes com asserts frágeis (testar implementação, não comportamento).
- Refatorar e corrigir no mesmo commit — impossível revisar depois.
- Alterar contrato público (rota, evento, assinatura) sem listar os impactos nos chamadores.
- Deixar artefatos: relatórios de mutação, diretórios temporários, dados de teste.

## Referências

- `references/line-review-checklist.md` — o que verificar em cada linha.
- `references/scenario-techniques.md` — como gerar a matriz de cenários sem depender de criatividade.
- `references/mutation-testing.md` — ferramenta de mutação por linguagem (Stryker, mutmut, cargo-mutants, Stryker.NET, PIT, gremlins, Infection), por que as pontuações não são comparáveis entre elas, como tratar sobreviventes.
- `references/improvement-rules.md` — o que conta como melhoria e os guarda-corpos.
- `references/report-template.md` — formato do ledger, da matriz e do relatório.
- `scripts/scope.sh` — detecta a stack e lista os arquivos do módulo em ordem de revisão (TS/JS, Java/Kotlin, Python, Go, C#, Rust, PHP, Ruby) + quem os importa.
- `scripts/ledger.sh` — cria e verifica o ledger de revisão linha a linha.
- `scripts/mutation-summary.sh` — resume o relatório do Stryker/Stryker.NET/Stryker4s (JSON) ou do cargo-mutants (`mutants.out/`) e lista sobreviventes.
