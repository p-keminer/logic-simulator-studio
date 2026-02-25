
import type { GateShapeProps } from '../../core/types';
import { GATE_BODY_FILL, GATE_STROKE, GATE_SELECTED_STROKE } from '../../utils/constants';
import { PortDots } from './GateBase';

const W = 80;
const H = 60;

// OR gate: curved body with convex input side
// IEEE style: curved back, pointed output
const BODY = `M 10,0 Q ${W * 0.4},0 ${W},${H / 2} Q ${W * 0.4},${H} 10,${H} Q ${W * 0.3},${H / 2} 10,0 Z`;

export function OrShape({ gate, definition, isSelected, inputSignals, onPointerDown, onPortClick }: GateShapeProps) {
  return (
    <g onPointerDown={(e) => onPointerDown(e, gate.id)} style={{ cursor: 'grab' }}>
      <path
        d={BODY}
        fill={GATE_BODY_FILL}
        stroke={isSelected ? GATE_SELECTED_STROKE : GATE_STROKE}
        strokeWidth={isSelected ? 2 : 1.5}
      />
      {/* Input lines (connect to curved side) */}
      <line x1={-12} y1={H * 0.33} x2={14} y2={H * 0.33} stroke={GATE_STROKE} strokeWidth={1.5} />
      <line x1={-12} y1={H * 0.67} x2={14} y2={H * 0.67} stroke={GATE_STROKE} strokeWidth={1.5} />
      {/* Output line */}
      <line x1={W} y1={H * 0.5} x2={W + 12} y2={H * 0.5} stroke={GATE_STROKE} strokeWidth={1.5} />
      <text x={W * 0.45} y={H / 2 + 5} textAnchor="middle" fontSize={12} fontWeight="bold" fill="#94a3b8" pointerEvents="none" fontFamily="monospace">≥1</text>
      <PortDots gate={gate} definition={definition} inputSignals={inputSignals} onPortClick={onPortClick} />
    </g>
  );
}
