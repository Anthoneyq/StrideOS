#!/usr/bin/env bash
# Executable database tests on a throwaway local Postgres cluster.
# Applies the supabase stub + the FULL migration chain, then runs
# rls-trigger-tests.sql (read-receipt forgery, athlete reassignment,
# reconciliation undo, linked-evidence guard).
#
# Requires a local Postgres (initdb/pg_ctl/psql). Finds it via PATH or
# Homebrew's postgresql@17/16 kegs.
set -euo pipefail
cd "$(dirname "$0")/../.."

PG_BIN=""
for candidate in "$(command -v initdb >/dev/null 2>&1 && dirname "$(command -v initdb)")" \
                 /opt/homebrew/opt/postgresql@17/bin /opt/homebrew/opt/postgresql@16/bin \
                 /usr/local/opt/postgresql@17/bin /usr/local/opt/postgresql@16/bin; do
  if [ -n "$candidate" ] && [ -x "$candidate/initdb" ]; then PG_BIN="$candidate"; break; fi
done
if [ -z "$PG_BIN" ]; then
  echo "SKIP: no local Postgres found (brew install postgresql@17). These tests did NOT run." >&2
  exit 1
fi

TMP=$(mktemp -d)
PORT=54329
SOCKDIR="$TMP/sock"
mkdir -p "$SOCKDIR"
cleanup(){ "$PG_BIN/pg_ctl" -D "$TMP/data" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT

"$PG_BIN/initdb" -D "$TMP/data" -U stride_owner --auth=trust >/dev/null
"$PG_BIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $SOCKDIR -c listen_addresses=''" -l "$TMP/pg.log" start >/dev/null

PSQL=("$PG_BIN/psql" -h "$SOCKDIR" -p "$PORT" -U stride_owner -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -d postgres -c "create database stride_test" >/dev/null

echo "Applying supabase stub…"
"${PSQL[@]}" -d stride_test -f tests/db/supabase-stub.sql >/dev/null

echo "Applying migration chain…"
for migration in supabase/migrations/*.sql; do
  base=$(basename "$migration")
  if [ "$base" = "20260702121000_enable_pg_cron_expire_trials.sql" ]; then
    # pg_cron is a managed extension unavailable locally; this migration only
    # (re)schedules the trial-expiry job. Skipping is LOGGED, never silent.
    echo "  SKIP $base (pg_cron unavailable locally — cron scheduling untested here)"
    continue
  fi
  echo "  apply $base"
  "${PSQL[@]}" -d stride_test -f "$migration" >/dev/null
done

echo "Running database tests…"
"${PSQL[@]}" -d stride_test -f tests/db/rls-trigger-tests.sql
