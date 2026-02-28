# LogicSim – Bedienungsanleitung

> **Version:** aktueller Stand (Feb 2026)
> **Sprache:** Deutsch
> Englische Kurzreferenz → [README.md](README.md)

---

## Inhaltsverzeichnis

0. [Installation & Start](#0-installation--start)
1. [Oberfläche im Überblick](#1-oberfläche-im-überblick)
2. [Gatter platzieren](#2-gatter-platzieren)
3. [Kabel zeichnen](#3-kabel-zeichnen)
4. [Canvas navigieren (Zoom & Pan)](#4-canvas-navigieren-zoom--pan)
5. [Selektion & Bewegung](#5-selektion--bewegung)
6. [Gatter anpassen (Kontextmenü)](#6-gatter-anpassen-kontextmenü)
7. [Schalter & Taster bedienen](#7-schalter--taster-bedienen)
8. [Taktgenerator & Pause/Einzelschritt](#8-taktgenerator--pauseeinzelschritt)
9. [Wahrheitstabelle & Zustandsübergangstabelle](#9-wahrheitstabelle--zustandsübergangstabelle)
10. [Timing-Diagramm](#10-timing-diagramm)
11. [FSM-Editor](#11-fsm-editor)
12. [Custom IC](#12-custom-ic)
13. [ROM-Editor](#13-rom-editor)
14. [Speichern & Laden](#14-speichern--laden)
15. [Export (Verilog / VHDL / JSON)](#15-export-verilog--vhdl--json)
16. [Tastenkürzel](#16-tastenkürzel)
17. [Häufige Fehler & Lösungen](#17-häufige-fehler--lösungen)
18. [Baustein-Referenz: ALU4](#18-baustein-referenz-alu4)

---

## 0. Installation & Start

### Voraussetzungen

| Software | Mindestversion | Download |
|---|---|---|
| **Node.js** | 18 | [nodejs.org](https://nodejs.org) |
| **npm** | 9 | (wird mit Node.js mitgeliefert) |

Version prüfen:
```bash
node --version   # z. B. v20.11.0
npm --version    # z. B. 10.2.4
```

### Erstmalige Installation

```bash
# 1. Repository klonen
git clone https://github.com/<dein-benutzername>/logic-gate-simulator.git

# 2. In den Projektordner wechseln
cd logic-gate-simulator

# 3. Abhängigkeiten installieren (einmalig)
npm install
```

### Entwicklungsserver starten

```bash
npm run dev
```

Öffne anschließend **[http://localhost:5173](http://localhost:5173)** im Browser.
Der Simulator lädt sofort – kein Backend, keine Anmeldung erforderlich.

> **Tipp:** Der Entwicklungsserver unterstützt **Hot Module Replacement** – Änderungen am Quellcode werden sofort im Browser sichtbar, ohne manuelles Neu-Laden.

### Produktions-Build (optional)

Für ein optimiertes, deploymentfähiges Build:

```bash
npm run build       # Erstellt den Build in ./dist/
npm run preview     # Lokale Vorschau des fertigen Builds
```

Die `dist/`-Ausgabe kann auf jedem statischen Webserver (GitHub Pages, Netlify, Vercel, Apache, Nginx, …) gehostet werden – es wird kein Node.js auf dem Server benötigt.

### Simulation beenden

Der Browser-Tab schließen oder `Ctrl + C` im Terminal, in dem `npm run dev` läuft.

> **Auto-Save:** Die aktuelle Schaltung wird automatisch im `localStorage` des Browsers gespeichert. Beim nächsten Öffnen von `localhost:5173` wird sie wiederhergestellt.

---

## 1. Oberfläche im Überblick

```
┌─────────────────────────────────────────────────────────────────┐
│  Toolbar  (Speichern, Laden, Export, Analyse, Takt-Pause, …)    │
├──────────────┬──────────────────────────────────────────────────┤
│              │                                                   │
│  Gate-       │                                                   │
│  Palette     │           Circuit Canvas                         │
│  (links)     │           (Mitte/Rechts)                         │
│              │                                                   │
│  Kategorien: │                                                   │
│  • Basis     │                                                   │
│  • Kombi.    │                                                   │
│  • Sequenz.  ├──────────────────────────────────────────────────┤
│  • E/A       │  Timing-Diagramm-Panel  (unten, anpassbar)       │
│  • IC        │                                                   │
└──────────────┴──────────────────────────────────────────────────┘
```

| Bereich | Funktion |
|---|---|
| **Toolbar** | Speichern, Laden, Export, Analyse öffnen, Takt steuern |
| **Gate-Palette** | Alle verfügbaren Gatter; per Drag & Drop auf den Canvas ziehen |
| **Circuit Canvas** | Unendliche Zeichenfläche für Gatter, Kabel und Annotationen |
| **Timing-Diagramm** | Signalverläufe aller angeschlossenen Leitungen über die Zeit |

---

## 2. Gatter platzieren

### Methode: Drag & Drop
1. Linke Maustaste auf ein Gatter in der **Gate-Palette** halten.
2. Auf den Canvas ziehen.
3. Loslassen – das Gatter rastet automatisch am nächsten Rasterpunkt ein.

### Gatter-Kategorien in der Palette

| Kategorie | Enthält |
|---|---|
| **Basis** | AND, OR, NOT, NAND, NOR, XOR, XNOR, Buffer, Schmitt-Trigger, Tri-State |
| **Kombinatorisch** | MUX, DEMUX, Komparator, ALU, Bus-Splitter/-Kombinator |
| **Sequenziell** | D/T/SR/JK-Flipflops, Master-Slave-FF, Schieberegister, Zähler, RAM, ROM |
| **Ein-/Ausgabe** | Schalter, Taster, Taktgenerator, Konstant HIGH/LOW, LED, 7-Segment, ADC, Schrittmotor |
| **ICs** | 74xx-Serie, Custom IC |

### Eingänge einstellen (Eingangsanzahl)
Einige Gatter (AND, OR, NAND, NOR, XOR, XNOR) sind in Varianten mit 2–8 Eingängen verfügbar. Die Zahl steht in Klammern hinter dem Gatternamen in der Palette.

---

## 3. Kabel zeichnen

### Verbindung herstellen
1. **Linksklick auf einen Ausgangsport** (kleiner Kreis am rechten Rand eines Gatters) – das Zeichnen beginnt.
2. Optional: **Linksklick auf freie Canvasfläche** – fügt einen Wegpunkt (Knick) ein.
3. **Linksklick auf einen Eingangsport** (kleiner Kreis am linken Rand) – die Verbindung wird gespeichert.

> **Hinweis:** Ein Eingangsport kann nur **eine** Verbindung empfangen. Ausgänge können zu mehreren Eingängen verbunden werden (Fan-Out).

### Verbindung abbrechen
- `Escape`-Taste drücken während ein Kabel in Bearbeitung ist.

### Rückkopplungsschleifen
Zyklen (z. B. NOT → NOT → zurück) sind ausdrücklich **erlaubt**. Es gibt keine UI-seitige Zyklus-Sperre. Die Simulations-Engine behandelt Rückkopplungen korrekt über das Double-Buffer-Modell.

### Kabel löschen
- Rechtsklick auf ein Kabel → **Löschen** im Kontextmenü; oder
- Kabel anklicken (selektieren) und `Delete` / `Backspace` drücken.

### Kabel einfärben
- Rechtsklick auf ein Kabel → **Farbe setzen** – wähle eine Farbe zur visuellen Unterscheidung.

---

## 4. Canvas navigieren (Zoom & Pan)

| Aktion | Eingabe |
|---|---|
| **Zoomen** | Mausrad scrollen (Mitte des Cursors als Zoomzentrum) |
| **Pan (verschieben)** | `Alt`-Taste gedrückt halten + Maus ziehen |

Der Canvas ist unbegrenzt – die Schaltung kann beliebig weit in alle Richtungen wachsen.

---

## 5. Selektion & Bewegung

### Einzelnes Element selektieren
- Linksklick auf ein Gatter oder ein Kabel.

### Mehrere Elemente selektieren (Lasso)
- Linksklick und Ziehen auf freier Canvasfläche → ein Auswahlrechteck entsteht.
- Alle Gatter innerhalb des Rechtecks werden selektiert.

### Selektierte Gatter verschieben
- **Maus:** Selektierte Gatter mit Linksklick+Ziehen verschieben.
- **Tastatur:** Pfeiltasten verschieben um einen Rasterschritt.

### Kopieren & Einfügen
- `Ctrl + C` / `Ctrl + V` (oder Toolbar-Buttons) für ausgewählte Gatter.

### Löschen
- `Delete` oder `Backspace` löscht alle selektierten Elemente (Gatter **und** angehängte Kabel).

---

## 6. Gatter anpassen (Kontextmenü)

Rechtsklick auf ein Gatter öffnet das Kontextmenü:

| Option | Verfügbar bei | Beschreibung |
|---|---|---|
| **Umbenennen** | Alle Gatter | Freitext-Beschriftung vergeben (erscheint im Gate-Header und im HDL-Export) |
| **Drehen (90°)** | Alle Gatter | Gatter um 90° drehen (Anschlüsse rotieren mit) |
| **LED-Farbe** | OUTPUT_LED | Leuchtfarbe der Ausgangs-LED wählen |
| **Frequenz** | CLOCK | Taktfrequenz in Hz einstellen (0,1–100 Hz) |
| **Hex-Wert** | ADC8 | Analogen Eingabewert als Hex-Zahl (00–FF) setzen |
| **ROM-Inhalt bearbeiten** | ROM256 | Hex-Editor für den ROM-Speicher öffnen |
| **Hilfe (Op-Codes)** | ALU4 | Zeigt alle 8 Op-Code-Belegungen direkt im Menü an |
| **Löschen** | Alle Gatter | Gatter und alle angebundenen Kabel entfernen |

---

## 7. Schalter & Taster bedienen

### Eingabe-Schalter (`INPUT_SWITCH`)
- **Linksklick** auf den Schalter: Wechselt zwischen **HIGH (1)** und **LOW (0)**.
- Die Ausgabe-LED (Farbe) zeigt den aktuellen Zustand.
- Änderungen lösen sofort eine Settle-Phase in der Simulation aus.

### Taster (`PUSH_BTN`)
- **Linksklick** auf den Taster: Setzt den Ausgang kurzzeitig auf **HIGH (1)** für ~150 ms, danach automatische Rückkehr auf **LOW (0)**.
- Geeignet für Impuls-basierte Schaltungen (z. B. Zähler-Reset).

### Konstante Quellen
- **CONST_HIGH** / **CONST_LOW** liefern dauerhaft 1 bzw. 0 ohne Benutzerinteraktion.

---

## 8. Taktgenerator & Pause/Einzelschritt

### Taktgenerator (`CLOCK`)
- Liefert ein periodisches HIGH/LOW-Signal.
- Frequenz einstellbar per Rechtsklick → **Eigenschaften** (Perioden-Ticks konfigurieren).

### Takt pausieren
- **Toolbar-Button „Pause"** (⏸): Alle Taktgeneratoren werden eingefroren, kombinatorische Logik propagiert weiter.

### Einzelschritt
- Im Pause-Modus: **Toolbar-Button „Schritt" (⏭)**: Alle Taktgeneratoren toggeln genau einmal → die Schaltung macht einen einzigen Taktzyklus.
- Ideal zum schrittweisen Debuggen von Flipflop-Ketten oder Zählern.

---

## 9. Wahrheitstabelle & Zustandsübergangstabelle

Öffnen über die **Toolbar → „Analyse"** (oder entsprechendes Icon).

### Automatische Moduswahl

Der Simulator erkennt automatisch, ob die Schaltung Rückkopplungsschleifen enthält:

| Schaltungstyp | Angezeigter Modus |
|---|---|
| Keine Zyklen (rein kombinatorisch) | **Wahrheitstabelle** |
| Mindestens ein Zyklus (sequenziell) | **Zustandsübergangstabelle** |

---

### Wahrheitstabelle (kombinatorisch)

- Listet alle **2ⁿ** Eingangskombinationen (n = Anzahl Eingabe-Schalter).
- Zeigt **Zwischenwerte** aller Gatter-Ausgänge als zusätzliche Spalten.
- Ausgangs-LEDs werden in der letzten Spaltengruppe dargestellt.

**Farblegende:**

| Farbe | Bedeutung |
|---|---|
| 🔵 Blau | Externe Eingaben (Schalter) |
| 🟢 Grün | Ausgänge (LEDs) |
| Grau | Interne Gatterwerte |

---

### Zustandsübergangstabelle (sequenziell / Rückkopplung)

Die STT modelliert das Zeitverhalten von Schaltungen mit Gedächtnis (Latches, Flipflops, Ringoszillatoren).

**Spaltenstruktur:**

| Spaltengruppe | Farbe | Inhalt |
|---|---|---|
| Externe Eingaben | 🔵 Blau | Aktuelle Werte der Eingabe-Schalter |
| Aktueller Zustand Q(t) | 🟡 Gelb/Amber | Ausgänge der Feedback-Gatter (Zustandshalter) |
| Nächster Zustand Q(t+1) | 🟣 Lila | Zustand nach genau einem Simulations-Tick |
| Ausgaben | 🟢 Grün | Werte der angeschlossenen LEDs |

**Stabile Zeilen** (Q(t) = Q(t+1)) werden mit einem **Amber-Hintergrund** hervorgehoben – diese Zustände ändern sich bei gleichen Eingaben nicht.

**Mathematische Korrektheit:**
Pro Zeile wird **exakt ein Simulations-Tick** ausgeführt. Damit entspricht Q(t+1) der präzisen Definition des nächsten Zustands im Double-Buffer-Modell – auch bei geradzahligen Rückkopplungsschleifen (z. B. NOT-NOT-Ring) korrekt.

**Beispiel SR-Latch:**

| S | R | Q(t) | Q̄(t) | Q(t+1) | Q̄(t+1) |
|---|---|------|--------|---------|---------|
| 0 | 0 | 0 | 1 | 0 | 1 | ← stabil |
| 0 | 0 | 1 | 0 | 1 | 0 | ← stabil |
| 0 | 1 | 0 | 1 | 0 | 1 | ← stabil (RESET) |
| 0 | 1 | 1 | 0 | 0 | 1 | ← RESET aktiv |
| 1 | 0 | 0 | 1 | 1 | 0 | ← SET aktiv |
| 1 | 0 | 1 | 0 | 1 | 0 | ← stabil (SET) |
| 1 | 1 | 0 | 1 | – | – | ← verboten |
| 1 | 1 | 1 | 0 | – | – | ← verboten |

---

## 10. Timing-Diagramm

Das **Timing-Diagramm-Panel** am unteren Rand zeigt den zeitlichen Verlauf aller Signale.

### Bedienung

| Aktion | Beschreibung |
|---|---|
| **Panelgröße ändern** | Obere Kante des Panels mit Maus ziehen |
| **Signal ausblenden** | Auf das Auge-Icon (👁) in der Signalzeile klicken |
| **Verlauf löschen** | Toolbar-Button „Verlauf löschen" |

### Angezeigte Signale
- **Alle Kabel** im Canvas erscheinen automatisch als Signalzeilen.
- Pro Zeile: Signal-Name (Gate-ID:Port), HIGH/LOW-Verlauf als Rechteckkurve.

### Datenrate
- Jeder Simulations-Frame (≈60 Hz) in dem sich Signale ändern erzeugt einen Snapshot.
- Maximal **200 Snapshots** werden im Speicher gehalten (ältere werden verworfen).

---

## 11. FSM-Editor

Der **Finite State Machine Editor** ermöglicht es, einen endlichen Automaten grafisch zu entwerfen und mit einem Klick in eine Logikschaltung umzuwandeln.

### Zustand erstellen
1. FSM-Editor über die Toolbar öffnen.
2. **Doppelklick** auf die freie FSM-Fläche → neuer Zustand wird angelegt.
3. Zustand mit Doppelklick umbenennen / als Startzustand / Endzustand markieren.

### Übergang zeichnen
1. Linksklick auf den **Ausgangs-Zustand** → Linksklick auf den **Ziel-Zustand**.
2. Übergangslabel eingeben (Bedingungsausdruck, z. B. `a & !b`).

### Bedingungsausdrücke
Unterstützte Operatoren im Übergangslabel:

| Operator | Bedeutung |
|---|---|
| `a` | Eingangsbit `a` ist 1 |
| `!a` | NOT a |
| `a & b` | a AND b |
| `a \| b` | a OR b |
| `a ^ b` | a XOR b |
| `1` | Immer wahr (Epsilon-Übergang) |

### Synthese
- **Toolbar-Button „Synthetisieren"** (oder ⚙️-Symbol): Der FSM-Graph wird in kombinatorische + sequenzielle Logikgatter umgewandelt und direkt auf den **Circuit Canvas** platziert.
- Die synthetisierte Schaltung enthält Flipflops für die Zustandscodierung und Logikgatter für die Übergangs- und Ausgabefunktionen.

---

## 12. Custom IC

Das **Custom IC**-Feature kapselt eine beliebige Teilschaltung als wiederverwendbares Gatter.

### Custom IC erstellen
1. Teilschaltung auf dem Canvas aufbauen (inkl. Eingabe-Schalter und Ausgangs-LEDs als I/O-Pins).
2. Alle Gatter der Teilschaltung selektieren (Lasso).
3. Toolbar → **„Custom IC erstellen"** → Name vergeben.
4. Das neue Gatter erscheint in der Palette unter **„ICs"**.

### Custom IC verwenden
- Wie jedes andere Gatter: Drag & Drop aus der Palette auf den Canvas.
- Interne Struktur wird simuliert; nach außen sichtbar sind nur die definierten Ports.

### Custom IC bearbeiten
- Rechtsklick auf eine Custom-IC-Instanz → **„IC öffnen"** öffnet die interne Schaltung zur Bearbeitung.

---

## 13. ROM-Editor

Der eingebettete **ROM-Hex-Editor** erlaubt das direkte Programmieren des ROM-Inhalts.

### ROM platzieren & öffnen
1. ROM-Gatter aus der Palette auf den Canvas ziehen.
2. Doppelklick auf das ROM-Gatter (oder Rechtsklick → **„ROM-Editor öffnen"**).

### Hex-Editor
- Jede Zelle zeigt einen 8-Bit-Hexadezimalwert (00–FF).
- Direktes Eintippen in die Zelle ändert den Wert.
- Adressierung über den A-Eingangsbus; Ausgabe am D-Ausgangsbus.

---

## 14. Speichern & Laden

### Auto-Save
Die Schaltung wird **automatisch** nach jeder Änderung im `localStorage` des Browsers gespeichert. Beim nächsten Öffnen der Seite wird der letzte Stand wiederhergestellt.

### Manuelles Speichern (JSON-Export)
1. Toolbar → **„Speichern"** (💾).
2. Eine `.json`-Datei wird heruntergeladen (vollständige Schaltungsbeschreibung).

### Laden (JSON-Import)
1. Toolbar → **„Laden"** (📂).
2. Eine zuvor gespeicherte `.json`-Datei auswählen.
3. Die aktuelle Schaltung wird ersetzt.

> **Warnung:** Beim Laden wird die aktuelle, nicht gespeicherte Schaltung überschrieben.

---

## 15. Export (Verilog / VHDL / JSON)

Öffnen über: **Toolbar → „Export"** (⬇️ oder entsprechendes Symbol).

### JSON
- Vollständiges Round-Trip-Format: alle Gatter, Kabel, Positionen, Zustände.
- Zum Weitergeben und als Backup.

### Verilog
- Generiert synthesefähiges Verilog (IEEE 1364).
- Jedes Gatter wird als entsprechendes Verilog-Primitiv oder Assign-Statement abgebildet.
- Geeignet für FPGA-Synthese-Tools (Vivado, Quartus, …).

### VHDL
- Generiert synthesefähiges VHDL (IEEE 1076).
- Analoge Abbildung wie Verilog.
- Geeignet für VHDL-basierte Design-Flows.

> **Hinweis:** Rückkopplungsschleifen (Latches) werden im exportierten HDL als Latch-Inferenz abgebildet, was in synchronen Designs ggf. Warnungen in Synthesetools erzeugt.

---

## 16. Tastenkürzel

| Taste / Kombination | Aktion |
|---|---|
| `Delete` / `Backspace` | Ausgewählte Gatter und Kabel löschen |
| `↑` `↓` `←` `→` | Ausgewählte Gatter um einen Rasterschritt verschieben |
| `Escape` | Kabelzeichnen abbrechen · Auswahl aufheben |
| `Mausrad` | Canvas zoomen (in/out) |
| `Alt` + Linksklick-Ziehen | Canvas verschieben (Pan) |
| Linksklick auf Ausgangsport | Kabelzeichnen starten |
| Linksklick auf Eingangsport | Kabel fertigstellen |
| Linksklick auf Canvas (beim Zeichnen) | Wegpunkt einfügen |
| Rechtsklick auf Gatter | Kontextmenü (drehen, beschriften, Farbe, löschen) |
| Rechtsklick auf Kabel | Kontextmenü (Farbe, löschen) |

---

## 17. Häufige Fehler & Lösungen

### Signal ändert sich nicht obwohl Schalter umgelegt
**Ursache:** Kabel nicht korrekt verbunden (Port nicht exakt getroffen).
**Lösung:** Auf das Kabel klicken – ist es selektierbar, ist es korrekt verbunden. Andernfalls Verbindung neu ziehen.

### Rückkopplungsschaltung zeigt keine Schwingung
**Ursache:** NOT-NOT-Ring oder ähnliche geradzahlige Schleifen werden durch den Even-Period-Fix stabilisiert und zeigen pro Frame abwechselnde Zustände.
**Lösung:** Timing-Diagramm öffnen – dort ist die Schwingung als alternierende 0/1-Werte sichtbar. Der Canvas zeigt bewusst nur jeden zweiten Zustand, um einen stabilen Anblick zu bieten.

### Zustandsübergangstabelle zeigt Q(t+1) = Q(t) für alle Zeilen
**Ursache:** Es wurden keine Feedback-Gatter erkannt → Schaltung wird als kombinatorisch behandelt.
**Lösung:** Prüfen ob Kabel tatsächlich einen Zyklus bilden (vom Ausgang zurück zu einem Eingang desselben Pfades). Ein echtes Feedback-Kabel muss einen Ausgangsport mit einem Eingangsport verbinden, der auf demselben Logikpfad liegt.

### Wahrheitstabelle hat zu viele Zeilen / Browser friert ein
**Ursache:** Mehr als ~10 Eingabe-Schalter → 2¹⁰ = 1024 Zeilen; bei 15+ Eingängen über 32.000 Zeilen.
**Lösung:** Analyse ist auf praktikable Eingangszahlen (≤ 12–14) ausgelegt. Bei größeren Schaltungen das Timing-Diagramm oder manuelle Schalter-Tests verwenden.

### FSM-Synthese erzeugt keine sichtbare Schaltung
**Ursache:** FSM hat keine Übergänge definiert oder alle Übergangslabels sind syntaktisch ungültig.
**Lösung:** Mindestens zwei Zustände und einen validen Übergang mit korrektem Ausdruck (z. B. `1`) anlegen.

### Gespeicherte Schaltung lässt sich nicht laden
**Ursache:** JSON-Datei gehört zu einer älteren / inkompatiblen Version des Simulators.
**Lösung:** Schaltung manuell neu aufbauen oder JSON-Datei manuell auf das aktuelle Format anpassen (Gate-Typ-IDs prüfen).

---

---

## 18. Baustein-Referenz: ALU4

Die **4-Bit-ALU** (`ALU4`) ist das mächtigste kombinatorische Bauteil im Simulator. Sie führt eine von 8 Operationen aus, die über drei Steuerleitungen **Op[2:0]** ausgewählt werden.

### Anschlüsse

| Port | Richtung | Beschreibung |
|---|---|---|
| **A0–A3** | Eingang | 4-Bit Operand A (A0 = LSB, A3 = MSB) |
| **B0–B3** | Eingang | 4-Bit Operand B (B0 = LSB, B3 = MSB) |
| **Op0–Op2** | Eingang | Operation auswählen (Op0 = LSB, Op2 = MSB) |
| **CIN** | Eingang | Carry-Eingang (für ADD/SUB-Kaskadierung) |
| **S0–S3** | Ausgang | 4-Bit Ergebnis (S0 = LSB, S3 = MSB) |
| **COUT** | Ausgang | Carry-Ausgang (Übertrag / Shift-Ausschuss) |
| **ZERO** | Ausgang | 1, wenn Ergebnis = 0000 |

### Op-Code-Tabelle

| Op2 | Op1 | Op0 | Operation | Formel | COUT |
|---|---|---|---|---|---|
| 0 | 0 | 0 | **ADD** | S = A + B + CIN | Übertrag Bit 4 |
| 0 | 0 | 1 | **SUB** | S = A − B − CIN | Borge-Bit |
| 0 | 1 | 0 | **AND** | S = A & B | 0 |
| 0 | 1 | 1 | **OR** | S = A \| B | 0 |
| 1 | 0 | 0 | **XOR** | S = A ^ B | 0 |
| 1 | 0 | 1 | **NOT A** | S = ~A | 0 |
| 1 | 1 | 0 | **SHL** | S = A << 1 (Links-Shift) | A[3] (herausgeschobenes MSB) |
| 1 | 1 | 1 | **SHR** | S = A >> 1 (Rechts-Shift) | A[0] (herausgeschobenes LSB) |

> **Tipp:** Rechtsklick auf eine ALU4-Instanz → **❓ Hilfe (Op-Codes)** zeigt diese Tabelle direkt im Simulator als Kurzreferenz an.

### Beispiele

**Addition 5 + 3 (ohne Carry):**
- A = 0101 (A0=1, A1=0, A2=1, A3=0), B = 0011, Op = 000, CIN = 0
- Ergebnis: S = 1000 (= 8), COUT = 0, ZERO = 0

**Linksshift von 6 (= 0110):**
- A = 0110, Op = 110
- Ergebnis: S = 1100 (= 12), COUT = 0 (MSB war 0), ZERO = 0

**Linksshift von 9 (= 1001):**
- A = 1001, Op = 110
- Ergebnis: S = 0010 (= 2), COUT = 1 (MSB A[3]=1 wird herausgeschoben), ZERO = 0

### Kaskadierung mehrerer ALUs

Für eine 8-Bit-Addition: COUT der niederwertigen ALU mit CIN der höherwertigen ALU verbinden (Ripple-Carry).

---

*Bedienungsanleitung für LogicSim – Browser-basierter Logikgatter-Simulator*
