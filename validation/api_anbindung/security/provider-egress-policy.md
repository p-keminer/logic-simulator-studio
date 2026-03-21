# Provider Egress Policy

## Ziel

Dieses Dokument begrenzt die spaetere Netzwerkausleitung der Backend-Anwendung auf explizit freigegebene Provider-Ziele.

## Grundprinzip

Nur das `provider-gateway` darf ausgehende Verbindungen zu KI-Providern aufbauen. Kein anderes Modul und kein Frontend-Endpunkt darf beliebige Ziel-URLs annehmen oder Proxy-Verhalten bereitstellen.

## Regeln

- nur vorher definierte Provider-Domains sind erlaubt
- Verbindungen erfolgen ausschliesslich ueber TLS
- Redirects auf fremde Hosts werden nicht akzeptiert
- Request-Header werden serverseitig zusammengesetzt, nicht aus dem Frontend uebernommen
- Webhooks oder Rueckkanaele werden standardmaessig nicht unterstuetzt

## Minimale Egress-Kontrollen

- Allowlist fuer Hostnamen
- DNS- und URL-Validierung im Gateway
- feste Timeouts
- begrenzte Retry-Strategie
- Trennung zwischen Provider-Ausfall und interner Fehlerlage

## Monitoring-Anforderungen

- Metriken pro Provider und Modell
- Fehlerrate und Timeout-Rate
- Alarmierung bei unbekannten Zielhosts oder auffaelligen Antwortmustern

## Spaetere Implementierungsschritte

1. erlaubte Provider und Modelle als Konfiguration mit Freigabeprozess definieren
2. HTTP-Client zentral im Gateway kapseln
3. Redirect- und Zielhost-Pruefung erzwingen
4. Egress-Metriken und Security Alerts anschliessen
