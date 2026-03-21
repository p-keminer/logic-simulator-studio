# Provider Abstraction

## Ziel

Dieses Dokument definiert den internen Vertrag zwischen `prompt-orchestrator` und `provider-gateway`. Damit bleibt das System modell- und anbieterneutral.

## Anforderungen

- der Aufrufer uebergibt keinen rohen HTTP-Request
- erlaubte Modelle werden intern abgebildet
- Provider-Optionen werden auf eine kleine interne Struktur reduziert
- Antworten werden in ein neutrales Antwortformat normalisiert

## Interne Request-Felder

- `providerId`
- `modelId`
- `systemPrompt`
- `userPrompt`
- `contextFragments`
- `temperature` nur falls explizit erlaubt
- `maxOutputTokens`
- `requestBudget`
- `correlationId`

## Interne Response-Felder

- `message`
- `finishReason`
- `usage`
- `providerLatencyMs`
- `providerRequestId`

## Verbotene Muster

- beliebige Provider-JSON-Strukturen direkt aus dem Frontend
- unvalidierte Modellnamen
- direkte Weitergabe sensibler Provider-Fehler

## Spaetere Implementierungsschritte

1. interne DTOs fuer Request und Response definieren
2. pro Provider einen Adapter mit identischem Vertrag bauen
3. Fehlernormalisierung und Timeout-Verhalten vereinheitlichen
4. Providerwechsel in Integrations- und Smoke-Tests absichern
