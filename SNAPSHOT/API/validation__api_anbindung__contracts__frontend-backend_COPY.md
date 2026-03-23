# Frontend Backend Contract

## Ziel

Dieses Dokument beschreibt die spaetere oeffentliche API des Brokers gegenueber der React-App.

## Empfohlene Endpunkte

- `POST /v1/session/key`
  - nimmt einen Benutzer-API-Key entgegen
  - gibt nur eine Session- oder Key-Referenz zurueck
- `POST /v1/chat/request`
  - nimmt Benutzerfrage, Chat-Historie und offenen Schaltungskontext entgegen
  - liefert normalisierte Chat-Antwort
- `POST /v1/chat/reset`
  - verwirft den serverseitigen Chat-Kontext einer Session
- `DELETE /v1/session/key`
  - loescht die Key-Bindung und invalidiert die Session

## Anforderungen an den Request

- alle Requests muessen versioniert sein
- alle Bodies muessen ein striktes Schema besitzen
- unbekannte Felder werden verworfen oder aktiv abgelehnt
- Payload-Groessen muessen pro Endpunkt begrenzt sein

## Anforderungen an die Response

- einheitliches Erfolgsformat
- einheitliches Fehlerformat
- keine Provider-spezifischen Interna im Aussenvertrag
- keine Rueckgabe sensibler Daten

## Minimales Fehlerformat

Vorgesehene Felder:

- `code`
- `message`
- `requestId`
- `retryable`

## Spaetere Implementierungsschritte

1. OpenAPI oder vergleichbare Spezifikation ableiten
2. Zod-, JSON-Schema- oder vergleichbare Laufzeitvalidierung definieren
3. Contract-Tests fuer alle Broker-Endpunkte schreiben
4. Abwaertskompatibilitaet bei Versionserhoehungen festlegen
