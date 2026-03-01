<div align="center">

[🇩🇪 Deutsch](#deutsch) &nbsp;·&nbsp; [🇬🇧 English](#english)

</div>

---

<a id="deutsch"></a>

# LogicSim – Bedienungsanleitung

> **Version:** aktueller Stand (März 2026)
> **Sprache:** Deutsch
> Englische Version → [jump to English](#english)

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
git clone https://github.com/p-keminer/logic-simulator-studio.git

# 2. In den Projektordner wechseln
cd logic-simulator-studio

# 3. Abhängigkeiten installieren (einmalig)
npm install
```

### Entwicklungsserver starten

```bash
npm run dev
```

Öffne anschließend **[http://localhost:5173](http://localhost:5173)** im Browser.
Der Simulator lädt sofort – kein Backend, keine Anmeldung erforderlich.

> **Tipp:** Der Entwicklungsserver unterstützt **Hot Module Replacement** – Änderungen am Quellcode werden sofort im Browser sichtbar.

### Produktions-Build (optional)

```bash
npm run build       # Erstellt den Build in ./dist/
npm run preview     # Lokale Vorschau des fertigen Builds
```

Die `dist/`-Ausgabe kann auf jedem statischen Webserver gehostet werden – kein Node.js auf dem Server nötig.

### Simulation beenden

Den Browser-Tab schließen oder `Ctrl + C` im Terminal.

> **Auto-Save:** Die aktuelle Schaltung wird automatisch im `sessionStorage` gespeichert und beim erneuten Laden innerhalb derselben Browser-Sitzung wiederhergestellt. Für dauerhafte Sicherung → manuell als JSON speichern.

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
│  Suchleiste  │                                                   │
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
| **Gate-Palette** | Alle verfügbaren Gatter; per Drag & Drop auf den Canvas ziehen; Suchfeld zum Filtern |
| **Circuit Canvas** | Unendliche Zeichenfläche für Gatter, Kabel und Annotationen |
| **Timing-Diagramm** | Signalverläufe aller angeschlossenen Leitungen über die Zeit |

---

## 2. Gatter platzieren

### Methode: Drag & Drop
1. Linke Maustaste auf ein Gatter in der **Gate-Palette** halten.
2. Auf den Canvas ziehen.
3. Loslassen – das Gatter rastet automatisch am nächsten Rasterpunkt ein.

### Suche in der Palette
Im **Suchfeld** oben in der Palette nach Name, Typ-ID oder Beschreibung filtern. Das × schließt die Suche.

### Gatter-Kategorien in der Palette

| Kategorie | Enthält |
|---|---|
| **Basis** | AND, OR, NOT, NAND, NOR, XOR, XNOR, Buffer, Schmitt-Trigger, Tri-State |
| **Kombinatorisch** | MUX, DEMUX, Komparator, ALU, Bus-Splitter/-Kombinator |
| **Sequenziell** | D/T/SR/JK-Flipflops, Master-Slave-FF, Schieberegister, Zähler, RAM, ROM |
| **Ein-/Ausgabe** | Schalter, Taster, Taktgenerator, Konstant HIGH/LOW, LED, 7-Segment, ADC, Schrittmotor |
| **ICs** | 74xx-Serie, Custom IC |

### Eingänge einstellen
Einige Gatter (AND, OR, NAND, NOR, XOR, XNOR) sind in Varianten mit 2–8 Eingängen verfügbar.

---

## 3. Kabel zeichnen

### Verbindung herstellen
1. **Linksklick auf einen Ausgangsport** – Zeichnen beginnt.
2. Optional: **Linksklick auf freie Canvasfläche** – fügt einen Wegpunkt ein.
3. **Linksklick auf einen Eingangsport** – Verbindung wird gespeichert.

> **Hinweis:** Ein Eingangsport kann nur **eine** Verbindung empfangen. Ausgänge unterstützen Fan-Out.

### Verbindung abbrechen
- `Escape` während ein Kabel in Bearbeitung ist.

### Rückkopplungsschleifen
Zyklen sind ausdrücklich **erlaubt** – die Engine behandelt sie korrekt.

### Kabel löschen
- Rechtsklick → **Löschen**, oder Kabel selektieren und `Delete` drücken.

### Kabel einfärben
- Rechtsklick → **Farbe setzen**.

---

## 4. Canvas navigieren (Zoom & Pan)

| Aktion | Eingabe |
|---|---|
| **Zoomen** | Mausrad scrollen |
| **Pan** | `Alt` gedrückt halten + Maus ziehen; oder Mitteltaste + Ziehen |

---

## 5. Selektion & Bewegung

### Einzelnes Element selektieren
- Linksklick auf ein Gatter oder Kabel.

### Mehrere Elemente selektieren (Lasso)
- Linksklick und Ziehen auf freier Canvasfläche → Auswahlrechteck; alle Gatter darin werden selektiert.

### Selektierte Gatter verschieben
- **Maus:** Linksklick + Ziehen.
- **Tastatur:** Pfeiltasten (ein Rasterschritt); `Shift` + Pfeiltasten (5× Schritt).

### Kopieren & Einfügen
- `Strg+C` kopiert alle selektierten Gatter und die Kabel, die ausschließlich zwischen ihnen verlaufen.
- `Strg+V` fügt mit +24 px Versatz ein; die eingefügten Gatter sind direkt selektiert.
- **Rechtsklick auf leeren Canvas** → „Einfügen (Strg+V)" wenn Zwischenablage gefüllt (Einfügen an Mausposition).
- **Gate-Kontextmenü → „Kopieren"** kopiert das rechts geklickte Gatter zusammen mit der bestehenden Selektion.

### Löschen
- `Delete` oder `Backspace` löscht alle selektierten Elemente (Gatter **und** angehängte Kabel).

---

## 6. Gatter anpassen (Kontextmenü)

Rechtsklick auf ein Gatter öffnet das Kontextmenü:

| Option | Verfügbar bei | Beschreibung |
|---|---|---|
| **Kopieren** | Alle Gatter | Gatter (+ Selektion) in Zwischenablage kopieren |
| **Umbenennen** | Alle Gatter | Freitext-Beschriftung vergeben (erscheint im Gate-Header und HDL-Export) |
| **Drehen (90°)** | Alle Gatter | Gatter um 90° drehen (Anschlüsse rotieren mit) |
| **LED-Farbe** | OUTPUT_LED | Leuchtfarbe der Ausgangs-LED wählen |
| **Frequenz** | CLOCK | Taktfrequenz in Hz einstellen (0,1–100 Hz) |
| **Hex-Wert** | ADC8 | Analogen Eingabewert als Hex-Zahl (00–FF) setzen |
| **ROM-Inhalt bearbeiten** | ROM256 | Hex-Editor für den ROM-Speicher öffnen |
| **Hilfe (Op-Codes)** | ALU4 | Zeigt alle 8 Op-Code-Belegungen direkt im Menü |
| **Löschen** | Alle Gatter | Gatter und alle angebundenen Kabel entfernen |

---

## 7. Schalter & Taster bedienen

### Eingabe-Schalter (`INPUT_SWITCH`)
- **Linksklick**: Wechselt zwischen **HIGH (1)** und **LOW (0)**.

### Taster (`PUSH_BTN`)
- **Linksklick**: Setzt Ausgang kurzzeitig auf **HIGH (1)** für ~150 ms, dann automatisch zurück auf **LOW (0)**.

### Konstante Quellen
- **CONST_HIGH** / **CONST_LOW** liefern dauerhaft 1 bzw. 0.

---

## 8. Taktgenerator & Pause/Einzelschritt

### Taktgenerator (`CLOCK`)
- Liefert ein periodisches HIGH/LOW-Signal.
- Frequenz einstellbar per Rechtsklick → **Frequenz** (0,1–100 Hz).

### Takt pausieren
- **Toolbar-Button „Pause"** (⏸): Alle Taktgeneratoren eingefroren; kombinatorische Logik propagiert weiter.

### Einzelschritt
- Im Pause-Modus: **Toolbar-Button „Schritt"** (⏭): Alle Taktgeneratoren toggeln genau einmal.

---

## 9. Wahrheitstabelle & Zustandsübergangstabelle

Öffnen über **Toolbar → „W-Tabelle"**.

### Automatische Moduswahl

| Schaltungstyp | Modus |
|---|---|
| Keine Zyklen (rein kombinatorisch) | **Wahrheitstabelle** |
| Mindestens ein Zyklus (sequenziell) | **Zustandsübergangstabelle** |

### Wahrheitstabelle (kombinatorisch)
- Listet alle **2ⁿ** Eingangskombinationen.
- Zeigt Zwischenwerte aller Gatter-Ausgänge.

**Farblegende:** 🔵 Blau = Eingaben · 🟢 Grün = Ausgaben · Grau = Interne Werte

### Zustandsübergangstabelle (sequenziell)

| Spaltengruppe | Farbe | Inhalt |
|---|---|---|
| Externe Eingaben | 🔵 Blau | Werte der Eingabe-Schalter |
| Aktueller Zustand Q(t) | 🟡 Amber | Ausgänge der Feedback-Gatter |
| Nächster Zustand Q(t+1) | 🟣 Lila | Zustand nach genau einem Simulations-Tick |
| Ausgaben | 🟢 Grün | Werte der angeschlossenen LEDs |

**Stabile Zeilen** (Q(t) = Q(t+1)) werden mit Amber-Hintergrund hervorgehoben.

**Beispiel SR-Latch:**

| S | R | Q(t) | Q̄(t) | Q(t+1) | Q̄(t+1) |
|---|---|------|--------|---------|---------|
| 0 | 0 | 0 | 1 | 0 | 1 | ← stabil |
| 0 | 0 | 1 | 0 | 1 | 0 | ← stabil |
| 0 | 1 | 1 | 0 | 0 | 1 | ← RESET aktiv |
| 1 | 0 | 0 | 1 | 1 | 0 | ← SET aktiv |
| 1 | 1 | – | – | – | – | ← verboten |

---

## 10. Timing-Diagramm

| Aktion | Beschreibung |
|---|---|
| **Panelgröße ändern** | Obere Kante des Panels ziehen |
| **Signal ausblenden** | Auge-Icon (👁) klicken |
| **Verlauf löschen** | Toolbar-Button „Verlauf löschen" |

Maximal **1000 Snapshots** im Speicher (ältere werden verworfen).

### Gate-Delay-Modus

Im Gate-Delay-Modus werden Gatterausgaben erst nach der konfigurierten
Propagationsverzögerung (`propagationDelay`) wirksam — im Gegensatz zum
Zero-Delay-Modus, in dem alle Änderungen sofort propagieren.

**Modus wechseln:** Toolbar-Button **⚡ Zero-Delay** / **⏱ Gate-Delay** klicken.

Das Timingdiagramm im Gate-Delay-Modus nimmt pro Ereignis-Batch einen Snapshot auf.
Eine Kette aus 20 NOT-Gattern erzeugt damit eine 20-stufige Verzögerungstreppe —
jede Stufe entspricht einer Gate-Ebene.

### Race-Condition-Panel

Im Gate-Delay-Modus erkennt der Simulator automatisch Hazards und Race Conditions.
Wenn Races erkannt wurden, erscheint ein **⚠-Button** in der Toolbar.
Klick darauf öffnet das Race-Panel.

**Schweregradklassen:**

| Farbe | Schweregrad | Bedeutung |
|---|---|---|
| Rot | KRITISCH | Wertekonflikt: zwei Treiber liefern verschiedene Werte |
| Orange | GLITCH | Rekonvergenter Glitch (mehrfacher Pegelwechsel) |
| Lila | TIMING | Setup/Hold-Risiko an Flipflop-Eingängen |
| Gelb | WARNUNG | Mehrtreiber mit gleichem Wert |
| Pink | SCHLEIFE | Kombinatorische Schleife (Ereignis-Budget überschritten) |

**TTL-Markierung:** Kabel bleiben 400 ms farblich hervorgehoben,
damit kurzlebige Glitches lesbar bleiben.

**Bekannte Grenzen des Race-Detektors:**
- Tri-State-Busse werden nicht erkannt
- Taktdomänenwechsel (CDC) werden nicht modelliert
- Nur einstufige Latch-Erkennung (keine Kaskadierung)

---

## 11. FSM-Editor

### Zustand erstellen
1. FSM-Editor über die Toolbar öffnen.
2. **Doppelklick** auf freie FSM-Fläche → neuer Zustand.
3. Doppelklick zum Umbenennen / als Startzustand markieren.

### Übergang zeichnen
1. Linksklick auf **Quell-Zustand** → Linksklick auf **Ziel-Zustand**.
2. Übergangslabel eingeben (z. B. `a & !b`).

### Bedingungsoperatoren
`!a` (NOT) · `a & b` (AND) · `a | b` (OR) · `a ^ b` (XOR) · `1` (immer wahr)

### Synthese
- **Toolbar-Button „Synthetisieren"**: FSM-Graph → Logikgatter auf dem Canvas.

---

## 12. Custom IC

> **Einschränkung:** Custom ICs werden bei jedem Simulations-Tick neu evaluiert,
> ohne internen Zustand zu persistieren. Nur **kombinatorische** Teilschaltungen
> (keine Flipflops, Latches oder Rückkopplungsschleifen) werden korrekt simuliert.

### Custom IC erstellen
1. Kombinatorische Teilschaltung mit Eingabe-Schaltern und Ausgangs-LEDs aufbauen.
2. Alle Gatter selektieren (Lasso).
3. Toolbar → **„Custom IC erstellen"** → Name vergeben.

### Custom IC verwenden
- Drag & Drop aus der Palette; nur definierte Ports sichtbar.

---

## 13. ROM-Editor

1. ROM-Gatter aus der Palette ziehen.
2. Rechtsklick → **„ROM-Inhalt bearbeiten"**.
3. Werte direkt als Hex (00–FF) eintippen.

---

## 14. Speichern & Laden

### Auto-Save
Automatisch nach jeder Änderung im `sessionStorage` gespeichert. Wird beim erneuten Laden der Seite in derselben Browser-Sitzung wiederhergestellt — **nicht** nach einem Browser-Neustart. Für dauerhafte Speicherung → JSON-Datei manuell speichern.

### Manuelles Speichern
Toolbar → **„Speichern"** (💾) → `.json`-Datei wird heruntergeladen.

### Laden
Toolbar → **„Laden"** (📂) → `.json`-Datei auswählen.

> **Warnung:** Beim Laden wird die aktuelle Schaltung überschrieben.

---

## 15. Export (Verilog / VHDL / JSON)

Öffnen über **Toolbar → „Export"**.

| Format | Hinweise |
|---|---|
| **JSON** | Vollständiges Round-Trip-Format |
| **Verilog** | Synthesefähig (IEEE 1364); geeignet für Vivado, Quartus |
| **VHDL** | Synthesefähig (IEEE 1076) |

---

## 16. Tastenkürzel

| Taste / Kombination | Aktion |
|---|---|
| `Delete` / `Backspace` | Ausgewählte Gatter und Kabel löschen |
| `↑` `↓` `←` `→` | Ausgewählte Gatter um einen Rasterschritt verschieben |
| `Shift` + Pfeiltasten | Verschieben mit 5× Schritt |
| `Strg+C` | Ausgewählte Gatter kopieren (inkl. interner Kabel) |
| `Strg+V` | Zwischenablage einfügen (+24 px versetzt) |
| `Escape` | Kabelzeichnen abbrechen · Auswahl aufheben · Menüs schließen |
| `R` | Ausgewählte Gatter um 90° drehen |
| `W` | Kabel-Modus ein/aus (Crosshair-Cursor) |
| `X` | Snap-to-Port-Modus ein/aus (gelber Rahmen) |
| `Mausrad` | Canvas zoomen |
| `Alt` + Linksklick-Ziehen | Canvas verschieben (Pan) |
| Mitteltaste + Ziehen | Canvas verschieben (Pan) |
| Linksklick auf Ausgangsport | Kabelzeichnen starten |
| Linksklick auf Eingangsport | Kabel fertigstellen |
| Linksklick auf Canvas (beim Zeichnen) | Wegpunkt einfügen |
| Ziehen auf leerem Canvas | Lasso-Auswahl → Pfeiltasten zum Verschieben |
| Rechtsklick auf Gatter | Kontextmenü (Kopieren, Drehen, Umbenennen, Farbe, Löschen, …) |
| Rechtsklick auf Kabel | Kontextmenü (Farbe, Knotenpunkt, Löschen) |
| Rechtsklick auf leeren Canvas | Einfügen (wenn Zwischenablage gefüllt) |

---

## 17. Häufige Fehler & Lösungen

### Signal ändert sich nicht obwohl Schalter umgelegt
**Ursache:** Kabel nicht korrekt verbunden.
**Lösung:** Kabel anklicken – ist es selektierbar, ist es korrekt verbunden. Andernfalls neu ziehen.

### Rückkopplungsschaltung zeigt keine Schwingung
**Ursache:** Geradzahlige Schleifen werden durch den Even-Period-Fix stabilisiert.
**Lösung:** Timing-Diagramm öffnen – die Schwingung ist dort als alternierende 0/1-Werte sichtbar.

### Zustandsübergangstabelle zeigt Q(t+1) = Q(t) für alle Zeilen
**Ursache:** Keine Feedback-Gatter erkannt.
**Lösung:** Prüfen ob Kabel tatsächlich einen Zyklus bilden (Ausgang → zurück zu einem Eingang auf demselben Pfad).

### Wahrheitstabelle friert den Browser ein
**Ursache:** Mehr als ~12 Eingabe-Schalter (> 4096 Zeilen).
**Lösung:** Timing-Diagramm oder manuelle Tests verwenden.

### FSM-Synthese erzeugt keine sichtbare Schaltung
**Ursache:** Keine validen Übergänge definiert.
**Lösung:** Mindestens zwei Zustände und einen Übergang mit gültigem Ausdruck (z. B. `1`) anlegen.

### Gespeicherte Schaltung lässt sich nicht laden
**Ursache:** JSON-Datei aus inkompatiblem Simulator-Stand.
**Lösung:** Gate-Typ-IDs in der JSON-Datei manuell prüfen und anpassen.

---

## 18. Baustein-Referenz: ALU4

### Anschlüsse

| Port | Richtung | Beschreibung |
|---|---|---|
| **A0–A3** | Eingang | 4-Bit Operand A (A0 = LSB) |
| **B0–B3** | Eingang | 4-Bit Operand B (B0 = LSB) |
| **Op0–Op2** | Eingang | Operation auswählen (Op0 = LSB) |
| **CIN** | Eingang | Carry-Eingang |
| **S0–S3** | Ausgang | 4-Bit Ergebnis (S0 = LSB) |
| **COUT** | Ausgang | Carry-Ausgang / Shift-Ausschuss |
| **ZERO** | Ausgang | 1 wenn Ergebnis = 0000 |

### Op-Code-Tabelle

| Op2 | Op1 | Op0 | Operation | Formel | COUT |
|---|---|---|---|---|---|
| 0 | 0 | 0 | **ADD** | S = A + B + CIN | Übertrag Bit 4 |
| 0 | 0 | 1 | **SUB** | S = A − B − CIN | Borge-Bit |
| 0 | 1 | 0 | **AND** | S = A & B | 0 |
| 0 | 1 | 1 | **OR** | S = A \| B | 0 |
| 1 | 0 | 0 | **XOR** | S = A ^ B | 0 |
| 1 | 0 | 1 | **NOT A** | S = ~A | 0 |
| 1 | 1 | 0 | **SHL** | S = A << 1 | A[3] |
| 1 | 1 | 1 | **SHR** | S = A >> 1 | A[0] |

> **Tipp:** Rechtsklick auf ALU4 → **❓ Hilfe (Op-Codes)** zeigt diese Tabelle direkt im Simulator.

### Kaskadierung
Für 8-Bit-Addition: COUT der niederwertigen ALU mit CIN der höherwertigen ALU verbinden (Ripple-Carry).

---

*Bedienungsanleitung für LogicSim – Browser-basierter Logikgatter-Simulator*

---

---

<a id="english"></a>

# LogicSim – User Manual

> **Version:** current state (March 2026)
> **Language:** English
> Deutsche Version → [zurück zu Deutsch](#deutsch)

---

## Table of Contents

0. [Installation & Getting Started](#0-installation--getting-started)
1. [Interface Overview](#1-interface-overview)
2. [Placing Gates](#2-placing-gates)
3. [Drawing Wires](#3-drawing-wires)
4. [Canvas Navigation (Zoom & Pan)](#4-canvas-navigation-zoom--pan)
5. [Selection & Movement](#5-selection--movement)
6. [Gate Customisation (Context Menu)](#6-gate-customisation-context-menu)
7. [Switches & Push Buttons](#7-switches--push-buttons)
8. [Clock Generator & Pause / Single-Step](#8-clock-generator--pause--single-step)
9. [Truth Table & State Transition Table](#9-truth-table--state-transition-table)
10. [Timing Diagram](#10-timing-diagram)
11. [FSM Editor](#11-fsm-editor)
12. [Custom IC](#12-custom-ic)
13. [ROM Editor](#13-rom-editor)
14. [Save & Load](#14-save--load)
15. [Export (Verilog / VHDL / JSON)](#15-export-verilog--vhdl--json)
16. [Keyboard Shortcuts](#16-keyboard-shortcuts)
17. [Common Errors & Solutions](#17-common-errors--solutions)
18. [Component Reference: ALU4](#18-component-reference-alu4)

---

## 0. Installation & Getting Started

### Prerequisites

| Software | Minimum version | Download |
|---|---|---|
| **Node.js** | 18 | [nodejs.org](https://nodejs.org) |
| **npm** | 9 | (bundled with Node.js) |

Check versions:
```bash
node --version   # e.g. v20.11.0
npm --version    # e.g. 10.2.4
```

### First-time installation

```bash
# 1. Clone the repository
git clone https://github.com/p-keminer/logic-simulator-studio.git

# 2. Enter the project folder
cd logic-simulator-studio

# 3. Install dependencies (once)
npm install
```

### Start the development server

```bash
npm run dev
```

Then open **[http://localhost:5173](http://localhost:5173)** in your browser.
The simulator loads immediately – no backend, no login required.

> **Tip:** The development server supports **Hot Module Replacement** – source code changes appear instantly without a manual reload.

### Production build (optional)

```bash
npm run build       # Creates the build in ./dist/
npm run preview     # Local preview of the finished build
```

The `dist/` output can be hosted on any static web server (GitHub Pages, Netlify, Vercel, Apache, Nginx, …) – no Node.js required on the server.

### Stopping the simulator

Close the browser tab or press `Ctrl + C` in the terminal.

> **Auto-Save:** The current circuit is automatically saved to `sessionStorage` and restored when the page is reloaded within the same browser session. For persistent storage, use **manual save** as JSON.

---

## 1. Interface Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Toolbar  (Save, Load, Export, Analysis, Clock-Pause, …)        │
├──────────────┬──────────────────────────────────────────────────┤
│              │                                                   │
│  Gate        │                                                   │
│  Palette     │           Circuit Canvas                         │
│  (left)      │           (centre / right)                       │
│              │                                                   │
│  Search bar  │                                                   │
│  Categories: │                                                   │
│  • Basic     │                                                   │
│  • Combi.    │                                                   │
│  • Sequential├──────────────────────────────────────────────────┤
│  • I/O       │  Timing Diagram Panel  (bottom, resizable)       │
│  • ICs       │                                                   │
└──────────────┴──────────────────────────────────────────────────┘
```

| Area | Function |
|---|---|
| **Toolbar** | Save, load, export, open analysis tools, control clock |
| **Gate Palette** | All available gates; drag & drop onto the canvas; search field to filter |
| **Circuit Canvas** | Infinite drawing area for gates, wires and annotations |
| **Timing Diagram** | Signal waveforms of all connected wires over time |

---

## 2. Placing Gates

### Method: Drag & Drop
1. Hold the left mouse button on a gate in the **Gate Palette**.
2. Drag it onto the canvas.
3. Release – the gate snaps to the nearest grid point.

### Searching the palette
Type in the **search box** at the top of the palette to filter gates by name, type ID or description. Press × to clear the filter.

### Gate categories

| Category | Contains |
|---|---|
| **Basic** | AND, OR, NOT, NAND, NOR, XOR, XNOR, Buffer, Schmitt Trigger, Tri-State |
| **Combinational** | MUX, DEMUX, Comparator, ALU, Bus Splitter / Combiner |
| **Sequential** | D/T/SR/JK flip-flops, Master-Slave FF, shift register, counter, RAM, ROM |
| **I/O** | Switch, Push button, Clock, Constant HIGH/LOW, LED, 7-segment, ADC, Stepper |
| **ICs** | 74xx series, Custom IC |

### Number of inputs
Some gates (AND, OR, NAND, NOR, XOR, XNOR) are available in variants with 2–8 inputs.

---

## 3. Drawing Wires

### Making a connection
1. **Left-click on an output port** (small circle on the right edge) – drawing begins.
2. Optional: **left-click on empty canvas** – inserts a waypoint (bend).
3. **Left-click on an input port** (small circle on the left edge) – connection saved.

> **Note:** An input port can receive only **one** connection. Outputs support fan-out.

### Cancelling a wire
- Press `Escape` while a wire is in progress.

### Feedback loops
Cycles are explicitly **allowed** – the simulation engine handles them correctly.

### Deleting a wire
- Right-click → **Delete**, or select and press `Delete`.

### Colouring wires
- Right-click → **Set colour**.

---

## 4. Canvas Navigation (Zoom & Pan)

| Action | Input |
|---|---|
| **Zoom** | Scroll mouse wheel |
| **Pan** | Hold `Alt` + drag; or middle-button drag |

---

## 5. Selection & Movement

### Select a single element
- Left-click on a gate or wire.

### Lasso selection
- Left-click and drag on empty canvas → selection rectangle; all gates inside are selected.

### Move selected gates
- **Mouse:** left-click + drag any selected gate.
- **Keyboard:** Arrow keys (one grid step); `Shift` + arrow keys (5× step).

### Copy & Paste
- `Ctrl+C` copies all selected gates and any wires that connect exclusively between them.
- `Ctrl+V` pastes with a +24 px offset; pasted gates become the new selection.
- **Right-click on empty canvas** → "Paste (Ctrl+V)" when clipboard is non-empty, pasting at the cursor position.
- **Gate context menu → "Copy"** copies the right-clicked gate together with any other currently selected gates.

### Delete
- `Delete` or `Backspace` removes all selected elements (gates **and** attached wires).

---

## 6. Gate Customisation (Context Menu)

Right-click on a gate to open the context menu:

| Option | Available for | Description |
|---|---|---|
| **Copy** | All gates | Copy this gate (+ selection) to clipboard |
| **Rename** | All gates | Assign a free-text label (shown in gate header and HDL export) |
| **Rotate (90°)** | All gates | Rotate gate by 90° (ports rotate with it) |
| **LED colour** | OUTPUT_LED | Choose the LED's glow colour |
| **Frequency** | CLOCK | Set clock frequency in Hz (0.1–100 Hz) |
| **Hex value** | ADC8 | Set analogue input value as hex (00–FF) |
| **Edit ROM content** | ROM256 | Open the ROM hex editor |
| **Help (Op-Codes)** | ALU4 | Shows all 8 op-code assignments in the menu |
| **Delete** | All gates | Remove gate and all attached wires |

---

## 7. Switches & Push Buttons

### Input Switch (`INPUT_SWITCH`)
- **Left-click**: toggles between **HIGH (1)** and **LOW (0)**.

### Push Button (`PUSH_BTN`)
- **Left-click**: sets output to **HIGH (1)** for ~150 ms, then returns to **LOW (0)**.

### Constant sources
- **CONST_HIGH** / **CONST_LOW** permanently output 1 / 0.

---

## 8. Clock Generator & Pause / Single-Step

### Clock generator (`CLOCK`)
- Produces a periodic HIGH/LOW signal.
- Frequency configurable via right-click → **Frequency** (0.1–100 Hz).

### Pausing the clock
- **Toolbar "Pause"** (⏸): all clocks frozen; combinational logic continues to propagate.

### Single-step
- In pause mode: **Toolbar "Step"** (⏭): all clocks toggle exactly once.

---

## 9. Truth Table & State Transition Table

Open via **Toolbar → "W-Table"**.

### Automatic mode selection

| Circuit type | Mode shown |
|---|---|
| No cycles (purely combinational) | **Truth Table** |
| At least one cycle (sequential) | **State Transition Table** |

### Truth Table (combinational)
- Lists all **2ⁿ** input combinations (n = number of input switches).
- Shows intermediate values of all gate outputs.

**Colour legend:** 🔵 Blue = inputs · 🟢 Green = outputs · Grey = internal values

### State Transition Table (sequential)

| Column group | Colour | Contents |
|---|---|---|
| External inputs | 🔵 Blue | Current values of input switches |
| Current state Q(t) | 🟡 Amber | Outputs of feedback gates |
| Next state Q(t+1) | 🟣 Purple | State after exactly one simulation tick |
| Outputs | 🟢 Green | Values of connected LEDs |

**Stable rows** (Q(t) = Q(t+1)) are highlighted with an amber background.

**Example SR Latch:**

| S | R | Q(t) | Q̄(t) | Q(t+1) | Q̄(t+1) |
|---|---|------|--------|---------|---------|
| 0 | 0 | 0 | 1 | 0 | 1 | ← stable |
| 0 | 0 | 1 | 0 | 1 | 0 | ← stable |
| 0 | 1 | 1 | 0 | 0 | 1 | ← RESET active |
| 1 | 0 | 0 | 1 | 1 | 0 | ← SET active |
| 1 | 1 | – | – | – | – | ← forbidden |

---

## 10. Timing Diagram

| Action | Description |
|---|---|
| **Resize panel** | Drag the top edge of the panel |
| **Hide signal** | Click the eye icon (👁) in the signal row |
| **Clear history** | Toolbar button "Clear history" |

Maximum **1000 snapshots** kept in memory (older ones are discarded).

### Gate-Delay Mode

In Gate-Delay mode, gate outputs are committed only after the configured propagation delay
(`propagationDelay`) — unlike Zero-Delay mode where all changes propagate instantly.

**Switching modes:** Click the **⚡ Zero-Delay** / **⏱ Gate-Delay** toolbar button.

The timing diagram in Gate-Delay mode records one snapshot per event batch.
A chain of 20 NOT gates produces a 20-step delay staircase —
each step corresponds to one gate level.

### Race Condition Panel

In Gate-Delay mode the simulator automatically detects hazards and race conditions.
When races are detected, a **⚠ button** appears in the toolbar.
Clicking it opens the Race Panel.

**Severity classes:**

| Colour | Severity | Meaning |
|---|---|---|
| Red | CRITICAL | Value conflict: two drivers supply different values |
| Orange | GLITCH | Reconvergent glitch (multiple level changes) |
| Purple | TIMING | Setup/hold risk at flip-flop inputs |
| Yellow | WARNING | Multiple drivers with the same value |
| Pink | LOOP | Combinational loop (event budget exceeded) |

**TTL marking:** wires remain colour-highlighted for 400 ms
so short-lived glitches remain readable.

**Known limitations of the race detector:**
- Tri-state buses are not detected
- Clock domain crossings (CDC) are not modelled
- Only single-level latch detection (no cascading)

---

## 11. FSM Editor

### Creating a state
1. Open the FSM editor via the toolbar.
2. **Double-click** on empty FSM area → new state created.
3. Double-click the state to rename it / mark as initial / final state.

### Drawing a transition
1. Left-click the **source state** → left-click the **target state**.
2. Enter a transition label (e.g. `a & !b`).

### Condition operators
`!a` (NOT) · `a & b` (AND) · `a | b` (OR) · `a ^ b` (XOR) · `1` (always true)

### Synthesis
- **Toolbar "Synthesise"**: FSM graph → combinational + sequential logic gates placed on the canvas.

---

## 12. Custom IC

> **Limitation:** Custom ICs are re-evaluated from scratch on every simulation tick
> without persisting internal state. Only **combinational** sub-circuits
> (no flip-flops, latches, or feedback loops) are simulated correctly.

### Creating a Custom IC
1. Build a combinational sub-circuit with input switches and output LEDs as I/O pins.
2. Select all gates (lasso).
3. Toolbar → **"Create Custom IC"** → assign a name.
4. The new gate appears in the palette under **"ICs"**.

### Using a Custom IC
- Drag & drop from palette; only defined ports are visible from outside.

---

## 13. ROM Editor

1. Drag the ROM gate from the palette.
2. Right-click → **"Edit ROM content"**.
3. Type values directly as hex (00–FF).

---

## 14. Save & Load

### Auto-save
Automatically saved to `sessionStorage` after every change. Restored when the page is reloaded in the same browser session — **not** after a browser restart. For persistent storage, manually save as JSON.

### Manual save
Toolbar → **"Save"** (💾) → downloads a `.json` file.

### Load
Toolbar → **"Load"** (📂) → select a `.json` file. The current circuit is replaced.

> **Warning:** Loading overwrites the current unsaved circuit.

---

## 15. Export (Verilog / VHDL / JSON)

Open via **Toolbar → "Export"**.

| Format | Notes |
|---|---|
| **JSON** | Full round-trip format for sharing and backup |
| **Verilog** | Synthesisable (IEEE 1364); suitable for Vivado, Quartus |
| **VHDL** | Synthesisable (IEEE 1076) |

---

## 16. Keyboard Shortcuts

| Key / Combination | Action |
|---|---|
| `Delete` / `Backspace` | Delete selected gates and wires |
| `↑` `↓` `←` `→` | Move selected gates by one grid step |
| `Shift` + arrow keys | Move selected gates by 5× grid step |
| `Ctrl+C` | Copy selected gates (and internal wires) |
| `Ctrl+V` | Paste clipboard (+24 px offset) |
| `Escape` | Cancel wire drawing · clear selection · close menus |
| `R` | Rotate selected gate(s) by 90° |
| `W` | Toggle wire-draw mode (crosshair cursor) |
| `X` | Toggle snap-to-port mode (yellow outline) |
| Mouse wheel | Zoom canvas in / out |
| `Alt` + left-click drag | Pan viewport |
| Middle-button drag | Pan viewport |
| Left-click output port | Start wire |
| Left-click input port | Finish wire |
| Left-click canvas (while drawing) | Insert waypoint |
| Drag on empty canvas | Lasso selection → use arrow keys to move |
| Right-click gate | Context menu (copy, rotate, rename, colour, delete, …) |
| Right-click wire | Context menu (colour, junction, delete) |
| Right-click empty canvas | Paste at cursor (if clipboard non-empty) |

---

## 17. Common Errors & Solutions

### Signal does not change even though the switch was toggled
**Cause:** Wire not connected correctly (port not hit exactly).
**Solution:** Click the wire – if it can be selected, it is correctly connected. Otherwise redraw.

### Feedback circuit shows no oscillation
**Cause:** Even-length loops (e.g. NOT-NOT ring) are stabilised by the even-period fix.
**Solution:** Open the timing diagram – the oscillation is visible there as alternating 0/1 values.

### State transition table shows Q(t+1) = Q(t) for all rows
**Cause:** No feedback gates detected; circuit treated as combinational.
**Solution:** Verify that wires actually form a cycle (output port → input port on the same logic path).

### Truth table freezes the browser
**Cause:** More than ~12 input switches (> 4096 rows).
**Solution:** Use the timing diagram or manual switch tests for larger circuits.

### FSM synthesis produces no visible circuit
**Cause:** No valid transitions defined.
**Solution:** Create at least two states and one transition with a valid expression (e.g. `1`).

### Saved circuit cannot be loaded
**Cause:** JSON file from an incompatible simulator version.
**Solution:** Rebuild manually or inspect the gate type IDs in the JSON file.

---

## 18. Component Reference: ALU4

### Ports

| Port | Direction | Description |
|---|---|---|
| **A0–A3** | Input | 4-bit operand A (A0 = LSB) |
| **B0–B3** | Input | 4-bit operand B (B0 = LSB) |
| **Op0–Op2** | Input | Select operation (Op0 = LSB) |
| **CIN** | Input | Carry input (for ADD/SUB cascading) |
| **S0–S3** | Output | 4-bit result (S0 = LSB) |
| **COUT** | Output | Carry output / shifted-out bit |
| **ZERO** | Output | 1 when result = 0000 |

### Op-code table

| Op2 | Op1 | Op0 | Operation | Formula | COUT |
|---|---|---|---|---|---|
| 0 | 0 | 0 | **ADD** | S = A + B + CIN | Carry bit 4 |
| 0 | 0 | 1 | **SUB** | S = A − B − CIN | Borrow bit |
| 0 | 1 | 0 | **AND** | S = A & B | 0 |
| 0 | 1 | 1 | **OR** | S = A \| B | 0 |
| 1 | 0 | 0 | **XOR** | S = A ^ B | 0 |
| 1 | 0 | 1 | **NOT A** | S = ~A | 0 |
| 1 | 1 | 0 | **SHL** | S = A << 1 (left shift) | A[3] (shifted-out MSB) |
| 1 | 1 | 1 | **SHR** | S = A >> 1 (right shift) | A[0] (shifted-out LSB) |

> **Tip:** Right-click any ALU4 instance → **❓ Help (Op-Codes)** shows this table directly in the simulator.

### Examples

**Addition 5 + 3:**  A = 0101, B = 0011, Op = 000, CIN = 0 → S = 1000 (= 8), COUT = 0

**Left-shift of 6 (= 0110):**  A = 0110, Op = 110 → S = 1100 (= 12), COUT = 0

**Left-shift of 9 (= 1001):**  A = 1001, Op = 110 → S = 0010 (= 2), COUT = 1

### Cascading multiple ALUs
For an 8-bit addition: connect COUT of the lower-order ALU to CIN of the higher-order ALU (ripple-carry).

---

*User Manual for LogicSim – Browser-based Logic Gate Simulator*
