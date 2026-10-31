#!/usr/bin/env bash
# scope.sh — lista os arquivos do módulo na ORDEM DE REVISÃO (de dentro para fora) e quem os importa.
#
# Uso:
#   scope.sh <diretório>          # todos os arquivos de código do diretório
#   scope.sh --git <ref-base>     # só os arquivos alterados em relação a <ref-base> (ex.: main)
#
# Ordem: domínio → casos de uso/aplicação → adaptadores de infraestrutura → pontos de entrada.
# Reconhece convenções de TS/JS, Java/Kotlin, Python, Go, C#, Rust, PHP e Ruby. Arquivos de teste
# são listados à parte (contexto, não revisados como produção). Se nenhuma camada for reconhecida,
# a lista sai em ordem alfabética e o script avisa.
set -euo pipefail

EXT_RE='\.(ts|tsx|js|mjs|cjs|java|kt|py|go|cs|rs|php|rb|scala)$'

if [ "${1:-}" = "--git" ]; then
  base="${2:?informe a ref base, ex.: main}"
  mapfile -t files < <(git diff --name-only --diff-filter=ACMR "$base"...HEAD | grep -E "$EXT_RE" | sort)
  root="."
else
  root="${1:?informe o diretório do módulo}"
  mapfile -t files < <(find "$root" -type f -regextype posix-extended -regex ".*$EXT_RE" \
    -not -path '*/node_modules/*' -not -path '*/dist/*' -not -path '*/build/*' -not -path '*/target/*' \
    -not -path '*/bin/*' -not -path '*/obj/*' -not -path '*/vendor/*' -not -path '*/.venv/*' \
    -not -path '*/__pycache__/*' -not -name '*.d.ts' | sort)
fi

[ "${#files[@]}" -eq 0 ] && { echo "nenhum arquivo de código encontrado em: ${root}"; exit 1; }

# Stack: pelos manifestos na raiz analisada (ou até 3 níveis acima)
detect_stack() {
  local d="$1" found=""
  for _ in 1 2 3 4; do
    [ -f "$d/package.json" ] && found+="node "
    if [ -f "$d/pom.xml" ] || [ -f "$d/build.gradle" ] || [ -f "$d/build.gradle.kts" ]; then found+="jvm "; fi
    if [ -f "$d/pyproject.toml" ] || [ -f "$d/requirements.txt" ] || [ -f "$d/setup.py" ]; then found+="python "; fi
    [ -f "$d/go.mod" ] && found+="go "
    [ -f "$d/Cargo.toml" ] && found+="rust "
    if compgen -G "$d/*.csproj" >/dev/null 2>&1 || compgen -G "$d/*.sln" >/dev/null 2>&1; then found+="dotnet "; fi
    [ -f "$d/composer.json" ] && found+="php "
    [ -f "$d/Gemfile" ] && found+="ruby "
    [ -n "$found" ] && break
    d=$(dirname "$d")
  done
  echo "${found:-desconhecida}"
}

