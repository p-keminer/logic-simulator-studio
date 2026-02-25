
import type { GateShapeProps } from '../../core/types';
import { GATE_BODY_FILL, GATE_STROKE, GATE_SELECTED_STROKE } from '../../utils/constants';
import { PortDots } from './GateBase';

const W = 80;
const H = 60;
const BODY = `M 10,0 Q ${W * 0.35},0 ${W - 12},${H / 2} Q ${W * 0.35},${H} 10,${H} Q ${W * 0.28},${H / 2} 10,0 Z`;

export function NorShape({ gate, definition, isSelected, inputSignals, onPointerDown, onPortClick }: GateShapeProps) {
  return (
    <g onPointerDown={(e) => onPointerDown(e, gate.id)} style={{ cursor: 'grab' }}>
      <path
        d={BODY}
        fill={GATE_BODY_FILL}
        stroke={isSelected ? GATE_SELECTED_STROKE : GATE_STROKE}
        strokeWidth={isSelected ? 2 : 1.5}
      />
      <circle
        cx={W - 12 + 5}
        cy={H / 2}
        r={5}
        fill={GATE_BODY_FILL}
        stroke={isSelected ? GATE_SELECTED_STROKE : GATE_STROKE}
        strokeWidth={isSelected ? 2 : 1.5}
      />
      <line x1={-12} y1={H * 0.33} x2={14} y2={H * 0.33} stroke={GATE_STROKE} strokeWidth={1.5} />
      <line x1={-12} y1={H * 0.67} x2={14} y2={H * 0.67} stroke={GATE_STROKE} strokeWidth={1.5} />
      <line x1={W - 12 + 10} y1={H * 0.5} x2={W + 12} y2={H * 0.5} stroke={GATE_STROKE} strokeWidth={1.5} />
      <text x={W * 0.38} y={H / 2 + 5} textAnchor="middle" fontSize={11} fontWeight="bold" fill="#94a3b8" pointerEvents="none" fontFamily="monospace">≥1</text>
      <PortDots gate={gate} definition={definition} inputSignals={inputSignals} onPortClick={onPortClick} />
    </g>
  );
}
