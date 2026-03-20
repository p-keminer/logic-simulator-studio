# UI Manual Verification Plan

Datum: 2026-03-20
Repo: `<repo-root>`
Zweck: manuelle End-to-End-Pruefung der zuletzt verifizierten UI-relevanten
Aenderungen rund um FSM-Exportprojektion, STT, Timing-Diagramm und Panel-
Verhalten.

## Vorbedingungen

- App lokal starten (`npm run dev` oder dein ueblicher Startweg)
- Falls moeglich mit leerem Browser-Cache bzw. hartem Reload arbeiten
- Fuer die FSM-Altfall-Pruefung steht diese Datei bereit:
  - `validation/fsm-export-fixes/cases/downloads/2026-03-20/FSM_EXPORT_19.03.26.lgsc.json`

## Zielumfang

Dieses Manual deckt die zuletzt veraenderten UI-relevanten Bereiche ab:

- kanonische Timing-Projektion fuer synthetisierte FSMs
- statische/kanonische STT fuer isolierte FSMs
- reduzierte STT fuer breite sequenzielle/projected Faelle
- bewusster Fallback fuer gemischte Sequenzfaelle
- Legacy-Bruecke fuer aeltere gespeicherte FSM-Exporte
- Timing-Diagramm-Reihenfolge, echte Buttons, Persistenz
- Race-Panel-Reset, Dedupe und Auto-Pruning geloeschter Race-Ursachen

## Abschnitt A - Basis-Smoketest

1. App starten.
2. Pruefen, dass die Anwendung normal laedt und keine offensichtlichen UI-
   Fehler direkt sichtbar sind.
3. Optional DevTools-Konsole oeffnen und auf sofortige rote Fehler pruefen.

Erwartung:
- App ist bedienbar.
- Keine offensichtliche kaputte Panel-Struktur.

## Abschnitt B - Frisch synthetisierte FSM: kanonische Timing-Kanaele

1. Im FSM-Editor eine kleine frische FSM bauen oder eine vorhandene kleine FSM
   neu auf Canvas synthetisieren.
2. Timing Diagramm oeffnen.
3. Auf die sichtbaren Standardkanaele achten.

Erwartung:
- Sichtbar sind nur die fachlichen/kanonischen Kanaele wie `CLK`, `RST`,
  Eingaenge, `Qn` und fachliche Outputs.
- Keine doppelte Standardanzeige von:
  - `Q`
  - `!Q`
  - LED-Mirror
  - zufaelligen Hilfssignalen/SOP-Zwischennetzen

## Abschnitt C - Frisch synthetisierte FSM: kanonische STT

1. Dieselbe frisch synthetisierte FSM offen lassen.
2. Falls Clock/LEDs sichtbar toggeln, die Simulation bewusst weiterlaufen lassen.
3. Zustandsuebergangstabelle oeffnen.
4. Pruefen, dass oben der Dropdown `STT-Ansicht` sichtbar ist.
5. Zunaechst `FSM kompakt` aktiv lassen, Tabellenkoepfe und Zeilenstruktur ansehen und die Tabelle einige Sekunden offen lassen.
6. Danach auf `Technisch voll` umschalten und die Rohsicht mit der kompakten Sicht vergleichen.

Erwartung:
- `FSM kompakt` zeigt nur die fachlich noetigen FSM-Spalten; technische
  Clock-/Reset-Kombinationen duerfen in dieser Sicht reduziert sein.
- `Technisch voll` zeigt weiterhin die komplette Roh-STT.
- Der Dropdown darf nur erscheinen, wenn die FSM sauber projiziert ist;
  partielle/gemischte Faelle sollen keinen scheinbar gueltigen Kompaktmodus
  mehr anbieten.
- State-Bits erscheinen stabil und fachlich lesbar.
- Die Tabelle wirkt nicht wie eine Live-Mitschrift blinkender LEDs.
- Naechster Zustand und Ausgangsspalten duerfen beim laufenden Blinken nicht sichtbar hin- und herspringen.
- Keine offensichtliche Vermischung von:
  - Zustandsbit
  - invertiertem Hilfssignal
  - LED-Mirror
  - internem Hilfsgatter

## Abschnitt D - Breite FSM: reduzierte STT

Ziel:
- pruefen, dass eine breite projizierte FSM nicht in eine unlesbare Volltabelle
  oder in springende Rohsignale kippt.

Empfohlener Aufbau:
- eine FSM mit mindestens 3 State-Bits und genug Eingaengen, sodass
  `Eingaenge + State-Bits > 8` ist
- Beispiel: 8 Zustaende plus 6-7 externe Eingangsvariablen

