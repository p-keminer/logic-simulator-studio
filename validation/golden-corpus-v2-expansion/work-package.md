# Golden Corpus v2 Expansion Work Package

Datum: 2026-03-22
Repo: `<repo-root>`
Status: **aktueller Scope abgeschlossen; weiterfuehrende Expansion optional**
Prioritaet: **P2**
Geltungsbereich: **Golden Corpus v2, laengere HDL-Traces, groessere
Referenzschaltungen, tiefere Hierarchie/Custom-IC-Absicherung**

## Zweck

Dieses Arbeitspaket beschreibt die offenen strukturellen Ausbaupunkte fuer den
Golden Corpus nach dem inzwischen erreichten v1- und Pilot-v2-Stand.

Ziel ist ein **breiterer und tieferer Golden Corpus**, der:
- bestehende v2-Pilotfaelle ueber laengere funktionale HDL-Traces absichert
- mehr grosse zusammengesetzte Referenzschaltungen in die Regression zieht
- tiefergehende Hierarchie- und Custom-IC-Pfade belastbar verifiziert
- Bus-, Memory- und Konfliktszenarien in realistischeren Systemschaltungen
  absichert
- als reproduzierbares CI-Gate auch mit groesseren Designs stabil bleibt

## Doku-Pflege

Nach jeder Aenderung an diesem Dokument oder angrenzenden Golden-Corpus-
Dokuquellen muss `npm run snapshot:sync` ausgefuehrt werden, damit
`SNAPSHOT/` aktuell bleibt.

## Aktuell bekannte Anforderungen

### 1. Bestehende v2-Pilotfaelle muessen zeitlich tiefer verifiziert werden

Anforderung:
- Bereits integrierte v2-Seeds duerfen nicht nur ueber kurze kuratierte
  Szenarien laufen.
- Die Regression braucht laengere, dichtere und funktional aussagekraeftigere
  HDL-Traces.

Warum:
- Der aktuelle Stand ist gut genug fuer einen ersten Runner, aber noch stark
  szenariobasiert.
- Viele Fehler in sequentiellen, rueckgekoppelten oder buslastigen Designs
  zeigen sich erst ueber mehrere Zyklen hinweg.

### 2. Golden Corpus v2 braucht mehr Breite bei grossen Systemschaltungen

Anforderung:
- Der Golden Corpus soll ueber die aktuelle Pilot-Sammlung hinaus auf weitere
  grosse zusammengesetzte Referenzschaltungen erweitert werden.
- Neue Faelle sollen jeweils eine bekannte Restluecke gezielt schliessen.

Warum:
- Der Runner ist inzwischen vorhanden und stabil genug, um groessere Faelle zu
  tragen.
- Ohne breitere Systemschaltungen bleibt der Corpus zu nah an einer
  repraesentativen Demo-Sammlung statt an einer tragenden Regressionsebene.

### 3. Hierarchie- und Custom-IC-Pfade muessen ueber one-level hinausgehen

Anforderung:
- Die bisherigen one-level-Faelle duerfen nicht das Ende der
  Hierarchieabsicherung bleiben.
- Es braucht tiefer geschachtelte und wiederverwendete Custom-IC-Strukturen.

Warum:
- Die aktuelle Absicherung deckt erst erste Flattening-Pfade ab.
- Wirklich belastbare Hierarchieabsicherung braucht 2+ Ebenen, Wiederverwendung
  und sowohl kombinatorische als auch sequentielle Pfade.

### 4. Bus-, Memory- und Konflikt-Semantik soll in groesseren Systemen
abgesichert werden

Anforderung:
- Multi-Driver-, Shared-Bus-, RAM-/Register- und X/Z-Ausbreitungsfaelle sollen
  nicht nur als Einzelbeispiel, sondern als Systemverhalten im Golden Corpus
  verankert werden.

Warum:
- Gerade diese Faelle profitieren von groesseren Referenzschaltungen.
- Reale Integrationsfehler liegen oft nicht in einem Einzelgate, sondern in der
  Interaktion zwischen Bus, Speicher, Treibern und nachgelagerten Verbrauchern.

### 5. Der Ausbau muss als reproduzierbares Gate stabil bleiben

