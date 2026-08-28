# Umgang mit Provider-Schlüsseln

## Aktuelles Modell

Der Nutzer gibt den Provider-Key zur Laufzeit im Broker-Dialog ein. Der Broker
legt ihn ausschließlich im Arbeitsspeicher ab und gibt dem Frontend eine opake
Session-ID mit Ablaufzeit zurück. Der Key gehört weder in `.env` noch in die
Git-Historie.

Die laufende Implementierung:

- hält Session und Key-Referenz in begrenzten In-Memory-Stores
- speichert zusätzlich nur einen gekürzten SHA-256-Fingerprint zur Zuordnung
- beendet Sessions nach der konfigurierten TTL
- ersetzt Key-Material bei Löschen, Ablauf oder Verdrängung durch `[REDACTED]`
- entfernt widerrufene Einträge nach einer kurzen Aufbewahrungsfrist
- redigiert sensible Feldnamen und Key-Muster in Logs und Fehlerdaten

## Verbotene Ablagen

- Repository, `.env`, URL oder Query-Parameter
- `localStorage` oder andere dauerhafte Browser-Speicher
- Klartext-Logs, Metriken, Fehlerobjekte oder Screenshots
- allgemeine Persistenz außerhalb des laufenden Broker-Prozesses

## Betrieb

Auf Loopback bleibt der Verkehr lokal. Wer den Broker über ein Netzwerk
bereitstellt, muss TLS, eine explizite `ALLOWED_ORIGINS`-Liste und den Schutz des
Hostsystems sicherstellen. Ein Neustart verwirft alle Sessions und Keys; das ist
beabsichtigt.

Die automatischen Sicherheitsprüfungen stehen in der
[Testmatrix](../testing/test-matrix.md).
