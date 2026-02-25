
import type { GateShapeProps } from '../../core/types';
import { GATE_SELECTED_STROKE, SIGNAL_HIGH_COLOR, SIGNAL_LOW_COLOR } from '../../utils/constants';
import { PortDots } from './GateBase';

export function InputSwitchShape({ gate, definition, isSelected, inputSignals, onPointerDown, onPortClick }: GateShapeProps) {
  const W = definition.width;
  const H = definition.height;
  const isHigh   = (gate.customState?.value as 0 | 1 | undefined) === 1;
  const bgColor  = isHigh ? '#166534' : '#1e293b';
  const ledColor = isHigh ? SIGNAL_HIGH_COLOR : SIGNAL_LOW_COLOR;
  const stroke   = isSelected ? GATE_SELECTED_STROKE : '#64748b';

  return (
    <g onPointerDown={(e) => onPointerDown(e, gate.id)} style={{ cursor: 'grab' }}>
      <rect x={0} y={0} width={W} height={H} rx={6} fill={bgColor} stroke={stroke} strokeWidth={isSelected ? 2 : 1.5} />
      {/* LED indicator */}
      <circle
        cx={W * 0.3} cy={H / 2} r={7}
        fill={ledColor}
        style={{ filter: isHigh ? `drop-shadow(0 0 4px ${SIGNAL_HIGH_COLOR})` : 'none', transition: 'fill 200ms ease' }}
      />
      {/* Label */}
      <text x={W * 0.65} y={H / 2 + 5} textAnchor="middle" fontSize={11} fontWeight="bold"
        fill="#94a3b8" pointerEvents="none" fontFamily="monospace">
        {isHigh ? 'HIGH' : 'LOW'}
      </text>
      {/* Output stub line */}
      <line x1={W * 0.95} y1={H * 0.5} x2={W + 12} y2={H * 0.5} stroke="#64748b" strokeWidth={1.5} />
      <PortDots gate={gate} definition={definition} inputSignals={inputSignals} onPortClick={onPortClick} />
    </g>
  );
}