Anforderung:
- Neue v2-Faelle duerfen das bestehende `golden-corpus`-Gate nicht in einen
  schwer lesbaren oder instabilen Sonderfall verwandeln.
- Akzeptanz, Reports und Invarianten muessen mit dem Corpus mitwachsen.

Warum:
- Ein groesserer Corpus ist nur dann wertvoll, wenn er nachvollziehbar
  auswertbar bleibt.
- Sonst steigt der Umfang schneller als die Aussagekraft der Ergebnisse.

## Aktueller technischer Stand

### Stand 2026-03-20: Golden Corpus v1 laeuft als echtes CI-Gate

Folgende Punkte sind inzwischen im Projekt verifiziert aufgebaut:

- `validation/run-golden-corpus-v1.mjs`
  - ausfuehrbarer Runner fuer den Golden Corpus
- `validation/golden-corpus-v1.json`
  - 30 Referenzschaltungen inklusive fuenfzehn v2-Pilot-Seeds
- `validation/golden-corpus-v1-summary.json`
  - aktueller Status: `28 pass`, `0 fail`, `2 expected_limit`
- `validation/golden-corpus-v1-report.md`
  - menschenlesbare Ergebnisdarstellung
- `validation/generated-circuits-golden/`
  - erzeugte Golden-Corpus-Schaltungen
- `validation/generated-exports-golden/`
  - exportierte Artefakte fuer HDL-Checks und Diff-Pfade

Verifizierter Status dieses Slices:

- Golden Corpus v1 als ausfuehrbarer Runner: **ja**
- CI-Gate `golden-corpus`: **ja**
- externe HDL-Syntax-/Lint-Pruefung: **ja**
- szenariobasierte HDL-Simulation: **ja**
- v2-Pilot-Seeds in produktiver Regression: **ja**

Restoffen fuer spaetere Vertiefung:

- breitere und dichtere HDL-Traces statt nur kuratierter Kurzlaeufe
- weitere v2-Seeds mit grossen und bus-/memory-lastigen Systemformen
- tiefere/nestbare Hierarchie ueber die bisherigen one-level-Pfade und die neue dokumentierte Deep-Nested-Boundary hinaus
- belastbarere funktionale Systemregression fuer Konflikt-, Bus- und
  Speicherpfade
- weitere fachliche Abschlussbewertung des erweiterten Corpus; die
  Acceptance-/Report-Haertung selbst ist jetzt im Runnerpfad verankert

Neu bereits eingelaufen:
- ein groesserer state-heavy Mixed-Datapath-Fall (`gc_v2_14_mixed_datapath_extended`)
  ist jetzt aus der Focused-Nine-Regressionsschiene in den Golden Corpus
  uebernommen worden und traegt dort eine laengere Mehrtakt-Sequenz statt nur
  eines kurzen Zwei-Zyklen-Checks
- ein groesserer integrierter RAM-/Decode-/Bit-Select-/Hold-/Capture-Fall
  (`gc_v2_15_ram_decode_capture_bus`) verbindet jetzt `RAM256`, `74HC138`,
  `74HC151`, `74HC373` und `REG4` in einer gemeinsamen Systemregression statt
  Bus-, Memory- und Decode-Semantik nur noch als getrennte Einzelbeispiele zu
  behandeln
- Acceptance-/Report-Hardening ist jetzt ebenfalls eingezogen: der Runner
  erzeugt `golden-corpus-v1-acceptance.json` synchron mit Summary und Report,
  und partielle `--slug`-Runs duerfen die kanonischen Golden-Artefakte nicht
  mehr ueberschreiben

## Scope-Abschlussbewertung

Die offizielle Ausbauplanung aus diesem Dokument ist fuer den **aktuellen
Projekt-Scope** jetzt gegen die realen Artefakte und Runner-Ergebnisse
bewertet:

