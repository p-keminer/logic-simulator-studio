# Data Flow

## Zweck

Dieses Dokument beschreibt, wie eine Chat-Anfrage fuer die aktuell geoeffnete Schaltung sicher durch das System laeuft.

## Primarer Request-Flow

1. Das Frontend liest die aktuell geoeffnete Schaltung aus dem App-Zustand.
2. Das Frontend erzeugt eine Chat-Anfrage mit:
   - Benutzerfrage
   - reduzierter Chat-Historie
   - serialisiertem Schaltungskontext
   - Session-Referenz
3. Die Edge API validiert Groesse, Schema, Version und Pflichtfelder.
4. Der Auth-Layer ordnet die Anfrage einer Session und einem erlaubten Key-Kontext zu.
5. Der Circuit Context Service prueft:
   - JSON-Struktur
   - Versionskompatibilitaet
   - erlaubte Feldmenge
   - Maximalgroessen
6. Policy Guardrails pruefen:
   - erlaubte Operationen
   - keine versteckten Provider-Overrides
   - keine missbraeuchlichen Payloads
7. Der Prompt Orchestrator baut daraus einen kontrollierten Modell-Request.
8. Das Provider Gateway sendet die Anfrage an den freigegebenen Provider.
9. Die Antwort wird normalisiert, redigiert und an das Frontend zurueckgegeben.
10. Audit and Observability speichert nur sichere Betriebsdaten und keine sensiblen Inhalte im Klartext.

## Separater Flow fuer API-Key-Hinterlegung

1. Der Benutzer traegt seinen API-Key in der App ein.
2. Das Frontend sendet ihn nur ueber TLS an ein eigenes Broker-Endpunkt.
3. Das Backend validiert Provider-Typ und Key-Format grob.
4. Der Key wird entweder:
   - verschluesselt kurzzeitig gespeichert oder
   - in einen kurzlebigen, nicht wieder auslesbaren Session-Verweis ueberfuehrt
5. Die Antwort an das Frontend enthaelt nie den Key selbst.

## Fehler- und Sicherheitsfluss

- ungueltige Schemas werden vor jeder Provider-Kommunikation abgewiesen
- Rate-Limit-Verstoesse werden lokal beantwortet
- Provider-Fehler werden in interne Fehlercodes ueberfuehrt
- sicherheitsrelevante Ereignisse erzeugen Audit-Events

## Kritische Kontrollpunkte

- Eingangsschema an der Edge API
- Kontextpruefung vor Prompt-Erzeugung
- Provider-Egress ausschliesslich ueber das Gateway
- Secret-Redaktion in Logs
- harte Timeouts und Request-Groessenlimits

## Spaetere Implementierungsschritte

1. Endpunkte fuer `key/register`, `chat/request` und optional `chat/reset` definieren
2. Request- und Response-Schemas versionieren
3. maximale Payload-Groesse je Endpunkt festlegen
4. Audit-Events pro Flow-Schritt definieren
5. Fehlercodes fuer Frontend und Provider sauber trennen
