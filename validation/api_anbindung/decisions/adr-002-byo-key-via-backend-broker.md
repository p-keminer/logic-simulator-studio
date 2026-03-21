# ADR-002: BYO-Key nur ueber Backend-Broker

## Status

Accepted

## Kontext

Ein Benutzer soll fuer die KI-Nutzung optional einen eigenen API-Key hinterlegen koennen. Eine direkte Provider-Anbindung aus dem Browser waere funktional moeglich, aber sicherheitlich schwach:

- Browsercode ist fuer Nutzer einsehbar
- Provider-Endpunkte waeren direkt exponiert
- Richtlinien, Rate-Limits und Auditierung waeren schwer zentral durchsetzbar
- Fehlkonfigurationen koennten Keys oder sensible Kontexte offenlegen

## Entscheidung

Auch bei einem benutzereigenen API-Key spricht das Frontend niemals direkt mit dem KI-Provider. Stattdessen laeuft jede Anfrage ueber ein dediziertes Backend als Broker.

Der Broker uebernimmt:

- Annahme und Schutz des API-Keys
- Session-Bindung
- Request-Validierung
- Kontextreduktion
- Guardrails
- Provider-Auswahl
- Egress-Kontrolle
- Fehlernormalisierung
- Audit und Missbrauchsschutz

## Begruendung

- Sicherheitskontrollen bleiben zentral erzwingbar
- der Browser kennt keinen direkten Provider-Workflow
- Response- und Error-Formate koennen stabil gehalten werden
- spaetere Providerwechsel bleiben moeglich
- Kosten- und Abuse-Schutz wird technisch durchsetzbar

## Konsequenzen

Positiv:

- bessere Kontrolle ueber Sicherheit und Betrieb
- klare Trennung zwischen Produkt-UI und Provider-spezifischer Logik
- einfachere Observability

Negativ:

- zusaetzlicher Betriebsaufwand fuer das Backend
- mehr Architekturkomplexitaet
- BYO-Key ist nicht rein lokal, sondern laeuft ueber den Broker

## Verwerfene Alternativen

- direkter Provider-Call aus React
- Speicherung des API-Keys nur in `localStorage`
- unkontrolliertes Durchreichen beliebiger Provider-Parameter

## Folgeschritte

1. Secret-Handhabung in `security/secret-handling.md` ausarbeiten
2. `backend-modules/provider-gateway/README.md` als einzige Provider-Ausleitung definieren
3. `contracts/frontend-backend.md` auf brokerzentrierte API ausrichten