is_test() {
  case "$1" in
    *.test.*|*.spec.*|*__tests__*|*/test/*|*/tests/*|*/spec/*) return 0 ;;
    */test-support/*|*/testsupport/*|*/testutils/*|*/fixtures/*|*/mocks/*|*/__mocks__/*|*/testdata/*) return 0 ;;
    *Test.java|*Tests.java|*Test.kt|*Tests.kt|*IT.java) return 0 ;;
    */test_*.py|*_test.py|*/conftest.py) return 0 ;;
    *_test.go) return 0 ;;
    *Tests.cs|*Test.cs|*.Tests/*|*.Test/*) return 0 ;;
    *_spec.rb|*Test.php) return 0 ;;
  esac
  return 1
}

rank() {
  local f; f=$(echo "$1" | tr '[:upper:]' '[:lower:]')
  if is_test "$1"; then echo 9; return; fi
  case "$f" in
    */domain/*|*/entities/*|*/entity/*|*/model/*|*/models/*|*/core/*|*/valueobjects/*) echo 1 ;;
    */use-cases/*|*/usecases/*|*/usecase/*|*/application/*|*/services/*|*/service/*) echo 2 ;;
    */repositories/*|*/repository/*|*/persistence/*|*/database/*|*/db/*|*/dao/*|*/adapters/*|*/infrastructure/*|*/infra/database/*|*/infra/security/*|*/infra/observability/*|*/infra/catalog/*|*/clients/*|*/gateways/*) echo 3 ;;
    */messaging/*|*/consumers/*|*/listeners/*|*/workers/*|*/jobs/*|*/events/*) echo 4 ;;
    # pontos de entrada e composição antes do padrão genérico de handlers (ex.: cmd/api/main.go)
    */container.*|*/config/*|*/configuration/*|*/di/*|*/settings.*|*/startup.cs|*/program.cs) echo 6 ;;
    */server.*|*/index.*|*/main.*|*/cmd/*|*/__main__.py|*/app.py|*/manage.py|*/application.java|*/application.kt) echo 7 ;;
    */http/*|*/routes/*|*/router/*|*/routers/*|*/controllers/*|*/controller/*|*/handlers/*|*/handler/*|*/api/*|*/views/*|*/middlewares/*|*/middleware/*|*/endpoints/*|*/resources/*) echo 5 ;;
    *) echo 5 ;;
  esac
}

stack=$(detect_stack "$(cd "$root" && pwd)")
echo "Stack detectada: $stack"

layered=0
for f in "${files[@]}"; do r=$(rank "$f"); if [ "$r" != 5 ] && [ "$r" != 9 ]; then layered=$((layered + 1)); fi; done
if [ "$layered" -eq 0 ]; then
  echo "AVISO: nenhuma camada reconhecida (domain/use-cases/infra/handlers...). A ordem abaixo é alfabética;"
  echo "       defina a ordem manualmente: tipos e regras puras primeiro, depois quem os usa."
fi
echo

printf '%-4s %-6s %s\n' "#" "linhas" "arquivo (ordem de revisão)"
n=0
for f in "${files[@]}"; do printf '%s\t%s\n' "$(rank "$f")" "$f"; done | sort -k1,1n -k2,2 | while IFS=$'\t' read -r r f; do
  [ "$r" = 9 ] && continue
  n=$((n + 1))
  printf '%-4s %-6s %s\n' "$n" "$(wc -l < "$f")" "$f"
done

echo
echo "Testes existentes (contexto, não revisados como produção):"
tests=0
for f in "${files[@]}"; do
  if [ "$(rank "$f")" = 9 ]; then printf '  %-6s %s\n' "$(wc -l < "$f")" "$f"; tests=$((tests + 1)); fi
done
[ "$tests" -eq 0 ] && echo "  (nenhum arquivo de teste reconhecido — em Rust, testes inline em #[cfg(test)] não aparecem aqui)"

prod_total=0
for f in "${files[@]}"; do [ "$(rank "$f")" != 9 ] && prod_total=$((prod_total + $(wc -l < "$f"))); done
echo
echo "Total de linhas de produção a revisar: $prod_total"

echo
echo "Quem importa estes arquivos (impacto de mudanças de contrato; heurística por nome do arquivo):"
for f in "${files[@]}"; do
  [ "$(rank "$f")" = 9 ] && continue
  base=$(basename "$f"); mod="${base%.*}"
  [ "${#mod}" -lt 4 ] && continue   # nomes curtos (main, app, mod) geram ruído
  importers=$(grep -rlE "(from|import|require|use|using).*\b${mod}\b" "$root" \
      --include='*.ts' --include='*.tsx' --include='*.js' --include='*.py' --include='*.java' \
      --include='*.kt' --include='*.go' --include='*.cs' --include='*.rs' --include='*.php' --include='*.rb' 2>/dev/null \
    | grep -vE 'node_modules|/target/|/dist/' | grep -v "^$f$" | tr '\n' ' ' || true)
  [ -n "$importers" ] && printf '  %s ← %s\n' "$base" "$importers"
done
exit 0
