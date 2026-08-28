# ADR-002: BYO-Key über den lokalen Broker

## Status

Akzeptiert und umgesetzt.

## Entscheidung

Provider-Anfragen laufen nie direkt aus dem React-Frontend. Der Nutzer gibt
seinen eigenen API-Key im Broker-Dialog ein; der lokal oder selbst gehostet
betriebene Broker bindet ihn an eine kurzlebige Session und führt die
Provider-Anfrage aus.

Der Broker erzwingt dabei:

- validierte Requests und reduzierte Schaltungskontexte
- feste Provider- und Modellkonfiguration
- Rate-, Payload-, History- und Zeitlimits
- Host-Allowlisting vor ausgehenden Provider-Requests
- normalisierte, redigierte Fehler- und Auditdaten
- explizites Löschen und automatisches Ablaufen der Session

## Begründung

Der Browser benötigt nach dem Verbindungsaufbau nur die opake Session-ID und
kennt keinen direkten Provider-Workflow. Sicherheitsregeln bleiben an einer
prüfbaren Stelle, ohne einen zentralen Cloud-Dienst vorauszusetzen.

## Konsequenzen

Der Broker ist ein zusätzlicher lokaler Prozess und muss bei externer
Bereitstellung mit TLS sowie einer engen Origin-Liste betrieben werden. Der Key
ist während der Session im Speicher des Broker-Prozesses vorhanden; die Regeln
dazu stehen in [`secret-handling.md`](../security/secret-handling.md).

Verworfen sind direkte Browser-Provider-Calls, Key-Speicherung in
`localStorage` und das ungeprüfte Durchreichen beliebiger Provider-Parameter.
