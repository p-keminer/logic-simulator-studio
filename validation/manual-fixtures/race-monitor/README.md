# Race-Monitor Manual Fixtures

Diese Fixture ist fuer die manuelle Verifikation des Race-Monitor-Strangs
gedacht.

Empfohlener Startfall:

1. `race_reconvergent_glitch_repeatable.lgsc.json` laden
2. den Schalter `a` einmal umlegen und kurz warten
3. sobald oben in der Toolbar ein `⚠`-Button erscheint, das Race-Panel oeffnen
4. `a` mehrfach hin und her umschalten, damit derselbe Glitch-Fall wiederholt
   auftritt
5. pruefen, dass derselbe Incident als `×N` koalesziert
6. den Draht `not_2.out -> xor.b`, `not_1` oder `not_2` loeschen
7. pruefen, dass Incident und Drahtmarkierung verschwinden
8. danach `Monitor reset` pruefen

Erwartung:

- ein reproduzierbarer reconvergenter Glitch ohne weitere Aufbauarbeit
- identische Wiederholungen werden koalesziert
- stale Incident und stale Markierung verschwinden jetzt auch dann nach
  Struktur-Aenderung, wenn nur ein vorgelagertes NOT-Gatter des delayed-Branches
  entfernt wurde
- `Monitor reset` leert den Monitorzustand sauber
