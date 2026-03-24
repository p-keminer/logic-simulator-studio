#!/usr/bin/env bash
# Linux: Einmalig ausführbar machen: chmod +x start-launcher.sh
# Danach Doppelklick im Dateimanager (als Programm ausführen).

cd "$(dirname "$0")"

if ! command -v node &>/dev/null; then
  echo "FEHLER: Node.js nicht gefunden."
  echo "Installation: https://nodejs.org"
  read -rp "Enter drücken zum Beenden..."
  exit 1
fi

node launcher.mjs
