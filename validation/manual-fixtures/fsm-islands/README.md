# FSM Mixed-Islands Fixtures

Status: aktiv

Diese Fixture-Sammlung haelt gespeicherte Canvas-Repros fuer mehrere
getrennte gemischte Sequential-Inseln auf einem Canvas fest.

Datei:

- `fsm0_multiple_mixed_islands_fixture.lgsc.json`
- `fsm0_mixed_islands_shared_observer_fixture.lgsc.json`
- `fsm0_shared_helper_islands_fixture.lgsc.json`

Zweck:

- eine getrennte `projected + raw`-Insel
- zusaetzlich eine getrennte direkt verkettete Mixed-Batch-Insel
- beide Faelle gleichzeitig auf einem Canvas, aber ohne physische Verbindung
- zusaetzlich ein zweiter Repro, in dem zwei getrennte `projected + raw`-
  Inseln nur ueber einen gemeinsamen rohen Observer-Zweig zusammenhaengen
- zusaetzlich ein dritter Repro, in dem zwei getrennte `projected + raw`-
  Inseln nur ueber gemeinsame rohe Feed-forward-Hilfslogik aus Eingangs-
  schaltern zusammenhaengen

Erwartung:

1. Die Datei laedt als normale Canvas-Schaltung.
2. STT und Timing zeigen einen `System`-Selektor.
3. Die beiden gemischten Inseln bleiben als getrennte technische Systeme
   selektierbar.
4. Die Labels bleiben dabei eindeutig, also z. B. `Y` und `Y_1`, statt zwei
   identische `Y`-Eintraege zu zeigen.
5. Eine Insel bleibt `modified_projected_fsm`, die andere
   `mixed_projected_subsystem`.
6. Beim Shared-Observer-Repro bleiben beide technischen Inseln trotz
   gemeinsamem rohem Beobachter getrennt selektierbar und kippen nicht auf
   ein einziges System wie `OBS`.
7. Beim Shared-Helper-Repro bleiben beide technischen Inseln trotz
   gemeinsamer roher Hilfslogik getrennt selektierbar und kippen nicht auf
   ein einziges gemeinsames Mixed-System.

Automatische Regression:

- `src/__tests__/fsm/fsmFixtureRegression.test.ts`
  prueft, dass genau diese gespeicherte Fixture zwei getrennte generische
  Analyse-Subsysteme mit eindeutigen Labels liefert und dass der Shared-
  Observer- sowie der Shared-Helper-Repro ebenfalls in zwei getrennte
  technische Systeme zerfallen

