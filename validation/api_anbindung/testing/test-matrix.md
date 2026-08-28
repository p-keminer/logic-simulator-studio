# Testmatrix für App und KI-Broker

| Ebene | Abgedeckte Pfade | Befehl |
|---|---|---|
| App-Unit/Integration | Broker-Dialog, URL-Härtung, Session-State, Action-Protokoll und atomarer Undo | `npm test` |
| Broker-Unit/Contract | Request-/Response-Schemas, Kontextreduktion, Provider-Fehler und Redaction | `npm --prefix broker test` |
| Broker-Sicherheit | Session-Isolation, Limits, SSRF-/Host-Allowlist, Secret-Redaction und Store-Kapazität | `npm --prefix broker test` |
| Build/Typen | Frontend- und Broker-Produktionsbuild ohne Testquellen | `npm run build` und `npm --prefix broker run build` |
| UI-Smoke | sichtbarer Ablauf `Key -> Chat -> Reset -> Delete` und Fehler-Recovery | `npm run broker:smoke` |

## UI-Smoke-Szenarien

| Szenario | Befehl |
|---|---|
| abgelaufene/gelöschte Session wiederherstellen | `npm run broker:smoke:recovery` |
| Session-Key-Limit | `npm run broker:smoke:rate-limit` |
| Chat-Limit | `npm run broker:smoke:chat-rate-limit` |
| Reset-Limit | `npm run broker:smoke:reset-rate-limit` |
| ungültige Broker-URL mit Recovery | `npm run broker:smoke:config-error` |
| Policy-Ablehnung mit anschließendem Erfolg | `npm run broker:smoke:policy-block` |
| Provider-/Upstream-Fehler mit Recovery | `npm run broker:smoke:provider-error` |

Die Smoke-Runs benötigen eine laufende App und einen für Tests konfigurierten
Broker. Screenshots und Laufdaten entstehen ausschließlich unter
`.artifacts/validation/broker-ui/` und werden nicht versioniert.

CI führt die deterministischen App- und Broker-Suiten, Builds, Lints sowie
`npm audit --audit-level=high` für beide Lockfiles aus. Echte Provider-Keys sind
in automatisierten Tests nicht zulässig.
