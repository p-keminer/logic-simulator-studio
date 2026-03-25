# FSM Chained Fixtures

Status: aktiv

Diese Fixture-Sammlung haelt gespeicherte Canvas-Repros fuer direkt verkettete
projizierte FSM-Batches fest.

Datei:

- `fsm0_direct_chained_batches_fixture.lgsc.json`

Zweck:

- zwei getrennt synthetisierte projizierte FSMs
- direkte Verknuepfung vom Zustandsausgang der ersten in den Zustandspfad der
  zweiten
- dokumentierter Fallback-Fall `mixed_projected_subsystem` /
  `fallback_mixed_batches`

Erwartung:

1. Die Datei laedt als normale Canvas-Schaltung.
2. STT und Timing behandeln den Gesamtfall nicht mehr als zwei saubere
   Einzel-FSMs.
3. Es bleibt genau ein technisches/gemischtes Sequential-System.
4. Die Projektion faellt bewusst auf den dokumentierten Mixed-Batch-Fallback.

Automatische Regression:

- `src/__tests__/fsm/fsmFixtureRegression.test.ts`
  prueft, dass genau diese gespeicherte Fixture auf
  `mixed_projected_subsystem` faellt und keine projizierten Einzel-FSM-
  Optionen mehr anbietet

