# Archive: pre-P0 Phase Artefakte

**Archiviert:** 2026-03-07
**Grund:** Superseded by focused-nine audit suite and maturity documents

---

## Was ist hier archiviert?

Diese Dateien entstammen dem Audit-Durchlauf **vor** den P1a/P1b-Fixes und vor der Einführung des focused-nine-Audit-Systems. Sie sind historisch wertvoll als Nachweis des Ausgangszustands, aber nicht mehr der kanonische Stand.

| Datei / Verzeichnis | Inhalt | Warum archiviert |
|---|---|---|
| `audit-current.mjs` | Älterer Audit-Runner (current-Phase) | Superseded by `focused-nine-audit.mjs` |
| `ui-audit-current.mjs` | Älterer UI-Audit-Runner | Superseded by `focused-nine-ui-audit.mjs` |
| `current-fix-verification-report.md` | Fix-Verifikationsbericht vor P1a/P1b | Überholt — Testcount 662, /OE noch offen, hc194 GHDL noch rot |
| `fix-verification-summary.json` | Maschinenlesbare Rohdaten des Fix-Laufs | Superseded by `focused-nine-summary.json` |
| `command-summary.json` | npm test/build/lint Status (662 Tests) | Überholt — Testcount war 662, jetzt 668 |
| `ui-summary-current.json` | UI-Audit-Rohdaten (current-Phase) | Superseded by `focused-nine-ui-summary.json` |
| `generated-circuits-current/` | Generierte Schaltungen (5 Fälle, älterer Satz) | Superseded by `generated-circuits-focused/` (12 Fälle) |
| `generated-exports-current/` | Generierte HDL-Exporte (current-Phase) | Superseded by `generated-exports-focused/` |
| `generated-ui-current/` | UI-Screenshots (current-Phase, nur 1 Datei) | Superseded by `generated-ui-focused/` (8 Screenshots) |

---

## Was hat sich zwischen current und focused geändert?

| Aspekt | pre-P0 (current) | focused (aktuell) |
|---|---|---|
| Testanzahl | 662 | **668** |
| hc194_modes GHDL | FAIL | **PASS** (P1a fix) |
| mixed_datapath GHDL | FAIL | **PASS** (P1a fix) |
| /OE defaultInputValues | fehlend | **vorhanden** (P1b fix) |
| Fokusschaltungen | 5 | **12** |
| Harte Restfehler | tri_not_sanitized, multi_driver | unverändert: tri_not_sanitized, multi_driver |

---

## Wann wieder nützlich?

Diese Artefakte können als Baseline herangezogen werden, wenn:
- jemand den Fortschritt zwischen dem current- und dem focused-Stand nachvollziehen will
- ein Regressionstest zeigen soll, was sich durch die P1a/P1b-Fixes verbessert hat
- Fragen zu den genauen Fundstellen der Sanitization-Bugs entstehen (Datei + Zeilennummern sind in `fix-verification-summary.json` und `current-fix-verification-report.md` dokumentiert)
