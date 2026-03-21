import { FsmConfig } from './FsmConfig';
import { FsmStateTable } from './FsmStateTable';

interface Props {
  isCompact?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

function renderPanelContent() {
  return (
    <>
      <FsmConfig />
      <FsmStateTable />
    </>
  );
}

export function FsmSidePanel({ isCompact = false, isOpen = true, onClose }: Props) {
  if (isCompact) {
    if (!isOpen) return null;

    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 30,
          display: 'flex',
          justifyContent: 'flex-end',
          background: 'rgba(2, 6, 23, 0.55)',
        }}
        onMouseDown={() => onClose?.()}
      >
        <div
          style={{
            width: 'min(320px, calc(100vw - 24px))',
            maxWidth: '100%',
            height: '100%',
            background: '#0f172a',
            borderLeft: '1px solid #1e293b',
            boxShadow: '-12px 0 32px rgba(2, 6, 23, 0.45)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
          }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              padding: '10px 12px',
              borderBottom: '1px solid #1e293b',
              background: '#0c1526',
            }}
          >
            <span style={{ color: '#60a5fa', fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>
              FSM-Panel
            </span>
            <button
              type="button"
              onClick={() => onClose?.()}
              style={{
                padding: '3px 8px',
                fontSize: 11,
                fontFamily: 'monospace',
                borderRadius: 4,
                cursor: 'pointer',
                background: '#1e293b',
                color: '#94a3b8',
                border: '1px solid #334155',
              }}
            >
              Schließen
            </button>
          </div>
          {renderPanelContent()}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: 'min(320px, 34vw)', minWidth: 280, maxWidth: 360, flexShrink: 0,
      background: '#0f172a', borderLeft: '1px solid #1e293b',
      display: 'flex', flexDirection: 'column', overflowY: 'auto',
    }}>
      {renderPanelContent()}
    </div>
  );
}
