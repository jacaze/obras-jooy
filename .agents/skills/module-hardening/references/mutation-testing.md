# Teste de mutação

Cobertura diz quais linhas os testes **executam**. Mutação diz se os testes **perceberiam**
uma mudança nessas linhas. A ferramenta altera o código de propósito (troca `>=` por `>`,
remove uma condição, troca `&&` por `||`, esvazia um bloco) e roda os testes:

- **Killed**: algum teste falhou → o teste protege aquela linha.
- **Survived**: todos os testes passaram com o código errado → teste fraco ou lógica inútil.
- **NoCoverage**: nenhum teste executa a linha.
- **Timeout**: o mutante causou loop; conta como morto.

Pontuação = mortos / (mortos + sobreviventes + sem cobertura).

## Ferramenta por linguagem

| Linguagem | Ferramenta | Instalar | Rodar | Onde ler o resultado | Verificado |
|---|---|---|---|---|---|
| TypeScript / JavaScript | Stryker | `npm i -D @stryker-mutator/core @stryker-mutator/vitest-runner` (ou `jest-runner`) | `npx stryker run --mutate "src/x.ts"` | `reports/mutation/mutation.json` → `scripts/mutation-summary.sh` | sim (Vitest 5, TS 7) |
| Python | mutmut 3 | `pip install mutmut` | `mutmut run` · `mutmut results` · `mutmut show <mutante>` | lista `survived` em `mutmut results`; diff em `mutmut show` | sim |
| Rust | cargo-mutants | `cargo install cargo-mutants --locked` | `cargo mutants` (`--list` mostra as mutações sem rodar) | `mutants.out/missed.txt` (sobreviventes), `caught.txt`, `timeout.txt` | sim (v27) |
| C# / .NET | Stryker.NET | `dotnet tool install -g dotnet-stryker` | `dotnet stryker --reporter json` | `StrykerOutput/<data>/reports/mutation-report.json` → `scripts/mutation-summary.sh` (mesmo formato) | não |
| Java / Kotlin | PIT (pitest) | plugin `pitest-maven` (+ `pitest-junit5-plugin` para JUnit 5) ou Gradle `info.solidsoft.pitest` | `mvn org.pitest:pitest-maven:mutationCoverage` · `gradle pitest` | `target/pit-reports/` (HTML/XML) | não |
| Go | gremlins | `go install github.com/go-gremlins/gremlins/cmd/gremlins@latest` | `gremlins unleash` | saída no terminal; JSON com `--output` | não |
| Scala | Stryker4s | plugin sbt | `sbt stryker` | mesmo formato JSON do Stryker | não |
| PHP | Infection | `composer require --dev infection/infection` | `vendor/bin/infection` | `infection.log` | não |

"Não verificado" = comandos da documentação oficial, não executados ao escrever esta skill; confirme
com `--help` antes de confiar.

Configuração do mutmut 3 (as chaves antigas `paths_to_mutate`/`tests_dir` geram aviso de obsoleta):

```toml
[tool.mutmut]
source_paths = ["src/"]
pythonpath = ["src"]
pytest_add_cli_args_test_selection = ["tests/"]
```

### A pontuação NÃO é comparável entre ferramentas

Cada ferramenta tem o seu conjunto de mutações. Exemplo verificado com o mesmo código
(`if total >= minimum`) e os mesmos testes, que **não** cobrem o valor exato do mínimo:

- **mutmut** gera `>=` → `>` → o mutante sobrevive → a lacuna aparece;
- **cargo-mutants** (v27) gera só `>=` → `<` (inversão) → todos morrem → **100%**, com a lacuna escondida.

Por isso a análise de valores-limite de `scenario-techniques.md` é obrigatória **independentemente**
da pontuação: uma nota alta prova que os testes percebem as mutações que a ferramenta sabe fazer,
não que todos os limites foram testados. Use `--list` (ou equivalente) para ver o que a ferramenta muta.

## Setup (TypeScript + Vitest)

Instale no pacote do módulo (o runner precisa resolver o `vitest` do projeto):

```bash
npm install -D @stryker-mutator/core @stryker-mutator/vitest-runner
```

`stryker.config.json`:

```json
{
  "testRunner": "vitest",
  "mutate": ["src/**/*.ts", "!src/**/*.test.ts", "!src/server.ts"],
  "reporters": ["clear-text", "json"],
  "jsonReporter": { "fileName": "reports/mutation/mutation.json" },
  "tempDirName": ".stryker-tmp",
  "thresholds": { "high": 85, "low": 70, "break": null }
}
```

Adicione `.stryker-tmp/` e `reports/` ao `.gitignore`. Para Jest use `@stryker-mutator/jest-runner`.

Rode só o que está sendo endurecido (rápido):

```bash
npx stryker run --mutate "src/use-cases/ApplyCouponUseCase.ts"
scripts/mutation-summary.sh reports/mutation/mutation.json
```

### Problemas conhecidos
- **TypeScript 7 (nativo/tsgo):** não expõe a API JS que o Stryker usa para reescrever o
  `tsconfig` (`ts.parseConfigFileTextToJson is not a function`). Se o `tsconfig` **não** usa
  `extends` nem `references`, defina `"tsconfigFile": "tsconfig.stryker-none.json"` (caminho
  inexistente) para pular essa etapa. Se usar, rode o Stryker com um TypeScript 5 instalado
  como devDependency auxiliar.
- **Runner não encontrado** ao instalar o Stryker fora do projeto: o plugin precisa resolver o
  `vitest` do pacote; instale como devDependency do próprio pacote.

## Como tratar cada sobrevivente

Para cada mutante vivo, leia a linha e a mutação e decida:

1. **Falta teste** — escreva o teste do *comportamento* que o mutante quebra (ex.: o valor
   exato de um limite de regra). É o caso mais comum.
2. **Lógica redundante ou morta** — o código não importa para o resultado; simplifique-o
   (melhoria) em vez de criar teste artificial.
3. **Mutante equivalente** — a mutação não muda o comportamento observável (ex.: `>=` vs `>`
   num ramo que retorna o mesmo valor). Registre no relatório e siga.
4. **Defensivo intencional** — ex.: `.trim()` sobre valor já validado na borda. Decida: testar,
   remover, ou registrar como aceito.

5. **Defesa em profundidade** — a mesma regra validada em duas camadas (schema da rota e
   domínio) gera mutantes equivalentes numa delas. Registre como intencional, não "corrija"
   removendo uma das camadas sem decidir conscientemente.

Leia o placar do Stryker com atenção: o total inclui arquivos sem nenhum teste unitário (0%);
a coluna "% Covered" mostra a pontuação só do código que os testes executam. Declare no
relatório qual das duas está sendo usada como meta.

Nunca mate mutantes com asserts sobre detalhes de implementação (chamadas internas, ordem de
logs): o teste fica frágil e não protege comportamento.

## Meta
≥ 80% no módulo endurecido, com todos os sobreviventes restantes explicados. Mais importante
que o número é a lista de sobreviventes estar vazia de "falta teste".