| Anforderung | Bewertung | Begruendung |
|---|---|---|
| 1. tiefere HDL-Traces auf gelandeten v2-Seeds | **erfuellt** | Die Trace-Depth-Hardening-Runde wurde ueber alle gelandeten `gc_v2_*`-Seeds gezogen. |
| 2. mehr Breite bei grossen Systemschaltungen | **im aktuellen Scope erfuellt** | `gc_v2_14_mixed_datapath_extended` und `gc_v2_15_ram_decode_capture_bus` erweitern den Corpus ueber reine Pilot-Kleinfalle hinaus. |
| 3. Hierarchie ueber one-level hinaus | **teilweise erfuellt, Grenze explizit dokumentiert** | `gc_v2_12_nested_halfadder_parent` ist ein direkter nested Pass; `gc_v2_13_deep_nested_halfadder_boundary` dokumentiert die tiefere Grenze stabil als `expected_limit`. |
| 4. Bus-/Memory-/Konflikt-Semantik in groesseren Systemen | **im aktuellen Scope erfuellt** | Bus-Konflikt, RAM-Readback, Decode-Tree und der integrierte RAM-/Decode-/Capture-Fall sind produktiv regressionsfaehig. |
| 5. reproduzierbares Gate mit klarer Akzeptanz/Reports | **erfuellt** | Summary, Report und Acceptance werden gemeinsam erzeugt; partielle Runs koennen die kanonischen Artefakte nicht mehr verfaelschen. |

### Entscheidung

Der Golden-Corpus-Strang ist damit **im aktuellen Scope abgeschlossen**.

Wichtig:
- Das bedeutet **nicht**, dass jede denkbare spaetere Golden-v2-Expansion
  erledigt ist.
- Es bedeutet, dass die derzeitige Pilot-v2-Basis jetzt fachlich belastbar,
  dokumentiert, reproduzierbar und als allgemeingueltige Regression fuer den
  aktuellen Produktumfang akzeptiert ist.
- Weitere Breite oder tiefere Hierarchie bleiben bewusst als **optionale
  Folgeexpansion** dokumentiert und sind keine stillen Restluecken innerhalb
  des aktuell akzeptierten Scope.

### Beobachtete inhaltliche Grenze des aktuellen Stands

Der aktuelle Corpus ist nicht mehr nur Planungsartefakt, aber inhaltlich noch
stark von der Form eines ersten ausfuehrbaren Kerns gepraegt:

- viele Faelle sind bewusst kuratiert und noch nicht zeitlich tief
- v2 deckt bereits mehrere groeßere Formen ab, aber noch mit Pilot-Charakter
- Hierarchie ist begonnen, aber noch nicht wirklich tief oder nestbar
- Bus-/Konflikt-/Memory-Semantik ist vorhanden, aber noch nicht breit genug als
  Systemklasse abgesichert

## Strukturelle Problembeschreibung

### A. Zeitliche Tiefe und funktionale Dichte sind noch zu schmal

Aktuell pruefen viele Corpus-Faelle eine sinnvolle, aber noch relativ kurze
Szenenauswahl.

Folge:
- laengere sequentielle Fehlverlaeufe bleiben leichter unentdeckt
- Rueckkopplungs-, Reset- und Mehrzyklusfehler sind schwacher abgesichert als
  die Grundstruktur

### B. Golden Corpus v2 ist noch eher Pilot-Sammlung als breite Regressionsebene

Die bereits integrierten Seeds zeigen die Richtung, aber noch nicht die volle
Abdeckungsklasse.

Folge:
- groessere Systemformen sind praesent, aber noch nicht breit genug als
  dauerhafte Rueckfallbremse
- bekannte Restluecken sind noch nicht jeweils einem stabilen Referenzfall
  zugeordnet

### C. Hierarchie-/Custom-IC-Absicherung ist noch zu flach

Die bisherigen Pfade belegen erste one-level-Flattening-Semantik, aber keine
tiefere, mehrfach wiederverwendete Hierarchie.

Folge:
- komplexere Wiederverwendungsfehler oder nestbare Exportpfade koennen leichter
  durchrutschen
- die schwereren Architekturfaelle sind noch nicht als Regression vertreten

### D. Bus-/Memory-/Konflikt-Systemfaelle sind noch nicht als eigene starke
Regressionsebene etabliert

Es gibt bereits gute Ansaetze, aber noch keine breite Klasse groesserer
Systemfaelle rund um:
- Shared-Bus-Konflikte
- Downstream-X/Z-Ausbreitung
- Speicher-zu-Register-Pfade
- Decode-/Enable-/Latch-Interaktion

