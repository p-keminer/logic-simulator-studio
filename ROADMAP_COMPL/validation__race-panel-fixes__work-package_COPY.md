# Race Panel Structural Work Package

Datum: 2026-03-20
Repo: `<repo-root>`
Status: **in Arbeit**
Prioritaet: **P1/P2**
Geltungsbereich: **Race-Panel, Race-Markierungen, Race-Lifecycle im Store**

## Zweck

Dieses Arbeitspaket beschreibt die offenen strukturellen Probleme rund um
Race-/Hazard-Erkennung und deren Darstellung im UI.

Ziel ist eine **eigene, strukturierte Race-Lifecycle-Logik**, die:
- Race-Eintraege konsistent verwaltet
- stale Races bei Strukturwechseln entfernt
- wiederkehrende identische Races zusammenfasst
- einen manuellen Reset erlaubt
- andere Simulations- oder UI-Logiken nicht versehentlich mitbeeinflusst

## Doku-Pflege

Nach jeder Aenderung an diesem Dokument oder angrenzenden Race-/Panel-
Dokuquellen muss `npm run roadmap:compl` ausgefuehrt werden, damit
`ROADMAP_COMPL/` aktuell bleibt.

## Aktuell bekannte Anforderungen

### 1. Automatischer Reset bei geloeschter betroffener Verbindung

Anforderung:
- Wenn eine Verbindung geloescht wurde, die zu einem Race-Eintrag oder einer
  Race-Markierung gehoert, muss das Race-Panel automatisch bereinigt werden.

Warum:
- Ein Race, das sich auf eine nicht mehr existierende Struktur bezieht, ist
  fachlich nicht mehr gueltig.
- Solche stale Eintraege duerfen weder das Panel noch die Drahtmarkierungen
  weiter belegen.

### 2. Manueller Reset-Button im Race-Panel

Anforderung:
- Es braucht einen expliziten Button, mit dem das Race-Panel jederzeit manuell
  zurueckgesetzt werden kann.

Warum:
- Nutzer brauchen eine bewusste "Clear monitor state"-Aktion.
- Ein Schliessen des Panels ist nicht dasselbe wie ein inhaltlicher Reset.

### 3. Wiederkehrende identische Races duerfen das Panel nicht zuspammen

Anforderung:
- Wenn dasselbe Race immer wieder auftritt, soll es nicht unbegrenzt als neue
  Listeintraege aufaddiert werden.
- Es reicht, wenn derselbe Race-Typ fuer dieselbe strukturelle Ursache einmal
  dokumentiert wurde oder hoechstens koalesziert aktualisiert wird.

Warum:
- Die aktuelle Historie kann sonst das Panel mit immer gleichen Wiederholungen
  fuellen.
- Das verschlechtert Signal-zu-Rauschen und macht echte neue Probleme schwerer
  sichtbar.

### 4. Die Loesung muss als eigene Logikschicht umgesetzt werden

Anforderung:
- Diese Punkte duerfen nicht einfach "irgendwie im Panel" umgesetzt werden.
- Die Race-Verwaltung braucht eine eigene, klar getrennte Logik.

Warum:
- Race-Lifecycle ist kein reines Anzeigeproblem.
- Die Race-Daten entstehen im Scheduler/Store, werden als Drahtmarkierung
  projiziert und im Panel angezeigt.
- Eine saubere Loesung muss deshalb am Race-Zustandsmodell ansetzen, nicht nur
  am Rendering.

## Aktueller technischer Stand

### Stand 2026-03-20: erster verifizierter Lifecycle-Slice umgesetzt

Folgende Punkte sind inzwischen im Code verifiziert umgesetzt:

- `src/store/raceLifecycle.ts`
  - zentrale Helper fuer Signaturbildung, Dedupe, aktives Net-Sampling und
    Pruning veralteter Eintraege
- `src/store/CircuitContext.tsx`
  - store-seitiges Dedupe beim Anhängen neuer Race-Funde
  - Struktur-Pruning bei Gate-/Wire-Aenderungen
  - zentraler `clearRaceMonitor()`-Pfad fuer Panel + Wire-Marking-State
- `src/components/panels/RacePanel.tsx`
  - expliziter Button `Monitor reset`
  - Fokus springt auf das erste noch existierende beteiligte Gate statt blind
    auf `gateIds[0]`
- `src/__tests__/core/raceLifecycle.test.ts`
  - Regressionen fuer Dedupe, Signaturstabilitaet, Pruning, Relevanz und
    Max-Limit

Verifizierter Status dieses Slices:

