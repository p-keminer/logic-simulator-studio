# Secret Handling

## Ziel

Dieses Dokument beschreibt, wie Benutzer-API-Keys und interne Backend-Secrets spaeter sicher behandelt werden muessen.

## Secret-Kategorien

- Benutzer-API-Keys fuer externe KI-Provider
- interne Signier- oder Session-Secrets
- Verschluesselungsschluessel oder KMS-Referenzen

## Grundregeln

- der Browser speichert einen Benutzer-Key nicht dauerhaft im Klartext
- das Backend schreibt Benutzer-Keys niemals in Logs
- Secrets werden im Speicher nur so kurz wie noetig gehalten
- persistierte Secrets muessen verschluesselt sein
- jede Secret-Verwendung ist an eine Session oder einen klaren Zweck gebunden

## Bevorzugtes Zielmodell

Variante A:

- Benutzer-Key wird an das Backend uebermittelt
- Backend prueft Format und Provider
- Backend speichert den Key verschluesselt mit kurzer TTL
- das Frontend arbeitet anschliessend nur noch mit einer opaken Session-Referenz

Variante B:

- Benutzer-Key wird nicht dauerhaft gespeichert
- Backend erzeugt nur eine In-Memory-Bindung fuer eine kurze Session
- bei Session-Ende wird der Key verworfen

## Verbotene Muster

- Key in `localStorage`
- Key in URL-Parametern
- Key in Klartext-Logs
- Key als Teil allgemeiner Fehlerobjekte
- Weitergabe des Keys an andere interne Module ohne Zweckbindung

## Technische Schutzmassnahmen

- TLS fuer jede Uebertragung
- strukturierte Log-Redaktion
- Verschluesselung ruhender Secrets mit KMS oder vergleichbarem Schluesselmanagement
- dedizierte Secret-Access-Schicht
- explizite Loeschpfade bei Logout, Session-Reset oder Timeout

## Spaetere Implementierungsschritte

1. Secret-Speicherstrategie zwischen TTL-Speicher und rein fluechtiger Session waehlen
2. Datenmodell fuer Key-Referenz statt Key-Wiederanzeige definieren
3. Rotations- und Loeschprozesse spezifizieren
4. Secret-Zugriffe auditierbar machen
