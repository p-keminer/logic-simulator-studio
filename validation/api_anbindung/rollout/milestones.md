# Milestones

## M1: Architektur-Freeze

Ziel:

- ADRs, Contracts und Sicherheitsmodell sind freigegeben

Erfolgskriterium:

- keine offenen Grundsatzfragen zu Scope, Key-Modell oder Provider-Fluss

## M2: Backend-Skelett

Ziel:

- Edge API, Session-Modell und Modulgrenzen stehen

Erfolgskriterium:

- Endpunkte validieren Requests bereits, auch wenn der Provider noch gemockt ist

## M3: Sichere Provider-Anbindung

Ziel:

- Gateway, Guardrails und Secret-Handling funktionieren zusammen

Erfolgskriterium:

- Testanfragen laufen ueber den Broker, ohne dass Secrets oder verbotene Felder austreten

## M4: Staging-Hardening

Ziel:

- Observability, Limits und Betriebschecklisten sind aktiv

Erfolgskriterium:

- Staging besteht Contract-, Abuse- und Sicherheitspruefungen

## M5: Begrenzter Produktivstart

Ziel:

- kontrollierter Rollout mit ueberwachter Nutzergruppe

Erfolgskriterium:

- keine kritischen Sicherheits- oder Stabilitaetsbefunde nach dem Pilot

## M6: Allgemeine Freigabe

Ziel:

- Funktion ist fuer den vorgesehenen Nutzerkreis freigegeben

Erfolgskriterium:

- Monitoring, Kosten und Support-Prozesse sind stabil
