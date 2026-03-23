# FSM Mixed Fixtures

Status: aktiv

Diese Fixture-Sammlung haelt gespeicherte Canvas-Repros fuer gemischte
`projected + raw`-FSM-Faelle fest.

Datei:

- `fsm0_projected_raw_modified_fixture.lgsc.json`

Zweck:

- eine synthetisierte kanonisch projizierte FSM
- zusaetzlich ein roher `D_FF_R`-Pfad mit `AND`-Rueckkopplung und eigener LED
- derselbe Canvas-Fall, der in STT und Timing bewusst als
  `modified_projected_fsm` behandelt werden soll

Erwartung:

1. Die Datei laedt als normale Canvas-Schaltung.
2. STT und Timing bieten keine kompakte FSM-Sicht mehr an.
3. Beide Panels behandeln den Fall konsistent als nachtraeglich veraenderte
   bzw. ergaenzte synthetisierte FSM mit technischer Ansicht.
4. Solange nur dieses eine System vorhanden ist, erscheint kein
   `System`-Selektor.
5. Wenn spaeter ein weiteres analysierbares System dazukommt, bleibt dieser
   Mixed-Repro unter dem projizierten Label `Y` erkennbar.

Automatische Regression:

- `src/__tests__/fsm/fsmFixtureRegression.test.ts`
  prueft, dass genau diese gespeicherte Fixture im Analysepfad auf
  `modified_projected_fsm` faellt

Manuelle Verifikation:

- `validation/ui-manual-verification-plan.md`, Abschnitt G
