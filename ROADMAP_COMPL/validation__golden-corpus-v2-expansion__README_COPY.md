# Golden Corpus v2 Expansion

Datum: 2026-03-22
Status: **aktueller Scope abgeschlossen; weiterfuehrende Expansion optional**

Dieses Verzeichnis sammelt den strukturierten Ausbau des Golden Corpus ueber
den aktuellen v1- und Pilot-v2-Stand hinaus. Der aktuelle Pilot-v2-Scope ist
inzwischen fachlich abgeschlossen; was hier steht, ist damit vor allem die
dokumentierte Folgeexpansion fuer spaeter.

## Struktur

- `work-package.md`
  Das eigentliche Struktur-Arbeitspaket fuer tiefere HDL-Traces, breitere
  Referenzschaltungen, groessere Systemfaelle und tiefere
  Hierarchie-/Custom-IC-Absicherung.

## Fokus

Es geht hier bewusst **nicht** um den bestehenden Golden-Corpus-v1-Runner als
solchen, sondern um dessen naechste Ausbaustufe:

- laengere und dichtere funktionale HDL-Traces
- mehr grosse zusammengesetzte Referenzschaltungen
- tiefere/nestbare Hierarchie und Custom-IC-Pfade
- breitere Bus-/Memory-/Konflikt-Systemfaelle
- reproduzierbare Reports und stabile CI-Gates fuer diese groesseren Faelle

Aktueller Stand:
- ein erster tieferer Hierarchie-Boundary-Fall ist jetzt als dokumentiertes
  `expected_limit` Teil des Golden Corpus
- ein groesserer state-heavy Mixed-Datapath-Fall ist jetzt aus Focused-Nine in
  die Golden-Baseline uebernommen
- ein groesserer integrierter RAM-/Decode-/Capture-Systemfall ist jetzt
  ebenfalls Teil der Golden-Baseline
- Acceptance-/Report-Hardening und die Scope-Abschlussbewertung sind erfolgt;
  weitere Golden-v2-Expansion ist damit kein aktiver Pflichtstrang mehr
