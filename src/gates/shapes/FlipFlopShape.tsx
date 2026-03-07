/**
 * Generic rectangular box shape for flip-flops and registers.
 * Port labels are read directly from the gate definition.
 */
import type { GateShapeProps } from '../../core/types';
import { GATE_BODY_FILL, GATE_SELECTED_STROKE, GATE_STROKE, SIGNAL_HIGH_COLOR, SIGNAL_UNKNOWN_COLOR } from '../../utils/constants';
import { PortDots } from './GateBase';

export function FlipFlopShape({ gate, definition, isSelected, inputSignals, onPointerDown, onPortClick }: GateShapeProps) {
  const W = definition.width;
  const H = definition.height;
  const stroke = isSelected ? GATE_SELECTED_STROKE : GATE_STROKE;

  return (
    <g onPointerDown={(e) => onPointerDown(e, gate.id)} style={{ cursor: 'grab' }}>
      <rect x={0} y={0} width={W} height={H} rx={3} fill={GATE_BODY_FILL} stroke={stroke} strokeWidth={isSelected ? 2 : 1.5} />

      {/* Input port lines + labels */}
      {definition.inputs.map((p) => {
        const y = p.relativeY * H;
        const isClk = p.id === 'clk';
        return (
          <g key={p.id}>
            <line x1={-12} y1={y} x2={0} y2={y} stroke={GATE_STROKE} strokeWidth={1.5} />
            {isClk ? (
              // Clock triangle symbol
              <path d={`M 0,${y - 6} L 8,${y} L 0,${y + 6}`} fill="none" stroke={GATE_STROKE} strokeWidth={1.5} />
            ) : (
              <text x={12} y={y + 4} fontSize={9} fill="#94a3b8" fontFamily="monospace" pointerEvents="none">{p.label ?? p.id}</text>
            )}
          </g>
        );
      })}

      {/* Output port lines + labels */}
      {definition.outputs.map((p) => {
        const y = p.relativeY * H;
        const sig = gate.outputSignals[p.id];
        const isHigh = sig?.value === 1;
        const isHiZ  = sig?.value === 2;
        return (
          <g key={p.id}>
            <line x1={W} y1={y} x2={W + 12} y2={y} stroke={GATE_STROKE} strokeWidth={1.5} />
            <text
              x={W - 12}
              y={y + 4}
              fontSize={9}
              fill={isHiZ ? SIGNAL_UNKNOWN_COLOR : isHigh ? SIGNAL_HIGH_COLOR : '#94a3b8'}
              fontFamily="monospace"
              textAnchor="end"
              pointerEvents="none"
            >
              {p.label ?? p.id}
            </text>
          </g>
        );
      })}

      {/* Center label */}
      <text x={W / 2} y={H / 2 + 4} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#64748b" fontFamily="monospace" pointerEvents="none">
        {definition.label}
      </text>

      <PortDots gate={gate} definition={definition} inputSignals={inputSignals} onPortClick={onPortClick} showLabels={false} />
    </g>
  );
}
