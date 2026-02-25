import type { GateShapeProps } from '../../core/types';
import { GATE_BODY_FILL, GATE_SELECTED_STROKE, GATE_STROKE, SIGNAL_HIGH_COLOR } from '../../utils/constants';
import { PortDots } from './GateBase';

/** Renders a trapezoidal MUX / rectangular DEMUX with labelled ports. */
export function MuxShape({ gate, definition, isSelected, inputSignals, onPointerDown, onPortClick }: GateShapeProps) {
  const W = definition.width;
  const H = definition.height;
  const stroke = isSelected ? GATE_SELECTED_STROKE : GATE_STROKE;

  // For multi-output gates (DEMUX) use a regular rect, for MUX use a trapezoid
  const isMultiOut = definition.outputs.length > 1;
  const inset = Math.min(14, H * 0.13);

  // MUX: narrower on right (output) side
  // DEMUX: narrower on left (input) side
  const pts = isMultiOut
    ? `0,${inset} ${W},0 ${W},${H} 0,${H - inset}`   // DEMUX
    : `0,0 ${W},${inset} ${W},${H - inset} 0,${H}`;  // MUX

  return (
    <g onPointerDown={(e) => onPointerDown(e, gate.id)} style={{ cursor: 'grab' }}>
      <polygon points={pts} fill={GATE_BODY_FILL} stroke={stroke} strokeWidth={isSelected ? 2 : 1.5} />

      {definition.inputs.map((p) => {
        const y = p.relativeY * H;
        const isSel = p.id.startsWith('s');
        return (
          <g key={p.id}>
            <line x1={-12} y1={y} x2={0} y2={y} stroke={GATE_STROKE} strokeWidth={1.5} />
            <text x={4} y={y + 4} fontSize={9}
              fill={isSel ? '#f59e0b' : '#94a3b8'} fontFamily="monospace" pointerEvents="none">
              {p.label ?? p.id}
            </text>
          </g>
        );
      })}

      {definition.outputs.map((p) => {
        const y = p.relativeY * H;
        const isHigh = (gate.outputSignals[p.id]?.value ?? 0) === 1;
        return (
          <g key={p.id}>
            <line x1={W} y1={y} x2={W + 12} y2={y} stroke={GATE_STROKE} strokeWidth={1.5} />
            <text x={W - 4} y={y + 4} fontSize={9}
              fill={isHigh ? SIGNAL_HIGH_COLOR : '#94a3b8'}
              fontFamily="monospace" textAnchor="end" pointerEvents="none">
              {p.label ?? p.id}
            </text>
          </g>
        );
      })}

      <text x={W / 2} y={H / 2 + 4}
        textAnchor="middle" fontSize={10} fontWeight="bold"
        fill="#64748b" fontFamily="monospace" pointerEvents="none">
        {definition.label}
      </text>

      <PortDots gate={gate} definition={definition} inputSignals={inputSignals} onPortClick={onPortClick} />
    </g>
  );
}