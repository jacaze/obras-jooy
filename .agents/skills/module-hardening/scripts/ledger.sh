#!/usr/bin/env bash
# ledger.sh — ledger de revisão linha a linha.
#
# Criar o esqueleto (blocos de até N linhas, padrão 40, cortando em linhas em branco quando possível):
#   ledger.sh <arquivo> [ledger-saida.md] [tamanho-do-bloco]
#
# Verificar se TODAS as linhas foram revisadas (todo bloco com a coluna "Achado" preenchida):
#   ledger.sh --check <ledger.md>
#
# A regra: um arquivo só é considerado revisado com 100% dos blocos preenchidos.
# O achado é lido na ÚLTIMA coluna; escreva `|` dentro das células como `\|` (trechos de código com ||).
set -euo pipefail

if [ "${1:-}" = "--check" ]; then
  ledger="${2:?informe o ledger}"
  total=$(grep -cE '^\| [0-9]+-[0-9]+ \|' "$ledger" || true)
  pending=$(grep -E '^\| [0-9]+-[0-9]+ \|' "$ledger" | awk -F'|' '{what=$3; gsub(/ /,"",what); ach=$(NF-1); gsub(/ /,"",ach); if (what=="" || ach=="" || ach=="TODO") print $2}' || true)
  lines=$(grep -oE '^# Ledger — .* \(([0-9]+) linhas\)' "$ledger" | grep -oE '[0-9]+ linhas' | grep -oE '[0-9]+')
  covered=$(grep -E '^\| [0-9]+-[0-9]+ \|' "$ledger" | awk -F'|' '{ach=$(NF-1); gsub(/ /,"",ach); if (ach!="" && ach!="TODO") {split($2,a,"-"); gsub(/ /,"",a[1]); gsub(/ /,"",a[2]); s+=a[2]-a[1]+1}} END {print s+0}')
  # verifica também se os blocos são contíguos e cobrem 1..N
  gaps=$(grep -oE '^\| [0-9]+-[0-9]+ \|' "$ledger" | grep -oE '[0-9]+-[0-9]+' | awk -F- -v n="$lines" '
    BEGIN {expect=1} { if ($1 != expect) printf "lacuna nas linhas %d-%d; ", expect, $1-1; expect=$2+1 }
    END { if (expect-1 != n) printf "blocos terminam em %d, arquivo tem %d linhas", expect-1, n }')
  echo "$ledger: $covered/$lines linhas revisadas em $total blocos"
  if [ -n "$gaps" ]; then echo "  ERRO: $gaps"; exit 1; fi
  if [ -n "$pending" ]; then echo "  PENDENTE: blocos sem achado registrado:$(echo "$pending" | tr '\n' ' ')"; exit 1; fi
  echo "  OK: 100% revisado"
  exit 0
fi

file="${1:?informe o arquivo}"
out="${2:-}"
size="${3:-40}"
n=$(wc -l < "$file")
[ "$(tail -c1 "$file" | wc -l)" = 0 ] && n=$((n + 1))   # última linha sem \n

{
  echo "# Ledger — $file ($n linhas)"
  echo
  echo "Leia o arquivo inteiro com números de linha. Preencha cada bloco: o que as linhas fazem,"
  echo "quais itens do checklist foram verificados, e o achado (\`ok\` ou \`#id\` com severidade)."
  echo
  echo "| Linhas | O que fazem | Verificações (checklist) | Achado |"
  echo "|---|---|---|---|"
  start=1
  while [ "$start" -le "$n" ]; do
    end=$((start + size - 1)); [ "$end" -gt "$n" ] && end=$n
    # tenta encerrar o bloco numa linha em branco próxima (até 8 linhas antes), para não cortar funções
    if [ "$end" -lt "$n" ]; then
      for back in 0 1 2 3 4 5 6 7 8; do
        cand=$((end - back)); [ "$cand" -le "$start" ] && break
        if [ -z "$(sed -n "${cand}p" "$file" | tr -d '[:space:]')" ]; then end=$cand; break; fi
      done
    fi
    echo "| $start-$end |  |  | TODO |"
    start=$((end + 1))
  done
  echo
  echo "## Achados"
  echo
  echo "<!-- ### #1 🔴|🟠|🟡 título — arquivo:linha / trecho / por que / teste que prova / correção -->"
} > "${out:-/dev/stdout}"

[ -n "$out" ] && echo "ledger criado: $out ($n linhas)"