Schritte:
1. Eine entsprechend breite FSM synthetisieren.
2. STT oeffnen.
3. Auf Hinweise zur reduzierten Ansicht achten.
4. Pruefen, dass hier kein irrefuehrender technischer Vollmodus angeboten wird.

Erwartung:
- Die STT bleibt renderbar und fachlich lesbar.
- Es wird eine reduzierte/verkürzte Sicht gezeigt statt einer chaotischen
  Volltabelle.
- Kanonische Steuerleitungen bleiben sichtbar.
- Die Tabelle springt nicht wie eine laufende Live-Anzeige.

## Abschnitt E - Gemischter Sequenzfall: bewusster Fallback

Ziel:
- pruefen, dass gemischte Faelle nicht halb-projiziert dargestellt werden.

Einfacher manueller Aufbau:
1. Eine frisch synthetisierte FSM offen lassen.
2. Zusaetzlich ein rohes, nicht zur FSM-Projektion gehoerendes UI-Element
   anschliessen, das bewusst nicht als kanonischer FSM-Eingang erkannt wird,
   z. B. einen `PUSH_BTN` plus separate `OUTPUT_LED`.
3. Den Rohpfad verbunden lassen, ohne ihn ueber den FSM-Editor zu erzeugen.
4. Timing Diagramm und STT erneut oeffnen.

Erwartung:
- Die App faellt bewusst auf den generischen Fallback zurueck.
- Keine halb-projizierte Sonderansicht.
- In der STT erscheint kein Dropdown `STT-Ansicht`; stattdessen bleibt die
  technische Vollsicht aktiv und ein Hinweistext erklaert den Fallback.
- Timing zeigt in diesem Mischfall nicht weiter nur eine scheinbar saubere
  kanonische Teilmenge, wenn die Gesamtstruktur nicht mehr eindeutig ist.

## Abschnitt F - Legacy-Fall: gespeicherter Download-Export

1. Diese Altfall-Datei laden:
   - `validation/fsm-export-fixes/cases/downloads/2026-03-19/FSM_EXPORT_19.03.26.lgsc.json`
2. Timing Diagramm oeffnen.
3. STT oeffnen.
4. Die Tabelle bei laufender Simulation einige Sekunden offen lassen.

Erwartung:
- Die Legacy-Bruecke akzeptiert den Fall weiterhin.
- Timing zeigt eine kanonische Standardmenge statt Roh-Hilfssignalen.
- STT bleibt fachlich lesbar.
- Die Legacy-STT darf trotz blinkender Canvas-Signale nicht sichtbar mitlaufen.
- Der Altfall muss nicht neu gespeichert oder neu synthetisiert werden, um
  die Projektion zu bekommen.

## Abschnitt G - Timing Diagramm: Sortierbuttons und Persistenz

1. Ein Circuit mit mehreren Timing-Kanaelen offen lassen.
2. Timing Diagramm oeffnen.
3. Die Buttons `⇞`, `↑`, `↓`, `⇟` an einzelnen Zeilen benutzen.
4. Reihenfolge veraendern.
5. Optional einzelne Kanaele ein-/ausblenden.
6. Panel schliessen und erneut oeffnen.

Erwartung:
- Sortierung funktioniert ueber echte Buttons.
- Das Steuerpanel mit Namen und Buttons bleibt rechts sichtbar, auch wenn die
  Wellenform im Zeitverlauf weiter nach rechts laeuft.
- `⇞` schiebt eine Zeile komplett nach oben.
- `⇟` schiebt eine Zeile komplett nach unten.
- Es wird der richtige Kanal verschoben.
- Reihenfolge bleibt nach Schliessen/Wiederoeffnen erhalten.
- Hidden-State/Reihenfolge bleiben konsistent.

## Abschnitt H - Timing Diagramm: Vollstaendig vs. Ausgewaehlt

1. Eine synthetisierte FSM oder eine andere groessere sequentielle Schaltung
   offen lassen.
2. Timing Diagramm oeffnen.
3. Den Dropdown `Ansicht` pruefen:
   - `vollstaendig`
   - `ausgewählt`
4. Auf `ausgewählt` wechseln.
5. `signale waehlen` oeffnen und nur einige Kanaele aktiv lassen.
6. Panel schliessen und erneut oeffnen.

Erwartung:
- `vollstaendig` zeigt alle verfuegbaren Kanaele.
- `ausgewählt` zeigt nur die markierten Kanaele.
- Nicht markierte Kanaele tauchen nicht mehr als sichtbare oder eingeklappte
  Zeilen auf.
- Die Signalauswahl bleibt nach Schliessen/Wiederoeffnen erhalten.
- Lange Signalnamen dürfen die Buttons nicht ueberdecken; sie sollen sauber
  gekuerzt werden.

## Abschnitt I - Timing Diagramm: Roh-Fallback mit Zusatzpfad