Folge:
- genau die integrierten Systemeffekte, die spaeter schwer zu debuggen sind,
  sind noch nicht breit genug in Referenzschaltungen verankert

### E. Report- und Akzeptanzmodell muss mit dem Corpus mitwachsen

Ein breiterer und tieferer Corpus braucht nicht nur mehr Faelle, sondern auch
ein klareres Akzeptanzmodell pro Seed.

Folge:
- ansonsten werden neue Seeds zwar hinzugefuegt, aber ihre fachliche Funktion
  bleibt unscharf
- CI-Runs werden laenger, ohne dass die Ergebnisinterpretation im selben Mass
  besser wird

## Erste strukturelle Loesungsideen

### 1. Bestehende v2-Seeds zuerst vertiefen, bevor neue Breite entsteht

Statt sofort viele neue Schaltungen hinzuzufuegen, sollten zunaechst die
bereits gelandeten v2-Seeds funktional tiefer gemacht werden:

- laengere Trace-Fenster
- mehr Mehrzyklus-Checkpoints
- dichtere funktionale Erwartungspunkte

Dadurch wird der schon vorhandene Corpus zuerst inhaltlich belastbarer.

### 2. Neue Seeds nur gegen klar benannte Restluecken einfuehren

Jeder neue Golden-Corpus-v2-Fall sollte mindestens eine konkrete offene Luecke
adressieren, etwa:

- tiefere Hierarchie
- groessere Bus-/Konflikt-Systeme
- Memory-/Register-Integrationspfade
- breite kombinatorische oder sequentielle Komposition

Dadurch bleibt der Corpus kuratiert und zielgerichtet.

### 3. Hierarchie als eigenen Ausbaupfad behandeln

Hierarchie-/Custom-IC-Themen sollten nicht nur als Nebenprodukt anderer Seeds
auftauchen, sondern eine eigene Ausbauachse haben:

- kombinatorische Hierarchie
- sequentielle Hierarchie
- wiederverwendete Custom-IC-Bausteine
- 2+ Ebenen statt nur one-level-Flattening

### 4. Konflikt-, Bus- und Memory-Semantik auf Systemebene denken

Diese Klasse sollte ueber gezielte Referenzschaltungen abgesichert werden, in
denen mehrere Effekte zusammenkommen:

- Treiberkonflikt
- X/Z-Propagation
- nachgelagerte Verbraucher
- Speicher-/Register-Uebergaenge
- Enable-/Decode-/Latch-Wechselwirkungen

### 5. Akzeptanz, Reports und CI-Invarianten mit jedem Ausbau mitschneiden

Neue Seeds sollten nicht nur erzeugt, sondern direkt sauber in:

- Akzeptanzkriterien
- Summary-/Report-Felder
- Invariant-Checks
- CI-Laufzeit- und Stabilitaetsbeobachtung

eingebunden werden.

## Arbeitspaket

### WP-GC-1: Trace-Tiefe und funktionale HDL-Simulation vertiefen

Ziel:
- Bereits vorhandene v2-Seeds zeitlich tiefer und funktional dichter
  absichern.

Unterpakete:
- laengere Multi-Cycle-Traces fuer bestehende v2-Seeds
- dichtere Checkpoints statt nur kurzer Szenen
- gezielter Vergleich interner Simulation gegen exportierte HDL-Laeufe

Definition of Done:
- die wichtigsten v2-Seeds haben belastbare Long-Trace-Regressionspfade
- der Golden Corpus ist nicht mehr nur auf kurze kuratierte HDL-Szenen
  begrenzt

### WP-GC-2: Golden Corpus v2 in der Breite ausbauen

Ziel:
- Mehr grosse zusammengesetzte Referenzschaltungen in die produktive Regression
  ziehen.

Unterpakete:
- neue v2-Seeds fuer groessere kombinatorische/sequentielle Mischformen
- weitere bus-/memory-lastige Systemschaltungen
- gezielte Zuordnung "ein Seed schliesst eine konkrete Restluecke"

Definition of Done:
- Golden Corpus v2 ist nicht mehr nur Pilot-Sammlung, sondern breitere
  Regressionsebene
