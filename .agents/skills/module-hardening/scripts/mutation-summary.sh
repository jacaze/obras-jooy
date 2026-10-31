#!/usr/bin/env bash
# mutation-summary.sh — resume o relatório JSON do Stryker: pontuação por arquivo e lista de sobreviventes.
# Uso: mutation-summary.sh [reports/mutation/mutation.json]
set -euo pipefail
report="${1:-reports/mutation/mutation.json}"

# cargo-mutants (Rust): diretório mutants.out com listas por resultado
if [ -d "$report" ] && [ -f "$report/caught.txt" ]; then
  count() { if [ -f "$report/$1" ]; then awk 'NF' "$report/$1" | wc -l | tr -d ' '; else echo 0; fi; }
  k=$(count caught.txt); m=$(count missed.txt); t=$(count timeout.txt); u=$(count unviable.txt)
  total=$((k + t + m))
  echo "cargo-mutants: $((k + t)) mortos (incl. $t timeout), $m sobreviventes, $u inviáveis (não compilam, fora da conta)"
  [ "$total" -gt 0 ] && echo "Pontuação: $(( (k + t) * 100 / total ))%"
  echo; echo "Sobreviventes:"; sed 's/^/  /' "$report/missed.txt" 2>/dev/null
  echo; echo "Atenção: o cargo-mutants não gera mutações de limite (>= → >); teste os valores-limite à parte."
  exit 0
fi

[ -f "$report" ] || {
  echo "relatório não encontrado: $report" >&2
  echo "Formatos suportados: JSON do Stryker / Stryker.NET / Stryker4s, ou o diretório mutants.out do cargo-mutants." >&2
  echo "mutmut: use 'mutmut results' e 'mutmut show <mutante>'. PIT: target/pit-reports/index.html." >&2
  exit 2
}
command -v jq >/dev/null || { echo "jq é necessário" >&2; exit 2; }

echo "Pontuação por arquivo (mortos+timeout / total sem ignorados):"
jq -r '
  .files | to_entries[] |
  .key as $f |
  [.value.mutants[].status] as $s |
  ($s | map(select(. == "Killed" or . == "Timeout")) | length) as $k |
  ($s | map(select(. == "Survived" or . == "NoCoverage")) | length) as $l |
  "  \(if ($k + $l) == 0 then "  -" else "\((($k * 100) / ($k + $l)) | floor)%" end)\t\($k) mortos, \($l) vivos\t\($f)"
' "$report" | column -t -s $'\t'

jq -r '
  [.files[].mutants[]] |
  (map(select(.status == "Killed" or .status == "Timeout")) | length) as $k |
  (map(select(.status == "Survived" or .status == "NoCoverage")) | length) as $l |
  "\nTotal: \(if ($k + $l) == 0 then "-" else "\((($k * 100) / ($k + $l)) | floor)%" end) (\($k) mortos, \($l) vivos)"
' "$report"

echo
echo "Sobreviventes (decida para cada um: falta teste / lógica redundante / equivalente / defensivo):"
jq -r '
  .files | to_entries[] | .key as $f |
  .value.mutants[] | select(.status == "Survived" or .status == "NoCoverage") |
  "  \($f):\(.location.start.line)\t[\(.status)] \(.mutatorName)\t→ \((.replacement // "") | gsub("\n"; " ") | .[0:70])"
' "$report"
