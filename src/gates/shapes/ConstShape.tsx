import type { GateShapeProps } from '../../core/types';
import { GATE_BODY_FILL, GATE_STROKE, GATE_SELECTED_STROKE } from '../../utils/constants';
import { PortDots } from './GateBase';

export function ConstShape({ gate, definition, isSelected, inputSignals, onPointerDown, onPortClick }: GateShapeProps) {
  const W = definition.width;
  const H = definition.height;
  const stroke = isSelected ? GATE_SELECTED_STROKE : GATE_STROKE;
  const isHigh = definition.typeId === 'CONST_HIGH';
  const color = isHigh ? '#22c55e' : '#475569';
  const label = isHigh ? '1' : '0';

  return (
    <g onPointerDown={(e) => onPointerDown(e, gate.id)} style={{ cursor: 'grab' }}>
      <rect x={0} y={0} width={W} height={H} rx={6} fill={GATE_BODY_FILL} stroke={stroke} strokeWidth={isSelected ? 2 : 1.5} />
      <circle cx={W / 2} cy={H / 2} r={14} fill={color} opacity={0.2} />
      <text x={W / 2} y={H / 2 + 6} textAnchor="middle" fontSize={20} fontWeight="bold"
        fill={color} fontFamily="monospace" pointerEvents="none">
        {label}
      </text>
      <PortDots gate={gate} definition={definition} inputSignals={inputSignals} onPortClick={onPortClick} />
    </g>
  );
}