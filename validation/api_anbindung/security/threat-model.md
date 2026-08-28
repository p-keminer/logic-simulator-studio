# Bedrohungsmodell des lokalen KI-Brokers

## Scope und Vertrauensgrenzen

Betrachtet werden Browser, lokal oder selbst gehosteter Broker und der
konfigurierte KI-Provider. Geschützt werden Provider-Key, Session-ID,
Schaltungs- und Chatkontext sowie das Kostenbudget des Nutzers.

## Bedrohungen und Kontrollen

| Risiko | Kontrollen |
|---|---|
| Key-Abfluss über Speicher, Logs oder Fehler | kurzlebiger In-Memory-Key, opake Session-ID, Redaction, expliziter Widerruf |
| Ungeprüfte Provider-Parameter oder SSRF | strikte Schemas, serverseitige Modellwahl, URL-Prüfung und Host-Allowlist |
| Übermäßige Kosten oder Verfügbarkeitsschaden | Rate-, Payload-, History- und Zeitlimits sowie begrenzte Retries |
| Unnötiger Datenabfluss | Current-Circuit-Only, Feldreduktion und kein Klartext-Prompt-Logging |
| Session-Verwechslung | UUID-Sessions, serverseitige Bindung, TTL und getrennte Historien |
| Schädliche Modellaktionen | enge Aktions-Whitelist, vollständige Vorabvalidierung, Vorschau, Bestätigung und atomarer Batch |
| Unerwünschter Netzwerkzugriff auf den Broker | Loopback-Standard, explizite CORS-Origin-Liste und deaktivierte Dev-Routen in Produktion |

## Restrisiken

- Der Broker-Prozess sieht den Provider-Key während einer aktiven Session.
- Ein kompromittiertes Hostsystem oder ein kompromittierter Provider liegt
  außerhalb des Schutzbereichs der Anwendung.
- Selbst gehosteter Netzwerkbetrieb ist nur so sicher wie TLS-, Firewall- und
  Origin-Konfiguration des Betreibers.
- Provider-Ausfälle und providerseitige Datennutzung lassen sich lokal nicht
  vollständig kontrollieren.

Neue Provider oder neue Aktionsarten erfordern eine erneute Prüfung dieser
Tabelle und passende automatisierte Regressionen.
