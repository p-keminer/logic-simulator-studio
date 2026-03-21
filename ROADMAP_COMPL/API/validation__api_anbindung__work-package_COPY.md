# Work Package

## Zweck

Dieses Dokument zerlegt die spaetere Umsetzung in klar abgrenzbare Arbeitspakete. Es dient als operative Uebersicht ueber die Reihenfolge und die Abhaengigkeiten.

## Doku-Pflege

Nach jeder Aenderung an diesem Dokument oder angrenzenden API-Dokuquellen
muss `npm run roadmap:compl` ausgefuehrt werden, damit `ROADMAP_COMPL/API/`
aktuell bleibt.

## Arbeitspaket 1: Scope absichern

Ziel:

- Backend strikt auf "aktuell geoeffnete Schaltung" begrenzen

Umsetzungsschritte:

1. ADRs aus `decisions/` bestaetigen
2. Chat-Use-Cases definieren
3. verbotene Faehigkeiten explizit dokumentieren
4. maximalen Kontextumfang der Schaltung festlegen

Abnahme:

- kein Dokument laesst Multi-Projekt-Verhalten oder Dateisystemzugriff offen

## Arbeitspaket 2: Sicherheitsrahmen festlegen

Ziel:

- sichere Grundregeln fuer Secrets, Sessions, Egress und Abuse-Schutz festziehen

Umsetzungsschritte:

1. Bedrohungsmodell aus `security/` freigeben
2. Secret-Lebenszyklus definieren
3. Rate-Limits und Request-Budgets festlegen
4. Logging-Redaktion und Audit-Felder spezifizieren

Abnahme:

- alle sicherheitskritischen Datenfluesse haben dokumentierte Gegenmassnahmen

## Arbeitspaket 3: API und Datenmodell stabilisieren

Ziel:

- robuste und versionierte Vertraege zwischen Frontend, Backend und Provider schaffen

Umsetzungsschritte:

1. Request- und Response-Schemas festlegen
2. Kontextformat fuer die offene Schaltung finalisieren
3. Provider-Abstraktion definieren
4. Fehlercodes und Retry-Regeln vereinheitlichen

Abnahme:

- Vertragsanpassungen sind versioniert und testbar

## Arbeitspaket 4: Backend-Module implementieren

Ziel:

- kleine, klar getrennte Services oder Module statt monolithischer Logik

Umsetzungsschritte:

1. `edge-api` umsetzen
2. `auth` und Session-Bindung aufbauen
3. `circuit-context` fuer Normalisierung und Pruefung umsetzen
4. `policy-guardrails` und `prompt-orchestrator` anschliessen
5. `provider-gateway` mit Egress-Kontrolle anbinden
6. `audit-and-observability` integrieren

Abnahme:

- jedes Modul hat messbare Verantwortung und eigene Tests

## Arbeitspaket 5: Betrieb und Deployment

Ziel:

- sichere und nachvollziehbare Laufzeitumgebungen schaffen

Umsetzungsschritte:

1. Environment-Modell definieren
2. Secret-Backends, Key-Verschluesselung und Rotation anschliessen
3. Netzwerk-Policies und Ausleitungsziele begrenzen
4. Betriebschecklisten und Alarmierung festlegen

Abnahme:

- produktionsnahe Umgebung laesst sich reproduzierbar starten und pruefen

## Arbeitspaket 6: Test und Rollout

Ziel:

- sicherer Start mit begrenztem Risiko

Umsetzungsschritte:

1. Testmatrix aus `testing/` umsetzen
2. Missbrauchs- und Lasttests fahren
3. Pilot-Rollout aktivieren
4. Logging, Kosten und Fehlerraten beobachten
5. schrittweise Freigabe erweitern

Abnahme:

- Rollout-Kriterien und Rueckfallstrategie sind schriftlich freigegeben
