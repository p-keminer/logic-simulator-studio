# Operations Checklist

## Zweck

Diese Checkliste dient spaeter als Mindeststandard vor Inbetriebnahme oder groesseren Releases.

## Vor dem ersten Start

- alle ADRs und Contracts freigegeben
- Secret-Quellen definiert und nicht im Repo hinterlegt
- Provider-Hosts auf Allowlist reduziert
- Timeouts und Rate-Limits gesetzt
- Logging-Redaktion geprueft

## Vor Staging

- Integrations- und Contract-Tests gruen
- `npm run smoke:staging-profile` gruen
- `npm run dev:staging-local` laesst sich lokal reproduzierbar starten
- `npm run smoke:staging-runtime` gruen
- `npm run smoke:staging-url` gegen das vorgesehene Zielsystem gruen
- `render.yaml` und Docker-Artefakte reviewt
- Ziel-Origin fuer `ALLOWED_ORIGINS` festgelegt
- externer Staging-Service ueber HTTPS erreichbar und `/ready` gesund
- vorgeschalteter Staging-Zugangsschutz oder gleichwertige Zugriffsschranke
  fuer spaeteren haerteren Betrieb festgelegt
- Session-Key-Registrierung fuer externes Staging nicht mehr als frei
  oeffentlicher Endpoint eingeplant
- Platzhalter-Origin durch echte Frontend-Staging-Domain ersetzt
- Missbrauchsszenarien simuliert
- Monitoring und Alerting aktiv
- Alarmierung fuer Session-Key-Spikes, CORS-Ablehnungen und
  Provider-/Upstream-Fehler vorbereitet
- Fehlerantworten auf sensible Daten geprueft

## Vor Produktion

- Rollback dokumentiert
- Incident-Kontakte und Verantwortungen geklaert
- Produktionskonfiguration reviewt
- Secret-Rotation getestet
- Audit-Ereignisse pruefbar

## Nach dem Go-Live

- Fehlerraten beobachten
- Provider-Latenzen beobachten
- Limit-Verletzungen beobachten
- Kostenentwicklung beobachten

## Spaetere Implementierungsschritte

1. Checkliste in Release-Prozess integrieren
2. Freigabepunkte mit Verantwortlichen verknuepfen
3. Nach jedem Incident um neue Punkte ergaenzen
