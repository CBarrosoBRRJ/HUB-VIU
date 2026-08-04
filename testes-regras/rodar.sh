#!/bin/bash
# Recompila ANTES de rodar. Sem isto a suíte testa o .js da rodada anterior e "passa"
# validando código que já não existe — falha silenciosa, a pior categoria.
AQUI="$(cd "$(dirname "$0")" && pwd)"
# O src é o do próprio repositório — o runner morava num diretório temporário com caminho fixo,
# e as suítes se perderiam numa limpeza de disco. Agora versiona junto com o que verifica.
SRC="$(cd "$AQUI/.." && pwd)"

( cd "$SRC" && npx tsc src/utils/*.ts src/types.ts src/data/*.ts --outDir "$AQUI" \
    --module esnext --target es2022 --moduleResolution bundler ) || { echo "TSC FALHOU"; exit 1; }

node -e "
const fs=require('fs'),p=require('path');
for(const d of ['.','utils','data']) for(const f of fs.readdirSync(d).filter(x=>x.endsWith('.js'))){
  const fp=p.join(d,f),s=fs.readFileSync(fp,'utf8');
  const o=s.replace(/from '(\.[^']*?)'/g,(m,x)=>x.endsWith('.js')?m:\`from '\${x}.js'\`);
  if(o!==s)fs.writeFileSync(fp,o);
}"

total=0
for f in teste*.mjs jornada*.mjs qa*.mjs matrizPerfis.mjs; do
  out=$(node "$f" 2>&1)
  n=$(echo "$out" | grep -cE '^FALHA|✗')
  ok=$(echo "$out" | grep -cE '^OK|✓')
  # Suíte que nem chega a rodar é falha, não zero falhas.
  if echo "$out" | grep -qE 'ERR_[A-Z_]+|^\s+at .*\(node:'; then
    printf "%-24s CRASH\n" "$f"; total=$((total+1)); continue
  fi
  total=$((total+n))
  printf "%-24s falhas=%s ok=%s\n" "$f" "$n" "$ok"
done
echo "TOTAL DE FALHAS: $total"
