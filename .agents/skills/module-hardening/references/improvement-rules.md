# Regras de melhoria

Melhorar código é diferente de corrigir bug. Uma melhoria **não muda comportamento
observável** — e é exatamente por isso que só pode ser feita com testes verdes protegendo.

## O que conta como melhoria
- Nome que não diz o que faz → renomear.
- Função longa ou com várias responsabilidades → extrair.
- Duplicação real (mesma regra em 2+ lugares que mudam juntos) → extrair.
- Condição complexa → variável ou função com nome de regra de negócio.
- Valor mágico → constante nomeada.
- Código morto, parâmetro não usado, ramo impossível → remover.
- Tipo frouxo (`any`, `as`) → tipo real.
- Comentário que repete o código ou mente → remover/corrigir; comentário explica o *porquê*.

## O que NÃO é melhoria (fica para outra tarefa)
- Trocar biblioteca, framework ou padrão arquitetural.
- Mudar contrato público (rota, payload de evento, assinatura exportada) — isso é mudança de
  comportamento e exige análise dos chamadores.
- Reformatação em massa ou mudança de estilo sem ganho de clareza.
- Abstração para um único uso ("pode ser útil no futuro").

## Guarda-corpos
1. Testes verdes antes de começar; rode-os após **cada** melhoria.
2. Uma melhoria por vez; se um teste quebrar, desfaça — a melhoria mudou comportamento.
3. Commit separado das correções (`refactor(...)`), para a revisão ver só a reestruturação.
4. Siga o estilo do código ao redor (nomes, densidade de comentários, idioma).
5. Pontuação de mutação não pode cair depois da melhoria.
6. Se a melhoria exigir mudar muitos arquivos fora do módulo, pare e registre como sugestão.
