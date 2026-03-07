import type { GateShapeProps } from '../../core/types';
import { GATE_SELECTED_STROKE, SIGNAL_HIGH_COLOR, SIGNAL_UNKNOWN_COLOR, SIGNAL_XSTATE_COLOR } from '../../utils/constants';
import { PortDots } from './GateBase';

const W = 60;
const H = 60;

export function OutputLedShape({ gate, definition, isSelected, inputSignals, onPointerDown, onPortClick }: GateShapeProps) {
  const inputSig = inputSignals['in'];
  const isHigh = inputSig?.value === 1;
  const isHiZ  = inputSig?.value === 2;
  const isX    = inputSig?.value === 3;
  const customColor = gate.customState?.ledColor as string | undefined;
  const onColor = customColor || SIGNAL_HIGH_COLOR;
  const ledColor = isX ? SIGNAL_XSTATE_COLOR : isHiZ ? SIGNAL_UNKNOWN_COLOR : isHigh ? onColor : '#1e293b';
  const stroke = isSelected ? GATE_SELECTED_STROKE : '#64748b';

  return (
    <g onPointerDown={(e) => onPointerDown(e, gate.id)} style={{ cursor: 'grab' }}>
      <rect x={0} y={0} width={W} height={H} rx={6} fill="#1e293b" stroke={stroke} strokeWidth={isSelected ? 2 : 1.5} />
      <circle cx={W / 2} cy={H / 2} r={18} fill={ledColor}
        stroke={isHigh ? onColor : '#334155'} strokeWidth={2}
        style={{ filter: isHigh ? 'drop-shadow(0 0 8px ' + onColor + ')' : 'none', transition: 'fill 200ms ease, filter 200ms ease' }} />
      {isHigh && <circle cx={W / 2 - 5} cy={H / 2 - 6} r={4} fill="rgba(255,255,255,0.3)" pointerEvents="none" />}
      <line x1={-12} y1={H * 0.5} x2={0} y2={H * 0.5} stroke="#64748b" strokeWidth={1.5} />
      <circle cx={W - 6} cy={6} r={3} fill={onColor} opacity={0.7} />
      <PortDots gate={gate} definition={definition} inputSignals={inputSignals} onPortClick={onPortClick} />
    </g>
  );
}