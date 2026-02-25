import type { GateShapeProps } from '../../core/types';
import { GATE_BODY_FILL, GATE_STROKE, GATE_SELECTED_STROKE } from '../../utils/constants';
import { PortDots } from './GateBase';

export function BusSplitterShape({ gate, definition, isSelected, inputSignals, onPointerDown, onPortClick }: GateShapeProps) {
  const W = definition.width;
  const H = definition.height;
  const stroke = isSelected ? GATE_SELECTED_STROKE : GATE_STROKE;
  const bits = definition.inputs.length;

  return (
    <g onPointerDown={(e) => onPointerDown(e, gate.id)} style={{ cursor: 'grab' }}>
      {/* Main body */}
      <rect x={0} y={0} width={W} height={H} rx={2} fill={GATE_BODY_FILL} stroke={stroke} strokeWidth={isSelected ? 2 : 1.5} />
      {/* Thick bus strips on left and right to indicate bus */}
      <rect x={0} y={4} width={5} height={H - 8} fill={GATE_STROKE} rx={1} />
      <rect x={W - 5} y={4} width={5} height={H - 8} fill={GATE_STROKE} rx={1} />

      {/* Input stubs */}
      {definition.inputs.map((p) => {
        const y = p.relativeY * H;
        return <line key={p.id} x1={-12} y1={y} x2={0} y2={y} stroke={GATE_STROKE} strokeWidth={1.5} />;
      })}
      {/* Output stubs */}
      {definition.outputs.map((p) => {
        const y = p.relativeY * H;
        return <line key={p.id} x1={W} y1={y} x2={W + 12} y2={y} stroke={GATE_STROKE} strokeWidth={1.5} />;
      })}

      {/* Bit-width label */}
      <text
        x={W / 2} y={H / 2 + 4} textAnchor="middle"
        fontSize={9} fontWeight="bold" fill="#64748b" fontFamily="monospace" pointerEvents="none"
      >
        {bits}
      </text>

      <PortDots gate={gate} definition={definition} inputSignals={inputSignals} onPortClick={onPortClick} />
    </g>
  );
}
