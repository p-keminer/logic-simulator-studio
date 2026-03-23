# Test Matrix

## Unit Tests

Ziel:

- Regeln und Transformationen pro Modul isoliert pruefen

Pflichtfaelle:

- Schema-Validierung
- Policy-Regeln
- Kontextreduktion
- Provider-Fehlernormalisierung
- Redaktionsfilter
- Broker-UI-Stateflow fuer `Key -> Chat -> Reset -> Delete`

## Contract Tests

Ziel:

- Stabilitaet der Frontend-Backend- und Provider-Vertraege absichern

Pflichtfaelle:

- Request- und Response-Schemas
- Fehlercodes
- unbekannte Felder
- Versionierungsverhalten

## Integrationstests

Ziel:

- Zusammenspiel der Module pruefen

Pflichtfaelle:

- Key-Hinterlegung bis Chat-Anfrage
- Session-Reset
- Timeout- und Retry-Pfade
- Limit-Verletzungen
- App-seitige Session-Invalidierung ueber Chat, Reset und Delete mit
  konsistenter UI-Fehlerabbildung

## Sicherheitstests

Ziel:

- zentrale Schutzmassnahmen verifizieren

Pflichtfaelle:

- keine Secrets in Logs
- keine Provider-Aufrufe ohne Gateway
- Ablehnung uebergrosser Payloads
- Session-Isolation
- Egress-Allowlist

## Last- und Abuse-Tests

Ziel:

- Systemverhalten unter Druck verstehen

Pflichtfaelle:

- Burst-Traffic
- parallele Requests pro Session
- wiederholte ungueltige Keys
- uebergrosse Chat-Historien

## Spaetere Implementierungsschritte

1. Testpyramide und Verantwortlichkeit pro Testklasse festlegen
2. Testdaten fuer kleine, mittlere und grosse Schaltungen aufbauen
3. Sicherheitsregressionen als feste CI-Kriterien definieren
4. produktionsnahe Smoke-Tests fuer Staging und Rollout erstellen