- store-seitiges Pruning geloeschter Race-Ursachen: **ja**
- manueller Reset-Button: **ja**
- signaturbasiertes Incident-Dedupe statt endlosem Event-Append: **ja**
- Lint / Build / Vitest / focused-nine-ui: **gruen**

Restoffen fuer spaetere Vertiefung:

- optionale Incident-Metriken wie `count`, `firstSeen`, `lastSeen`
- explizite Integrationstests fuer `CircuitContext`-Resetpfade
- Entscheidung, ob ein manueller Reset aktive weiter bestehende Races nur
  leert oder zusaetzlich kurzzeitig unterdruecken soll

### Beobachtete Store-Struktur

In `src/store/CircuitContext.tsx` existieren aktuell zwei relevante Ebenen:

- `raceNetIds`
  - abgeleitete Map fuer aktive Drahtmarkierungen
  - wird TTL-basiert gepflegt
- `races`
  - React-State fuer die Race-Panel-Liste
  - wird aktuell durch neue `detectedRaces` einfach erweitert

Aktuelle Auffaelligkeit:
- Die Drahtmarkierungen haben bereits ein eigenes TTL-/Cleanup-Verhalten.
- Die Panel-Liste `races` ist davon getrennt und wird inzwischen ueber eine
  zentrale Lifecycle-Helferschicht dedupliziert und gegen die aktuelle
  Struktur gepruned.
- Ein kompletter kanonischer Incident-Store mit Zusatzmetadaten ist aber noch
  nicht eingefuehrt.

### Beobachtetes UI-Verhalten

In `src/components/panels/RacePanel.tsx`:
- gibt es jetzt einen expliziten `Monitor reset`-Button
- Panel-Fokus springt auf das erste noch existente beteiligte Gate
- Dedupe/Koaleszierung bleibt bewusst ausserhalb des Panels und liegt im Store

## Strukturelle Problembeschreibung

### A. Race-Historie und aktive Race-Markierung sind nicht sauber getrennt

Aktuell gibt es zwar praktisch zwei Ebenen, aber keine explizite Lebenszyklus-
Definition dafuer, was genau:
- aktiv
- historisch
- veraltet
- identisch wiederkehrend

ist.

Folge:
- stale Eintraege bleiben im Panel
- identische Wiederholungen werden wie neue Funde behandelt
- Reset-Verhalten ist nicht sauber definiert

### B. Strukturwechsel werden fuer Races nicht gezielt ausgewertet

Der Store reagiert bereits auf Strukturwechsel fuer Settle-/Map-Rebuilds.
Es gibt aber noch keine dedizierte Race-Prune-Logik nach:
- Wire geloescht
- Gate geloescht
- Netz-ID nicht mehr vorhanden
- Race referenziert keine valide Struktur mehr

Folge:
- Race-Eintraege koennen laenger leben als ihre eigentliche Ursache

### C. Panel-Liste ist Event-Append, nicht Incident-Management

Aktuell wird semantisch eher ein Event-Log gebaut:
- jede neue Erkennung wird angehaengt
- bis zum Limit

Die Anforderung des Nutzers ist aber naeher an einem Incident-Monitor:
- gleiche Ursache nicht endlos duplizieren
- neue Ursache sichtbar
- stale Ursache entfernen
- bewusster Reset moeglich

## Erste strukturelle Loesungsideen

### 1. Explizites Race-State-Modell einfuehren

Statt nur `races[]` + `raceNetIds` braucht es eine klare Trennung zwischen:

- `activeRaceMarks`
  - was aktuell auf dem Canvas markiert ist
- `raceIncidents`
  - kanonische Eintraege fuer das Panel
- `raceOccurrences`
  - optionale Wiederholungs-/lastSeen-Infos je Incident

Dadurch kann dieselbe Race-Ursache:
- einmal im Panel sichtbar sein
- mehrfach intern beobachtet werden
- aber nicht die Liste zuspammen

### 2. Race-Incidents ueber Signaturen koaleszieren

Fuer wiederkehrende identische Races braucht es einen Signaturschluessel, z. B.:
- Race-Typ
- betroffene Netz-ID
- betroffene Gate-IDs
- normalisierte Konfliktwerte

Moegliche Wirkung:
- derselbe Fund aktualisiert `lastSeen`
- optional erhoeht er `count`
- aber erzeugt nicht jedes Mal einen neuen Listeneintrag

### 3. Strukturpruning als eigene Store-Phase

