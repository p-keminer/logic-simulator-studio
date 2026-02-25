
import type { GateShapeProps } from '../../core/types';
import { GATE_BODY_FILL, GATE_STROKE, GATE_SELECTED_STROKE } from '../../utils/constants';
import { PortDots } from './GateBase';

const W = 70;
const H = 50;

// Triangle pointing right with bubble at output
const BODY = `M 0,0 L ${W * 0.75},${H / 2} L 0,${H} Z`;

export function NotShape({ gate, definition, isSelected, inputSignals, onPointerDown, onPortClick }: GateShapeProps) {
  return (
    <g onPointerDown={(e) => onPointerDown(e, gate.id)} style={{ cursor: 'grab' }}>
      <path
        d={BODY}
        fill={GATE_BODY_FILL}
        stroke={isSelected ? GATE_SELECTED_STROKE : GATE_STROKE}
        strokeWidth={isSelected ? 2 : 1.5}
      />
      {/* Inversion bubble */}
      <circle
        cx={W * 0.75 + 5}
        cy={H / 2}
        r={5}
        fill={GATE_BODY_FILL}
        stroke={isSelected ? GATE_SELECTED_STROKE : GATE_STROKE}
        strokeWidth={isSelected ? 2 : 1.5}
      />
      {/* Input line */}
      <line x1={-12} y1={H * 0.5} x2={0} y2={H * 0.5} stroke={GATE_STROKE} strokeWidth={1.5} />
      {/* Output line */}
      <line x1={W * 0.75 + 10} y1={H * 0.5} x2={W + 12} y2={H * 0.5} stroke={GATE_STROKE} strokeWidth={1.5} />
      <text x={W * 0.3} y={H / 2 + 5} textAnchor="middle" fontSize={13} fontWeight="bold" fill="#94a3b8" pointerEvents="none" fontFamily="monospace">1</text>
      <PortDots gate={gate} definition={definition} inputSignals={inputSignals} onPortClick={onPortClick} />
    </g>
  );
}
