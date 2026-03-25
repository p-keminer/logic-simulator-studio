# FSM Wide Fixture

Status: aktiv

Diese Fixture ist der kanonische breite FSM-Repro fuer `FSM0-3` und `FSM0-7`.

Datei:

- `fsm0_wide_reduced_fixture.fsm.json`

Zweck:

- breite FSM mit 6 Eingaengen und 5 erreichbaren Zustaenden
- im Editor weiterhin handhabbarer Repro fuer breite Steuerflaechen
- im aktuellen Produktstand **bewusst keine** freie Canvas-Synthese mehr, wenn
  die rohe SOP-Netzliste den Browser mit zu vielen Gattern und Leitungen
  ueberlasten wuerde

Erwartung:

1. Die Datei laedt sauber im FSM-Editor.
2. Die breite FSM bleibt als Repro fuer reduzierte/breite Randfaelle erhalten.
3. `Synthetisieren` fuehrt hier jetzt bewusst in eine klare Blockade mit
   Hinweis auf spaetere verdichtete Synthese, statt eine unkontrollierte
   Gate-/Leitungswolke auf das Canvas zu setzen.

Automatische Regression:

- `src/__tests__/fsm/fsm.test.ts`
  bindet diese Datei direkt ein und prueft, dass sie weiter breit genug ist,
  um den aktuellen Synthese-Guard auszulösen

