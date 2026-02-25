import type { GateShapeProps } from '../../core/types';
import { GATE_BODY_FILL, GATE_STROKE, GATE_SELECTED_STROKE, SIGNAL_HIGH_COLOR, SIGNAL_LOW_COLOR } from '../../utils/constants';
import { PortDots } from './GateBase';

export function ClockShape({ gate, definition, isSelected, inputSignals, onPointerDown, onPortClick }: GateShapeProps) {
  const W = definition.width;
  const H = definition.height;
  const stroke = isSelected ? GATE_SELECTED_STROKE : GATE_STROKE;
  const value = (gate.customState?.value as 0 | 1) ?? 0;
  const freq = (gate.customState?.frequency as number) ?? 1;
  const color = value === 1 ? SIGNAL_HIGH_COLOR : SIGNAL_LOW_COLOR;

  // Square wave symbol path
  const top = H * 0.25;
  const bot = H * 0.75;
  const w1 = W * 0.25;
  const w2 = W * 0.45;
  const w3 = W * 0.55;
  const w4 = W * 0.75;
  const sqPath = `M ${w1} ${bot} L ${w1} ${top} L ${w2} ${top} L ${w2} ${bot} L ${w3} ${bot} L ${w3} ${top} L ${w4} ${top} L ${w4} ${bot}`;

  return (
    <g onPointerDown={(e) => onPointerDown(e, gate.id)} style={{ cursor: 'grab' }}>
      <rect x={0} y={0} width={W} height={H} rx={6} fill={GATE_BODY_FILL} stroke={stroke} strokeWidth={isSelected ? 2 : 1.5} />
      <path d={sqPath} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round"
        style={{ transition: 'stroke 100ms ease' }} />
      {/* Frequency label */}
      <text x={W / 2} y={H - 6} textAnchor="middle" fontSize={8} fill="#64748b" fontFamily="monospace" pointerEvents="none">
        {freq >= 1 ? `${freq}Hz` : `${(freq * 1000).toFixed(0)}mHz`}
      </text>
      {/* Current state dot */}
      <circle cx={W - 10} cy={10} r={4} fill={color} style={{ transition: 'fill 100ms ease' }} />
      <PortDots gate={gate} definition={definition} inputSignals={inputSignals} onPortClick={onPortClick} />
    </g>
  );
}