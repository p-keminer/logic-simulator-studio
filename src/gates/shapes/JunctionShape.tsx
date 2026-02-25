import type { GateShapeProps } from '../../core/types';
import { PortDots } from './GateBase';

const W = 16;
const H = 16;

export function JunctionShape({ gate, definition, inputSignals, onPointerDown, onPortClick }: GateShapeProps) {
  return (
    <g onPointerDown={(e) => onPointerDown(e, gate.id)} style={{ cursor: 'grab' }}>
      {/* transparent hit area */}
      <rect x={0} y={0} width={W} height={H} fill="transparent" />
      <circle cx={W / 2} cy={H / 2} r={6} fill="#94a3b8" />
      <PortDots gate={gate} definition={definition} inputSignals={inputSignals} onPortClick={onPortClick} />
    </g>
  );
}