1. Von Abschnitt E ausgehen oder erneut eine FSM mit manuellem `PUSH_BTN` +
   `OUTPUT_LED` als Zusatzpfad aufbauen.
2. Timing Diagramm oeffnen.
3. Zuerst `vollstaendig` pruefen.
4. Danach `ausgewählt` aktivieren.
5. Im Menue `signale waehlen` gezielt nur die fachlich relevanten Kanaele
   aktiv lassen.

Erwartung:
- Im Roh-/Fallback-Fall bleiben alle technischen Kanaele im Vollmodus sichtbar.
- Ueber `ausgewählt` laesst sich die Anzeige wieder gezielt auf eine kleine,
  lesbare Teilmenge reduzieren.
- Das Diagramm bleibt klar entweder voll oder bewusst gefiltert und kippt
  nicht in eine unklare Mischform.

## Abschnitt J - Timing Diagramm: Taktzyklus-Achse

1. Eine Schaltung mit sichtbarem Taktkanal offen lassen.
2. Timing Diagramm oeffnen.
3. Darauf achten, ob ueber der Wellenform kleine Zahlen erscheinen.
4. Einige Taktzyklen laufen lassen.

Erwartung:
- Ueber dem Taktverlauf erscheint eine kleine Zyklusachse mit fortlaufenden
  Nummern.
- Die Zahlen bleiben ueber der Wellenform und helfen, einzelne Taktzyklen
  leichter zuzaehlen.
- Wenn kein Taktkanal sichtbar ist, darf die Achse auch fehlen.

## Abschnitt K - Panel-Stabilitaet

1. Zwischen Timing Diagramm, STT und ggf. HDL-Ansicht wechseln.
2. Panels mehrfach schliessen und wieder oeffnen.
3. Bei einem FSM-Fall und einem Nicht-FSM-Fall wiederholen.

Erwartung:
- Keine kaputten Panel-Reste.
- Keine unerwarteten Duplikate nach erneutem Oeffnen.
- Kein Umspringen in eine andere Darstellungslogik ohne Strukturwechsel.

## Abschnitt L - Race-Panel: Dedupe wiederkehrender Funde

1. In einem Gate-Delay-Fall bewusst wiederholt denselben Race/Hazard erzeugen.
2. Race-Panel oeffnen und einige Wiederholungen abwarten.

Erwartung:
- Das Panel dokumentiert denselben Incident nicht endlos als neue Eintraege.
- Wiederkehrende identische Funde bleiben koalesziert statt die Liste vollzuspammen.

## Abschnitt M - Race-Panel: Auto-Prune bei geloeschter Ursache

1. Einen Race-Fall erzeugen, sodass Panel-Eintrag und Wire-Markierung sichtbar sind.
2. Danach die betroffene Verbindung oder das betroffene Gate loeschen.
3. Race-Panel offen lassen oder erneut oeffnen.

Erwartung:
- Der stale Race-Eintrag verschwindet automatisch.
- Die betroffene Wire-Markierung bleibt nicht haengen.
- Es bleiben keine Focus-Ziele auf geloeschten Gates zurueck.

## Abschnitt N - Race-Panel: Manueller Reset

1. Einen Race-Fall erzeugen.
2. Race-Panel oeffnen.
3. `Monitor reset` klicken.

Erwartung:
- Race-Liste wird geleert.
- Bestehende Race-Markierungen werden ebenfalls zurueckgesetzt.
- Wenn die zugrunde liegende Race-Ursache weiterhin physisch aktiv ist, darf
  sie spaeter erneut als neuer Fund auftauchen.

## Abschnitt O - Mehrfach-FSM: eindeutige Signalnamen im technischen Fallback

1. Eine erste FSM synthetisieren und auf das Canvas uebernehmen.
2. Eine zweite FSM mit ueberschneidenden Basisnamen synthetisieren, z. B.
   ebenfalls mit `CLK`, `RST`, `A`, `Q0`, `Y`.
3. Sicherstellen, dass beide FSMs gleichzeitig auf dem Canvas liegen.
4. Zustandsuebergangstabelle oeffnen.
5. Den Dropdown `System` pruefen.
6. Zwischen beiden Systemen umschalten.
7. Timing Diagramm oeffnen.

Erwartung:
- Die zweite Synthese bekommt eindeutige kanonische Signalnamen, z. B.
  `CLK_1`, `RST_1`, `A_1`, `Q0_1`, `Y_1`.
- In der STT erscheint fuer Mehrfach-FSM-Faelle ein `System`-Selektor,
  damit jeweils ein vollstaendiges FSM-Subsystem isoliert analysiert wird.
