import type { GateShapeProps } from '../../core/types';
import { GATE_BODY_FILL, GATE_STROKE, GATE_SELECTED_STROKE } from '../../utils/constants';
import { PortDots } from './GateBase';

export function SchmittShape({ gate, definition, isSelected, inputSignals, onPointerDown, onPortClick }: GateShapeProps) {
  const W = definition.width;
  const H = definition.height;
  const tipX = W * 0.8;
  const stroke = isSelected ? GATE_SELECTED_STROKE : GATE_STROKE;

  // Triangle body
  const body = `M 0,0 L ${tipX},${H / 2} L 0,${H} Z`;

  // Hysteresis symbol (two-step square wave) centered in triangle
  const sx = W * 0.22;
  const sy = H / 2;
  const hyst = [
    `M ${sx - 9},${sy + 4}`,
    `L ${sx - 3},${sy + 4}`,
    `L ${sx - 3},${sy - 4}`,
    `L ${sx + 3},${sy - 4}`,
    `L ${sx + 3},${sy + 4}`,
    `L ${sx + 9},${sy + 4}`,
  ].join(' ');

  return (
    <g onPointerDown={(e) => onPointerDown(e, gate.id)} style={{ cursor: 'grab' }}>
      <path d={body} fill={GATE_BODY_FILL} stroke={stroke} strokeWidth={isSelected ? 2 : 1.5} />
      {/* Input stub */}
      <line x1={-12} y1={H / 2} x2={0} y2={H / 2} stroke={GATE_STROKE} strokeWidth={1.5} />
      {/* Output stub */}
      <line x1={tipX} y1={H / 2} x2={W + 12} y2={H / 2} stroke={GATE_STROKE} strokeWidth={1.5} />
      {/* Hysteresis symbol */}
      <path d={hyst} fill="none" stroke="#94a3b8" strokeWidth={1.5} strokeLinejoin="round" />
      <PortDots gate={gate} definition={definition} inputSignals={inputSignals} onPortClick={onPortClick} />
    </g>
  );
}
