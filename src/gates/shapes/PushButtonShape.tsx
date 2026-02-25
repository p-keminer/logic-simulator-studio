import type { GateShapeProps } from '../../core/types';
import { GATE_SELECTED_STROKE, SIGNAL_HIGH_COLOR } from '../../utils/constants';
import { PortDots } from './GateBase';

export function PushButtonShape({ gate, definition, isSelected, inputSignals, onPointerDown, onPortClick }: GateShapeProps) {
  const W = definition.width;
  const H = definition.height;
  const cx = W / 2;
  const cy = H / 2;
  const r  = Math.min(W, H) / 2 - 5;

  const isHigh    = (gate.customState?.value as 0 | 1 | undefined) === 1;
  const outerRing = isSelected ? GATE_SELECTED_STROKE : (isHigh ? SIGNAL_HIGH_COLOR : '#475569');
  const btnFill   = isHigh ? '#166534' : '#1e293b';

  return (
    <g onPointerDown={(e) => onPointerDown(e, gate.id)} style={{ cursor: 'grab' }}>
      {/* Outer ring */}
      <circle cx={cx} cy={cy} r={r + 3} fill="#0f172a" stroke={outerRing} strokeWidth={isSelected ? 2 : 1.5} />
      {/* Button face */}
      <circle
        cx={cx} cy={cy} r={r}
        fill={btnFill}
        style={{
          filter: isHigh ? `drop-shadow(0 0 6px ${SIGNAL_HIGH_COLOR})` : 'none',
          transition: 'fill 150ms ease',
        }}
      />
      {/* Label */}
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize={10} fontWeight="bold"
        fill={isHigh ? SIGNAL_HIGH_COLOR : '#64748b'}
        pointerEvents="none" fontFamily="monospace">
        PUSH
      </text>
      {/* Output stub */}
      <line x1={W * 0.95} y1={H * 0.5} x2={W + 12} y2={H * 0.5} stroke="#64748b" strokeWidth={1.5} />
      <PortDots gate={gate} definition={definition} inputSignals={inputSignals} onPortClick={onPortClick} />
    </g>
  );
}
