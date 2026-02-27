import { useRef, useState } from 'react';
import type { GateShapeProps } from '../../core/types';
import { GATE_STROKE, GATE_SELECTED_STROKE } from '../../utils/constants';
import { PortDots } from './GateBase';
import { useCircuitContext } from '../../store/CircuitContext';
import { screenToSVG } from '../../hooks/useViewport';

const W = 140;
const H = 120;
const TRACK_X = 14;
const TRACK_W = W - 28;
const TRACK_Y  = Math.round(H * 0.62);
const TRACK_H  = 6;

export function ADCShape({ gate, definition, isSelected, inputSignals, onPointerDown, onPortClick }: GateShapeProps) {
  const stroke = isSelected ? GATE_SELECTED_STROKE : GATE_STROKE;
  const { dispatch } = useCircuitContext();
  const dragging = useRef(false);
  const [editing, setEditing] = useState(false);
  const [inputText, setInputText] = useState('');

  const value = Math.max(0, Math.min(255, (gate.customState?.value as number) ?? 128));
  const thumbX = TRACK_X + (value / 255) * TRACK_W;

  const updateValue = (e: React.PointerEvent<SVGElement>) => {
    const svg = (e.currentTarget as SVGElement).ownerSVGElement;
    if (!svg) return;
    const { x: svgX } = screenToSVG(svg, e.clientX, e.clientY);
    const localX = svgX - gate.x;
    const raw = Math.round(((localX - TRACK_X) / TRACK_W) * 255);
    const clamped = Math.max(0, Math.min(255, raw));
    dispatch({ type: 'GATE_SET_ADC_VALUE', payload: { gateId: gate.id, value: clamped } });
  };

  const handlePointerDown = (e: React.PointerEvent<SVGElement>) => {
    e.stopPropagation();
    (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
    dragging.current = true;
    updateValue(e);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGElement>) => {
    if (!dragging.current) return;
    updateValue(e);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGElement>) => {
    dragging.current = false;
    (e.currentTarget as SVGElement).releasePointerCapture(e.pointerId);
  };

  const startEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    const hex = value.toString(16).toUpperCase().padStart(2, '0');
    setInputText(hex);
    setEditing(true);
  };

  const commitEdit = () => {
    const parsed = parseInt(inputText, 16);
    if (!isNaN(parsed)) {
      const clamped = Math.max(0, Math.min(255, parsed));
      dispatch({ type: 'GATE_SET_ADC_VALUE', payload: { gateId: gate.id, value: clamped } });
    }
    setEditing(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { commitEdit(); }
    else if (e.key === 'Escape') { setEditing(false); }
    e.stopPropagation();
  };

  const hex = value.toString(16).toUpperCase().padStart(2, '0');

  return (
    <g onPointerDown={(e) => onPointerDown(e, gate.id)} style={{ cursor: 'grab' }}>
      <rect x={0} y={0} width={W} height={H} rx={6} fill="#0a1628" stroke={stroke} strokeWidth={isSelected ? 2 : 1.5} />

      {/* Title */}
      <text x={W / 2} y={16} textAnchor="middle" fontSize={9} fill="#64748b" fontFamily="monospace" fontWeight={600} pointerEvents="none">
        ADC
      </text>

      {/* Value display – Doppelklick zum Bearbeiten */}
      <rect
        x={W / 2 - 22} y={22} width={44} height={22} rx={4} fill="#060d1a"
        style={{ cursor: 'text' }}
        onDoubleClick={startEditing}
      />
      {editing ? (
        <foreignObject x={W / 2 - 21} y={23} width={42} height={20}>
          <input
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            xmlns={"http://www.w3.org/1999/xhtml" as any}
            autoFocus
            value={inputText}
            maxLength={2}
            onChange={(e) => setInputText(e.target.value.toUpperCase().replace(/[^0-9A-F]/g, ''))}
            onKeyDown={handleInputKeyDown}
            onBlur={commitEdit}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              height: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#22c55e',
              fontFamily: 'monospace',
              fontSize: 12,
              fontWeight: 700,
              textAlign: 'center',
              padding: 0,
            }}
          />
        </foreignObject>
      ) : (
        <>
          <text
            x={W / 2} y={37} textAnchor="middle" fontSize={12} fill="#22c55e"
            fontFamily="monospace" fontWeight={700} pointerEvents="none"
          >
            0x{hex}
          </text>
          {/* Hint-Text */}
          <text x={W / 2} y={50} textAnchor="middle" fontSize={7} fill="#1e4d2b" fontFamily="monospace" pointerEvents="none">
            Doppelklick zum Eingeben
          </text>
        </>
      )}
      <text x={W / 2} y={62} textAnchor="middle" fontSize={8} fill="#475569" fontFamily="monospace" pointerEvents="none">
        {value} / 255
      </text>

      {/* Slider track (interactive) */}
      <rect
        x={TRACK_X} y={TRACK_Y} width={TRACK_W} height={TRACK_H}
        rx={3} fill="#1e293b" stroke="#334155" strokeWidth={1}
        style={{ cursor: 'ew-resize' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      {/* Filled portion */}
      <rect
        x={TRACK_X} y={TRACK_Y} width={Math.max(0, thumbX - TRACK_X)} height={TRACK_H}
        rx={3} fill="#22c55e" style={{ pointerEvents: 'none' }}
      />
      {/* Thumb */}
      <circle
        cx={thumbX} cy={TRACK_Y + TRACK_H / 2} r={7}
        fill="#22c55e" stroke="#0a1628" strokeWidth={2}
        style={{ cursor: 'ew-resize', filter: 'drop-shadow(0 0 3px #22c55e)' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />

      {/* Track min/max labels */}
      <text x={TRACK_X}              y={TRACK_Y + TRACK_H + 12} fontSize={7} fill="#334155" fontFamily="monospace" pointerEvents="none">0</text>
      <text x={TRACK_X + TRACK_W}    y={TRACK_Y + TRACK_H + 12} textAnchor="end" fontSize={7} fill="#334155" fontFamily="monospace" pointerEvents="none">FF</text>

      <PortDots gate={gate} definition={definition} inputSignals={inputSignals} onPortClick={onPortClick} />
    </g>
  );
}
