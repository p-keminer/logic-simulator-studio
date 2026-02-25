import type { GateShapeProps } from '../../core/types';
import { GATE_STROKE, GATE_SELECTED_STROKE } from '../../utils/constants';
import { PortDots } from './GateBase';

const W = 180;
const H = 180;
const CELL = 18;
const OFFSET = 18; // grid starts 18px from top-left

export function DotMatrixShape({ gate, definition, isSelected, inputSignals, onPointerDown, onPortClick }: GateShapeProps) {
  const stroke = isSelected ? GATE_SELECTED_STROKE : GATE_STROKE;

  return (
    <g onPointerDown={(e) => onPointerDown(e, gate.id)} style={{ cursor: 'grab' }}>
      <rect x={0} y={0} width={W} height={H} rx={6} fill="#060d1a" stroke={stroke} strokeWidth={isSelected ? 2 : 1.5} />
      <text x={W / 2} y={H + 12} textAnchor="middle" fontSize={8} fill="#475569" fontFamily="monospace" pointerEvents="none">
        8×8 DOT MATRIX
      </text>

      {/* 8×8 pixel grid */}
      {Array.from({ length: 8 }, (_, row) =>
        Array.from({ length: 8 }, (_, col) => {
          const cx = OFFSET + col * CELL + CELL / 2;
          const cy = OFFSET + row * CELL + CELL / 2;
          const rowHigh = inputSignals[`row${row}`]?.value === 1;
          const colHigh = inputSignals[`col${col}`]?.value === 1;
          const lit = rowHigh && colHigh;
          return (
            <circle
              key={`${row}-${col}`}
              cx={cx}
              cy={cy}
              r={6}
              fill={lit ? '#facc15' : '#0f172a'}
              style={{ transition: 'fill 60ms ease', filter: lit ? 'drop-shadow(0 0 4px #facc15)' : 'none' }}
              pointerEvents="none"
            />
          );
        })
      )}

      <PortDots gate={gate} definition={definition} inputSignals={inputSignals} onPortClick={onPortClick} />
    </g>
  );
}
