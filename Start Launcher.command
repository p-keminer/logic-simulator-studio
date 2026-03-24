#!/usr/bin/env bash
# macOS: Doppelklick in Finder öffnet dieses Script im Terminal.
# Einmalige Freigabe falls nötig: chmod +x "Start Launcher.command"

cd "$(dirname "$0")"

# Node.js-Verfügbarkeit prüfen
if ! command -v node &>/dev/null; then
  echo "FEHLER: Node.js nicht gefunden."
  echo "Bitte installieren: https://nodejs.org"
  read -rp "Enter drücken zum Beenden..."
  exit 1
fi

node launcher.mjs
