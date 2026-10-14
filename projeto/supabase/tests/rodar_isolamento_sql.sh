#!/usr/bin/env bash
# Roda as migrações e o teste de isolamento (RLS) em um PostgreSQL comum e descartável,
# sem Docker e sem Supabase. Cria um cluster temporário, usa e apaga.
#
# Limite: o schema auth é imitado por stub_auth.sql. Isto prova a lógica das políticas e das
# funções, mas NÃO substitui o roteiro com o Supabase local (docs/ROTEIRO_ISOLAMENTO.md),
# que usa o Auth de verdade.
#
# Para rodar contra um banco que você já tem (por exemplo o Supabase local), defina DATABASE_URL
# e rode só: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/isolamento.sql
set -euo pipefail

AQUI="$(cd "$(dirname "$0")" && pwd)"
RAIZ="$(cd "$AQUI/../.." && pwd)"
BIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)"
[ -z "$BIN" ] && BIN="$(pg_config --bindir 2>/dev/null || true)"
[ -x "$BIN/initdb" ] || { echo "initdb não encontrado. Instale o servidor PostgreSQL (postgresql-16 ou similar)."; exit 1; }

DIR="$(mktemp -d)"
PORTA=54399
chmod 755 "$DIR"
if [ "$(id -u)" = "0" ]; then
  RODAR=(runuser -u postgres --)
  chown postgres "$DIR"
else
  RODAR=()
fi
cleanup() { "${RODAR[@]}" "$BIN/pg_ctl" -D "$DIR/dados" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$DIR"; }
trap cleanup EXIT

"${RODAR[@]}" "$BIN/initdb" -D "$DIR/dados" -A trust -U postgres >/dev/null
"${RODAR[@]}" "$BIN/pg_ctl" -D "$DIR/dados" -o "-p $PORTA -k $DIR -c listen_addresses=''" -l "$DIR/log" -w start >/dev/null

PSQL=(psql -h "$DIR" -p "$PORTA" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f "$AQUI/stub_auth.sql"
for m in "$RAIZ"/supabase/migrations/*.sql; do
  echo "Aplicando $(basename "$m")"
  "${PSQL[@]}" -f "$m"
done
"${PSQL[@]}" -f "$AQUI/isolamento.sql"