- Beim Umschalten auf das erste bzw. zweite System muessen Eingaenge, Zustandsbits
  und Ausgaenge jeweils zu genau diesem FSM-Block passen.
- Normale sequentielle Folgeschaltungen, die sichtbar an einem dieser
  Subsysteme haengen, muessen in der gewaehlten `Technisch voll`-Ansicht weiter
  mit auftauchen.
- In der STT duÌˆrfen keine kollidierenden Header wie `CLK / CLK` oder `Y / Y`
  mehr sichtbar sein.
- Im Timing duÌˆrfen dieselben fachlichen Signale nicht mehr uneindeutig doppelt
  benannt auftauchen.
- Der Single-FSM-Fall behaelt weiter die unveraenderten Basissignale
  `CLK`, `RST`, `A`, `Q0`, `Y`.
- Tradeoff: Zwei direkt verkettete FSMs gelten aktuell als ein gemeinsames
  verbundenes System und werden nicht als zwei getrennte `System`-Eintraege
  angeboten.

## Abschnitt Q - Mehrere FSMs plus getrennte Rohschaltung

1. Zwei getrennte FSMs gleichzeitig auf das Canvas legen.
2. Zusaetzlich eine komplett getrennte Rohschaltung aufbauen, z. B.
   `INPUT_SWITCH -> NOT -> OUTPUT_LED`, ohne Verbindung zu einer der FSMs.
3. Wahrheitstabelle bzw. STT oeffnen.
4. Den Dropdown `System` pruefen.
5. Zwischen den beiden FSM-Systemen und der Rohschaltung umschalten.

Erwartung:
- Der `System`-Selektor bietet nicht nur die beiden FSM-Systeme an, sondern
  auch die getrennte Rohschaltung.
- Beim Umschalten auf die Rohschaltung wird deren eigene Wahrheitstabelle bzw.
  ihr eigener Analysemodus gezeigt.
- Die Rohschaltung wird nicht von der Mehrfach-FSM-Logik verschluckt.
- Beim Umschalten zurueck auf eine FSM bleiben deren Eingaenge, Zustandsbits
  und Ausgaenge sauber isoliert.

## Abschnitt P - Copy/Paste und Duplicate von synthetisierten FSMs

1. Eine einzelne synthetisierte FSM auf das Canvas legen.
2. Den kompletten FSM-Block markieren und kopieren/einfuegen.
3. STT fuer beide Kopien pruefen.
4. Timing Diagramm fuer beide Kopien pruefen.
5. Danach nur einen Teil derselben FSM markieren, z. B. nur einige
   kanonische Signale oder sichtbare Teilgatter, und erneut kopieren/einfuegen.
6. Optional eine FSM mit zusaetzlichem manuellem `PUSH_BTN` und
   `OUTPUT_LED` als rohen Zusatzpfad vollstaendig kopieren/einfuegen.

Erwartung:
- Bei einer Vollkopie bekommt die eingefuegte FSM eine neue und eindeutige
  Signalgruppe, z. B. `CLK_1`, `RST_1`, `A_1`, `Q0_1`, `Y_1`.
- Die eingefuegte Vollkopie bleibt als eigenes, vollstaendiges `FSM-System`
  fuer die STT analysierbar.
- Die Original-FSM bleibt davon unberuehrt.
- Bei einer Teilkopie darf keine halbgeltende `FSM kompakt`-Projektion
  erhalten bleiben; der Teilkopie-Fall muss technisch/fallbackartig bleiben.
- Rohe Zusatzgatter einer vollstaendig kopierten FSM bleiben roh und werden
  nicht faelschlich als projizierte FSM-Signale behandelt.

## Fehlerprotokoll

Wenn etwas auffaellt, pro Befund notieren:

- geladene Schaltung / Quelle
- Schritte bis zum Fehler
- erwartetes Verhalten
- tatsaechliches Verhalten
- ob Timing, STT oder beide betroffen sind
- Screenshot falls sichtbar

## Abschlusskriterien

Der UI-Stand gilt manuell als sauber geprueft, wenn:

- frische FSMs kanonische Timing-Kanaele zeigen
- frische FSMs in der STT fachlich stabil wirken
- breite FSMs in der reduzierten STT lesbar bleiben
- gemischte Faelle bewusst auf Fallback gehen
- der Legacy-Download-Fall weiter funktioniert
- Timing-Reihenfolge, Auswahlmodus und Persistenz stabil bleiben
- Race-Dedupe, Auto-Prune und manueller Reset im Race-Panel sauber funktionieren
- Mehrfach-FSM-Faelle im technischen Fallback eindeutige Signalnamen behalten
- Vollkopien synthetisierter FSMs beim Paste/Duplicate neue, saubere
  Projektionsbatches und eindeutige Signalnamen erhalten