- mehrere groessere Referenzschaltungen decken klar abgegrenzte Systemklassen
  ab

### WP-GC-3: Hierarchie- und Custom-IC-Tiefe erweitern

Ziel:
- Die bisherige one-level-Absicherung in tiefere und wiederverwendete
  Hierarchie ueberfuehren.

Unterpakete:
- 2+ Ebenen Hierarchie statt nur Flattening auf einer Ebene
- kombinatorische und sequentielle Hierarchie getrennt absichern
- wiederverwendete Custom-IC-Pfade mit mehreren Instanzen und Ebenen

Definition of Done:
- der Golden Corpus deckt tiefere/nestbare Hierarchie regressionsfaehig ab
- Hierarchie-/Custom-IC-Verhalten ist nicht mehr nur ueber zwei one-level-Faelle
  vertreten

### WP-GC-4: Bus-, Konflikt- und Speicher-Integrationsszenarien ausbauen

Ziel:
- Kritische Bus-, Konflikt- und Memory-Pfade als groessere Systemregression
  verankern.

Unterpakete:
- groessere Shared-Bus-Konfliktfaelle
- RAM-/BUS-/REG-Integrationspfade
- Downstream-X/Z-Ausbreitung in zusammengesetzten Designs
- Decode-/Enable-/Latch-Interaktion in realistischeren Referenzschaltungen

Definition of Done:
- Konflikt- und Bus-Semantik ist nicht mehr nur lokal, sondern auf
  Systemschaltungsebene regressionssicher
- Speicher- und Registerpfade sind ueber groessere Referenzschaltungen stabil
  abgesichert

### WP-GC-5: Akzeptanz, Reports und CI-Haertung fuer den ausgebauten Corpus

Ziel:
- Die erweiterten Golden-Corpus-v2-Faelle bleiben reproduzierbar, lesbar und
  als Gate stabil.

Unterpakete:
- klare Akzeptanzkriterien pro neuem Seed
- Report-Felder fuer laengere Traces und Hierarchiefehler
- Summary-Invarianten fuer neue Seed-Klassen
- Beobachtung von Laufzeit, Stabilitaet und erwarteten Modellgrenzen

Definition of Done:
- neue Golden-Corpus-v2-Faelle laufen stabil im bestehenden `golden-corpus`-Gate
- Reports zeigen nachvollziehbar, welcher Seed welche Restluecke schliesst

## Optionale Folge-To-dos

- bestehende v2-Seeds ueber laengere HDL-Traces funktional vertiefen
- Golden Corpus v2 um weitere grosse Referenzschaltungen erweitern
- tiefe/nestbare Hierarchie und wiederverwendete Custom-IC-Pfade aufbauen
- Bus-, Konflikt-, Speicher- und X/Z-Systemfaelle breiter regressionsfaehig
  machen
- Akzeptanz- und Reportmodell fuer den ausgebauten Corpus schaerfen

## Betroffene Hauptdateien

- `validation/run-golden-corpus-v1.mjs`
- `validation/golden-corpus-v1.json`
- `validation/golden-corpus-v1.md`
- `validation/golden-corpus-v1-summary.json`
- `validation/golden-corpus-v1-report.md`
- `validation/generated-circuits-golden/`
- `validation/generated-exports-golden/`
- `validation/custom-ic-golden.mjs`
- `.github/workflows/quality-gates.yml`

## Empfehlung fuer spaetere Wiederaufnahme

Nicht sofort mit vielen neuen Seeds starten, solange dieser Strang nicht
bewusst wieder geoeffnet wird.

Stattdessen:
1. zuerst die bereits gelandeten v2-Seeds funktional und zeitlich vertiefen
2. danach neue Seeds nur entlang klar benannter Restluecken aufnehmen
3. Hierarchie-/Custom-IC-Tiefe als eigene Ausbauachse behandeln
4. Bus-/Memory-/Konflikt-Systemfaelle gezielt als groessere Referenzklasse
   ausbauen
5. Akzeptanz, Reports und CI-Invarianten bei jedem Schritt mitschneiden

So bleibt der Golden Corpus nicht nur groesser, sondern fachlich staerker und
als Regression dauerhaft aussagekraeftig.
