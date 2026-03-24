#!/usr/bin/env bash
set -e

BROKER_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$BROKER_DIR"

echo "[smoke] Starte Broker (PROVIDER=noop, ignoriert .env fuer saubere Verifikation)..."
# PROVIDER=noop überschreibt den Wert aus .env (Node --env-file setzt keine bereits gesetzten Vars)
PROVIDER=noop npm run dev > /tmp/broker-smoke.log 2>&1 &
BROKER_PID=$!

# Warten bis Health-Endpoint antwortet
READY=0
for i in $(seq 1 20); do
  sleep 1
  if curl -sf http://localhost:8787/health > /dev/null 2>&1; then
    echo "[smoke] Broker bereit nach ${i}s (PID $BROKER_PID)"
    READY=1
    break
  fi
  echo "[smoke] Warte... ${i}s"
done

if [ $READY -eq 0 ]; then
  echo "[smoke] FEHLER: Broker nicht gestartet. Log:"
  cat /tmp/broker-smoke.log
  kill $BROKER_PID 2>/dev/null
  exit 1
fi

# Smoke-Verifikation ausführen
node smoke-verify.mjs
EXIT=$?

# Broker sauber beenden
kill $BROKER_PID 2>/dev/null
wait $BROKER_PID 2>/dev/null || true

exit $EXIT
