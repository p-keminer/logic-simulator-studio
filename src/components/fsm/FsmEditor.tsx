import { useEffect, useRef, useState } from 'react';
import { FsmProvider } from '../../fsm/FsmContext';
import { FsmCanvas } from './FsmCanvas';
import type { CanvasMode } from './FsmCanvas';
import { FsmSidePanel } from './FsmSidePanel';
import { FsmToolbar } from './FsmToolbar';

interface Props { onBack: () => void; }

function FsmEditorInner({ onBack }: Props) {
  const [mode, setMode] = useState<CanvasMode>('select');
  const editorBodyRef = useRef<HTMLDivElement | null>(null);
  const [isCompactLayout, setIsCompactLayout] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1180 : false,
  );
  const [isInspectorOpen, setIsInspectorOpen] = useState(() =>
    typeof window === 'undefined' ? true : window.innerWidth >= 1180,
  );

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return undefined;
    const target = editorBodyRef.current;
    if (!target) return undefined;

    const updateLayout = () => {
      const width = target.getBoundingClientRect().width || window.innerWidth;
      const nextCompactLayout = width < 1180;
      setIsCompactLayout(nextCompactLayout);
      setIsInspectorOpen(!nextCompactLayout);
    };

    updateLayout();
    const observer = new ResizeObserver(() => updateLayout());
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <FsmToolbar
        mode={mode}
        onModeChange={setMode}
        onBack={onBack}
        isCompactLayout={isCompactLayout}
        isInspectorOpen={isInspectorOpen}
        onToggleInspector={() => setIsInspectorOpen((prev) => !prev)}
      />
      <div ref={editorBodyRef} style={{ display:'flex', flex:1, minHeight:0, position:'relative' }}>
        <div style={{ flex:1, minWidth:0, position:'relative' }}>
          <FsmCanvas mode={mode} onModeChange={setMode} />
        </div>
        <FsmSidePanel
          isCompact={isCompactLayout}
          isOpen={isInspectorOpen}
          onClose={() => setIsInspectorOpen(false)}
        />
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
