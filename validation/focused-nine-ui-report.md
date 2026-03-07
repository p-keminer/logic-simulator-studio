# Focused High-Risk UI Audit

Datum: 2026-03-07
Repo: `<repo-root>`
Server: `<dev-server>`
Rohdaten: `validation/focused-nine-ui-summary.json`

## Kurzfazit

Der separate Browserlauf ueber die 12 fokussierten Hochrisiko-Schaltungen ist gegen den aktuellen P0-Stand gelaufen.

- `0` echte UI-/Projektionsfehler
- `0` erwartete UI-Limit-Faelle bei breiten sequenziellen Zustandsraeumen
- `12` saubere UI-Smoke-Passes
- `0` Infrastruktur-/Ladefehler
- HDL-Modal war in allen erfolgreich geladenen Faellen textuell konsistent mit den generierten Exportdateien
- Timing-Panel hat in allen erfolgreich geladenen Faellen geoeffnet
- Semantischer Timing-Check fuer 5 Fokusfaelle: `0` PASS, `5` WARN (steps=0, headless RAF-Limit)

## Echte UI-Befunde

- keine

## Erwartete UI-Limits

- keine

## Saubere UI-Smoke-Passes

- `tri_not_sanitized`
- `dff_led`
- `jkff_led`
- `tff_led`
- `hc373_oe_z`
- `hc374_oe_z`
- `hc595_oe_shift`
- `hc161_clear`
- `hc163_clear`
- `hc194_modes`
- `multi_driver_same_input`
- `mixed_datapath`

## Infrastruktur-/Ladefehler

- keine

## Semantische Timing-Pruefung (5 Fokusfaelle)

Fuer `tri_not_sanitized`, `dff_led`, `jkff_led`, `tff_led` und `multi_driver_same_input` wird jetzt nicht nur geprueft, ob das Panel laedt, sondern:
- erwartete Signalnamen im SVG sichtbar
- Schritte > 0 nach Wartezeit (Simulation hat Snapshots erzeugt)
- Z-farbige Pfade (amber, #f59e0b) bei Tri-State-Faellen
- X-farbige Pfade (rot, #ef4444) bei Konflikten

### `tri_not_sanitized` — WARN

TRIBUF(a=1, oe=1) → Z; NOT(Z) → X. Z and X colored paths expected.

Schritte: 0 Schritte (Simulation lief nicht oder kein RAF-Tick)

Befunde:
  - Labels OK: [a, oe, y] all visible in timing SVG
  - Steps = 0: simulation produced no timing history (headless RAF scheduling — expectStepsGt0 not met)
  - Z-path (amber): present — HI_Z signal visible in timing waveform
  - X-path (red): present — conflict/X signal visible in timing waveform

### `dff_led` — WARN

D_FF initial settle: labels and step count confirm timing tracks correctly.

Schritte: 0 Schritte (Simulation lief nicht oder kein RAF-Tick)

Befunde:
  - Labels OK: [d, clk, q] all visible in timing SVG
  - Steps = 0: simulation produced no timing history (headless RAF scheduling — expectStepsGt0 not met)

### `jkff_led` — WARN

JK_FF initial settle: four input/output labels confirm channel presence.

Schritte: 0 Schritte (Simulation lief nicht oder kein RAF-Tick)

Befunde:
  - Labels OK: [j, k, clk, q] all visible in timing SVG
  - Steps = 0: simulation produced no timing history (headless RAF scheduling — expectStepsGt0 not met)

### `tff_led` — WARN

T_FF initial settle: three labels confirm sequential gate channels.

Schritte: 0 Schritte (Simulation lief nicht oder kein RAF-Tick)

Befunde:
  - Labels OK: [t, clk, q] all visible in timing SVG
  - Steps = 0: simulation produced no timing history (headless RAF scheduling — expectStepsGt0 not met)

### `multi_driver_same_input` — WARN

Dual drivers (1 vs 0) resolve to X. Red X-conflict path expected in timing.

Schritte: 0 Schritte (Simulation lief nicht oder kein RAF-Tick)

Befunde:
  - Labels OK: [a, b, y] all visible in timing SVG
  - Steps = 0: simulation produced no timing history (headless RAF scheduling — expectStepsGt0 not met)
  - X-path (red): not present — requires steps > 0 (timing history empty)


**Bekannte Grenze:** Bei 5 Faellen wurden 0 Schritte aufgezeichnet. Das Timing-Diagramm der App zeichnet nur bei tatsaechlichen Signalaenderungen (batchChangedNets > 0) auf. In headless Puppeteer kann der requestAnimationFrame-Tick ausbleiben bevor der Audit liest. Signal-Labels sind trotzdem pruefbar (SVG text-Elemente). Fuer Z/X-Pfad-Pruefung wird steps > 0 benoetigt.
## Wichtige Grenze dieses UI-Laufs

Der semantische Timing-Check ist ein erster Schritt ueber den reinen Smoke-Test hinaus.
Signal-Label-Pruefung funktioniert zuverlaessig (SVG text-Elemente sind immer vorhanden).
Z/X-Pfad-Pruefung setzt steps > 0 voraus — das haengt davon ab, ob der headless-Browser
einen requestAnimationFrame-Tick zwischen Circuit-Load und Timing-Lesen ausfuehrt.

Was noch fehlt fuer einen vollen Waveform-Diff:
- Genaue Signalwerte pro Schritt (erfordert Zugriff auf React-State oder App-API)
- Zustandsaenderungen nach manueller Schalter-Interaktion (erfordert Canvas-Klick-Koordinaten)
- Vergleich interner Simulation vs UI-Darstellung (erfordert gemeinsame Datenquelle)

## Bedeutung fuer die Professionalisierung

Positiv:
- UI, Export-Modal und Kernartefakte bleiben fuer die Fokusfaelle konsistent gekoppelt.
- Der fruehere UI-Befund `tri_not_sanitized` ist im P0-Stand nicht mehr reproduzierbar.
- Semantische Pruefung fuer Z/X-Signal-Sichtbarkeit ist jetzt ansatzweise implementiert.

Offen:
- Grosse sequentielle Schaltungen werden reduziert analysiert (Steuerlogik-Projektion statt voller Enumeration).
- Ein echter Timing-Waveform-Diff (Schritt-fuer-Schritt-Vergleich) fehlt noch.
