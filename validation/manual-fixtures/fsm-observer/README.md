# FSM Observer Fixtures

Status: aktiv

Diese Fixture-Sammlung haelt gespeicherte Canvas-Repros fuer getrennte
projizierte FSM-Batches fest, die nur ueber rohe kombinatorische
Downstream-Beobachterlogik zusammenhaengen.

Datei:

- `fsm0_observer_split_batches_fixture.lgsc.json`

Zweck:

- zwei getrennt synthetisierte projizierte FSMs
- ein rohes `AND` plus rohe `OUTPUT_LED` als gemeinsamer Beobachterpfad
- dokumentierter Split-Fall: trotz gemeinsamem Observer bleiben die Systeme in
  STT und Timing unter `Y` und `Y_1` getrennt selektierbar

Erwartung:

1. Die Datei laedt als normale Canvas-Schaltung.
2. STT bietet weiter zwei projizierte Systeme an.
3. Timing bietet dieselbe getrennte Systemauswahl an.
4. Das rohe Beobachterlabel `OBS` ersetzt diese Systemlabels nicht.
5. Erst eine echte Rueckkopplung oder direkte Verkettung in den projizierten
   Kern darf wieder auf den dokumentierten Mixed-Fallback kippen.

Automatische Regression:

- `src/__tests__/fsm/fsmFixtureRegression.test.ts`
  prueft, dass genau diese gespeicherte Fixture im Analysepfad zwei getrennte
  projizierte FSM-Optionen behaelt

Manuelle Verifikation:

- `validation/ui-manual-verification-plan.md`, Abschnitt G1
