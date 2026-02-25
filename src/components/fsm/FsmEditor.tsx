import { useState } from 'react';
import { FsmProvider } from '../../fsm/FsmContext';
import { FsmCanvas } from './FsmCanvas';
import type { CanvasMode } from './FsmCanvas';
import { FsmSidePanel } from './FsmSidePanel';
import { FsmToolbar } from './FsmToolbar';

interface Props { onBack: () => void; }

function FsmEditorInner({ onBack }: Props) {
  const [mode, setMode] = useState<CanvasMode>('select');
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <FsmToolbar mode={mode} onModeChange={setMode} onBack={onBack} />
      <div style={{ display:'flex', flex:1, minHeight:0 }}>
        <div style={{ flex:1, minWidth:0, position:'relative' }}>
          <FsmCanvas mode={mode} onModeChange={setMode} />
        </div>
        <FsmSidePanel />
      </div>
    </div>
  );
}

export function FsmEditor({ onBack }: Props) {
  return (
    <FsmProvider>
      <FsmEditorInner onBack={onBack} />
    </FsmProvider>
  );
}
