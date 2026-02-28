interface Props { onClose: () => void; }

const SHORTCUTS: Array<{ key: string; action: string }> = [
  { key: 'Klick auf Port',        action: 'Kabel starten / beenden' },
  { key: 'W',                     action: 'Kabel-Modus (Crosshair-Cursor)' },
  { key: 'Klick auf Canvas',      action: 'Wegpunkt setzen (während Kabel)' },
  { key: 'Rechtsklick Wegpunkt',  action: 'Wegpunkt entfernen' },
  { key: 'Drag Wegpunkt',         action: 'Wegpunkt verschieben' },
  { key: 'Strg+Klick Kabel',      action: 'Kabel löschen' },
  { key: 'Rechtsklick Kabel',     action: 'Kabelfarbe / Kabel löschen' },
  { key: 'Doppelklick Gate',      action: 'Umbenennen / Schalter umschalten' },
  { key: 'Rechtsklick Gate',      action: 'Kontextmenü (Kopieren, Drehen, Löschen, …)' },
  { key: 'Rechtsklick Canvas',    action: 'Einfügen (wenn Zwischenablage gefüllt)' },
  { key: 'R',                     action: 'Ausgewählte Gatter drehen' },
  { key: 'Strg+C',                action: 'Ausgewählte Gatter kopieren' },
  { key: 'Strg+V',                action: 'Gatter aus Zwischenablage einfügen (+24 px versetzt)' },
  { key: '↑ ↓ ← →',               action: 'Ausgewählte Gatter bewegen (Shift: 5× Schritt)' },
  { key: 'X',                     action: 'Kabel-Einrasten ein/aus (Snap-to-Port, gelber Rahmen)' },
  { key: 'Entf / Backspace',      action: 'Auswahl löschen' },
  { key: 'Escape',                action: 'Aktion abbrechen / Auswahl aufheben' },
  { key: 'Shift+Klick',           action: 'Mehrfach-Selektion' },
  { key: 'Rechteck ziehen',       action: 'Lasso-Auswahl → Pfeiltasten zum Verschieben' },
  { key: 'Alt+Ziehen',            action: 'Canvas verschieben (Pan)' },
  { key: 'Mausrad',               action: 'Zoom in / out' },
  { key: 'Mitteltaste+Drag',      action: 'Canvas verschieben (Pan)' },
  { key: 'Ziehen aus Palette',    action: 'Neues Bauteil platzieren' },
  { key: 'Suche in Palette',      action: 'Bauteile nach Name / Typ / Beschreibung filtern' },
];

export function HelpModal({ onClose }: Props) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000,
      }}
      onMouseDown={onClose}
    >
      <div
        style={{
          background: '#0f172a', border: '1px solid #334155', borderRadius: 10,
          padding: '24px 28px', minWidth: 480, maxWidth: 560, maxHeight: '85vh',
          overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ color: '#f1f5f9', fontFamily: 'monospace', fontSize: 15, fontWeight: 700, margin: 0 }}>
            ⌨ Tastenkürzel &amp; Bedienung
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer', padding: '2px 6px', borderRadius: 4 }}
          >
            ✕
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', color: '#64748b', fontWeight: 600, paddingBottom: 8, borderBottom: '1px solid #1e293b', width: '40%' }}>
                Taste / Aktion
              </th>
              <th style={{ textAlign: 'left', color: '#64748b', fontWeight: 600, paddingBottom: 8, borderBottom: '1px solid #1e293b' }}>
                Funktion
              </th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUTS.map((s, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #1e293b22' }}>
                <td style={{ padding: '7px 8px 7px 0' }}>
                  <code style={{ background: '#1e293b', color: '#7dd3fc', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>
                    {s.key}
                  </code>
                </td>
                <td style={{ padding: '7px 0', color: '#94a3b8' }}>{s.action}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p style={{ color: '#475569', fontSize: 11, fontFamily: 'monospace', marginTop: 16, marginBottom: 0 }}>
          Tipp: Rechtsklick auf Bausteine und Kabel öffnet ein Kontextmenü mit weiteren Optionen.
        </p>
      </div>
    </div>
  );
}
