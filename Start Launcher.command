#!/usr/bin/env bash
# macOS: Doppelklick in Finder oeffnet dieses Script im Terminal.
# Einmalige Freigabe falls noetig: chmod +x "Start Launcher.command"

set -euo pipefail

cd "$(dirname "$0")"

# ── Node.js pruefen ──────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo "FEHLER: Node.js nicht gefunden."
  echo "Bitte installieren: https://nodejs.org"
  echo "  oder:  brew install node"
  echo "  oder:  nvm install --lts"
  read -rp "Enter druecken zum Beenden..."
  exit 1
fi

# ── Abhaengigkeiten pruefen und ggf. installieren ────────────────────────
if [ ! -d "node_modules" ]; then
  echo "node_modules nicht gefunden – installiere Abhaengigkeiten..."
  npm install
  echo
fi

# ── Broker-Abhaengigkeiten pruefen ──────────────────────────────────────
BROKER_DIR="validation/api_anbindung/backend-sandbox"
if [ -f "$BROKER_DIR/package.json" ] && [ ! -d "$BROKER_DIR/node_modules" ]; then
  echo "Broker node_modules nicht gefunden – installiere..."
  (cd "$BROKER_DIR" && npm install)
  echo
fi

# ── Broker .env pruefen (aus .env.example erstellen falls fehlend) ──────
if [ -f "$BROKER_DIR/package.json" ] && [ ! -f "$BROKER_DIR/.env" ] && [ -f "$BROKER_DIR/.env.example" ]; then
  echo "Broker .env nicht gefunden – erstelle aus .env.example..."
  cp "$BROKER_DIR/.env.example" "$BROKER_DIR/.env"
  echo "HINWEIS: Passe $BROKER_DIR/.env mit deinen eigenen API-Keys an."
  echo
fi

# ── Launcher starten ────────────────────────────────────────────────────
node launcher.mjs