Bei Aenderungen an Gates/Wires sollte es eine eigene Prune-Phase geben:
- entferne Race-Marks fuer nicht mehr existierende Netze
- entferne Race-Incidents, deren Referenzen nicht mehr valide sind
- aktualisiere die Panel-Liste konsistent mit der neuen Struktur

Wichtig:
- nicht nur bei `circuit.id`-Wechsel
- sondern auch bei inkrementellen Loeschungen auf dem bestehenden Canvas

### 4. Manueller Reset als zentrale Action

Der Reset-Button sollte nicht nur lokale UI-Daten anfassen, sondern eine eigene
zentrale Reset-Action ausloesen, die:
- Race-Incidents leert
- Race-Marks leert
- abgeleitete Maps sauber synchronisiert

Wichtig:
- einheitlicher Pfad fuer Auto-Reset und Manual-Reset
- keine duplizierte Sonderlogik im Panel

### 5. Race-Lifecycle-Logik von Rendering entkoppeln

Die Race-Logik sollte im Store oder in einem eigenen Race-Manager liegen,
nicht in `RacePanel.tsx`.

`RacePanel.tsx` sollte idealerweise nur:
- lesen
- fokussieren
- resetten
- sortiert/rendern

aber nicht selbst ueber Staleness oder Dedupe entscheiden.

## Arbeitspaket

### WP-RACE-1: Kanonisches Race-Lifecycle-Modell

Ziel:
- Klare Definition von aktiv, historisch, stale und koalesziert.

Unterpakete:
- Race-Incident-Modell definieren
- Race-Mark-Modell definieren
- Signatur-/Identity-Modell fuer gleiche Races definieren

Definition of Done:
- Race-Panel und Drahtmarkierungen lesen aus einer klar spezifizierten
  Lifecycle-Logik statt aus lose gekoppelten States

### WP-RACE-2: Strukturpruning bei Gate-/Wire-Loeschung

Ziel:
- Geloeschte betroffene Struktur entfernt Race-State automatisch.

Unterpakete:
- Prune-Regeln fuer nicht mehr existierende netIds
- Prune-Regeln fuer geloeschte gateIds
- Synchronisierung mit Canvas-Markierungen

Definition of Done:
- geloeschte Race-Ursachen verschwinden automatisch aus Panel und Markierungen

### WP-RACE-3: Manueller Reset-Pfad

Ziel:
- Ein Nutzer kann den Race-Monitor explizit zuruecksetzen.

Unterpakete:
- zentrale Reset-Action
- RacePanel-Button
- konsistenter Reset aller abgeleiteten Race-States

Definition of Done:
- ein manueller Reset leert den Race-Zustand sauber und reproduzierbar

### WP-RACE-4: Dedupe und Koaleszierung wiederkehrender Races

Ziel:
- identische wiederkehrende Races fluten das Panel nicht mehr.

Unterpakete:
- Race-Signaturen bilden
- Incident-Update statt Append
- optional `count`, `firstSeen`, `lastSeen`

Definition of Done:
- gleiche Race-Ursachen werden zusammengefasst statt endlos neu angehaengt

### WP-RACE-5: Validierung und Regressionen

Ziel:
- diese Punkte koennen nicht wieder unbemerkt regressieren.

Unterpakete:
- Store-/Lifecycle-Tests fuer Pruning
- Tests fuer Dedupe/Koaleszierung
- UI-Test fuer Reset-Button
- Regression fuer geloeschte Race-Verbindungen

Definition of Done:
- ein Rueckfall auf stale Race-Eintraege oder Panel-Spam wird automatisch rot

## Konkrete offene To-dos

- Race-State-Modell von Event-Append auf Incident-Lifecycle umstellen
- Strukturpruning fuer geloeschte Gates/Wires einbauen
- manuellen Reset als zentrale Action definieren
- identische Race-Ereignisse signaturbasiert koaleszieren
- Regressionstests fuer Loeschung, Reset und Dedupe aufbauen

## Betroffene Hauptdateien

- `src/store/CircuitContext.tsx`
- `src/components/panels/RacePanel.tsx`
- `src/components/canvas/CanvasWire.tsx`
- `src/core/types.ts`
- `src/core/simulation/eventScheduler.ts`

## Empfehlung fuer die Umsetzung

Nicht mit einem lokalen Panel-Hotfix starten.

Stattdessen:
1. Race-Lifecycle-Modell definieren
2. Store-seitiges Pruning und Dedupe bauen
3. manuellen Reset an denselben zentralen Pfad haengen
4. danach erst UI-Button und Regressionen nachziehen

So bleibt die Loesung lokal fuer Race-Management und beeinflusst nicht
ungewollt andere Simulations- oder UI-Logiken.
