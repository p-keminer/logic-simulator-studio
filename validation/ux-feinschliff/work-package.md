# UX-Feinschliff Work Package

Datum: 2026-03-23
Repo: `<repo-root>`
Status: **offen**
Prioritaet: **P2**
Geltungsbereich: **kleine UX-/Bedienungsfeinheiten ohne neue Grundsemantik**

## Zweck

Dieses Dokument sammelt kleinere offene UX-Punkte, die keine eigene grosse
Architekturspur brauchen, aber bewusst sichtbar, priorisierbar und spaeter
klein slice-bar bleiben sollen.

## Doku-Pflege

Nach jeder Aenderung an diesem Dokument oder angrenzenden UX-Dokuquellen muss
`npm run roadmap:compl` ausgefuehrt werden, damit `ROADMAP_COMPL/UX/`
aktuell bleibt.

## Leitregel fuer diesen Strang

- nur kleine, klar abgegrenzte UX-Feinschliffe sammeln
- keine verdeckte Grundsemantik in diesen Strang ziehen
- neue Beobachtungen zuerst hier als Intake dokumentieren, bevor sie ad hoc
  umgesetzt werden
- pro Umsetzung spaeter wieder kleiner Slice mit eigener Verifikation

## Offene Arbeitspakete

| Paket | Thema | Mehrwert | Aufwand | Status |
|---|---|---|---|---|
| `UX0-1` | manuellen Startzustand fuer Flipflops direkt setzen | hoch | klein bis mittel | **offen** |
| `UX0-2` | Simulation standardmaessig pausiert starten | mittel bis hoch | klein | **offen** |
| `UX0-3` | laufende Intake-Liste fuer weitere UX-Feinheiten pflegen | mittel | klein | **laufend** |

## UX0-1 - Manueller Startzustand fuer Flipflops

Ziel:

- sequentielle Elemente sollen einen explizit vom Nutzer gesetzten
  Initialzustand tragen koennen, statt immer nur aus dem impliziten
  Standardzustand zu starten

Aktueller Befund:

- Flipflops lassen sich derzeit nicht bequem per Rechtsklick oder aequivalenter
  direkter Bedienaktion auf `0` oder `1` vorinitialisieren
- dadurch fehlt fuer bestimmte Lehr-/Debug-Szenarien eine einfache Moeglichkeit,
  reproduzierbar aus einem gewuenschten Startzustand zu beginnen

Geplanter Scope:

- explizite UX fuer Initialzustand pro Flipflop
- bevorzugt direkt ueber Kontextmenue / Rechtsklick oder eine gleichwertig
  naheliegende Bedienflaeche
- klar sichtbarer Zustand `0`, `1` oder `default`

Bewusst noch offen:

- welche Gate-Familien genau unterstuetzt werden sollen
- wie diese Vorinitialisierung gespeichert/exportiert wird
- ob nur FFs oder spaeter auch Latches/Register gemeint sind

## UX0-2 - Simulation standardmaessig pausiert starten

Ziel:

- die App soll standardmaessig in einem bewusst gestoppten Zustand starten,
  statt direkt loszulaufen

Aktueller Befund:

- der Play/Pause-Zustand startet heute noch nicht standardmaessig auf
  `gestoppt/pausiert`
- fuer ruhigere Erstinteraktion und reproduzierbarere Beobachtung soll der
  Initialzustand spaeter auf `Pause` umgestellt werden

Geplanter Scope:

- Initialzustand des Play/Pause-Buttons und der darunterliegenden Simulations-
  Steuerung auf `gestoppt`
- klare Gegenpruefung, dass bestehende Bedienablaeufe danach nicht regressieren

## UX0-3 - Intake fuer weitere Beobachtungen

Regel:

- alles, was zwischendurch als echter UX-Feinschliff auffaellt, wird zuerst
  hier erfasst
- jede Beobachtung bekommt Datum, Kurzbeschreibung und einen kleinen
  Einschaetzungshinweis

Aktuelle Intake-Liste:

- `2026-03-23`: Flipflops brauchen eine direkte UX zum Setzen des
  Startzustands (`0` / `1` / default)
- `2026-03-23`: Play/Pause soll standardmaessig auf `gestoppt` starten

## Naechster sinnvoller Slice in diesem Strang

1. zuerst `UX0-2` (standardmaessig pausierter Start), weil klein und breit
   sichtbar
2. danach `UX0-1` als etwas tieferer UX-/Speicher-/Gate-State-Slice
