/**
 * Shape for 4-bit shift/parallel registers with visible bit-state LEDs.
 * Renders a rectangular body (like FlipFlopShape) plus 4 coloured LED circles
 * showing q0–q3 state in the lower half of the gate.
 */
import type { GateShapeProps } from '../../core/types';
import { GATE_BODY_FILL, GATE_SELECTED_STROKE, GATE_STROKE, SIGNAL_HIGH_COLOR } from '../../utils/constants';
import { PortDots } from './GateBase';

const BIT_IDS = ['q0', 'q1', 'q2', 'q3'] as const;

export function ShiftRegShape({ gate, definition, isSelected, inputSignals, onPointerDown, onPortClick }: GateShapeProps) {
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
        return (
          <g key={p.id}>
            <line x1={W} y1={y} x2={W + 12} y2={y} stroke={GATE_STROKE} strokeWidth={1.5} />
            <text
              x={W - 12}
              y={y + 4}
              fontSize={9}
              fill={isHigh ? SIGNAL_HIGH_COLOR : '#94a3b8'}
              fontFamily="monospace"
              textAnchor="end"
              pointerEvents="none"
            >
              {p.label ?? p.id}
            </text>
          </g>
        );
      })}

      {/* Center type label */}
      <text x={W / 2} y={H * 0.28} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#64748b" fontFamily="monospace" pointerEvents="none">
        {definition.label}
      </text>

      {/* Bit-state LEDs */}
      {BIT_IDS.map((id, i) => {
        const val = gate.outputSignals[id]?.value ?? 0;
        const cx = (i + 1) * W / 5;
        const cy = H * 0.55;
        return (
          <g key={id} pointerEvents="none">
            <circle
              cx={cx} cy={cy} r={7}
              fill={val === 1 ? SIGNAL_HIGH_COLOR : '#1e293b'}
              stroke={val === 1 ? '#16a34a' : '#334155'}
              strokeWidth={1}
            />
            <text x={cx} y={cy + 18} fontSize={7} fill="#475569" textAnchor="middle" fontFamily="monospace">Q{i}</text>
          </g>
        );
      })}

      <PortDots gate={gate} definition={definition} inputSignals={inputSignals} onPortClick={onPortClick} showLabels={false} />
    </g>
  );
}
