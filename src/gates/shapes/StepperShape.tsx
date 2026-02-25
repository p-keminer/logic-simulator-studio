import type { GateShapeProps } from '../../core/types';
import { GATE_STROKE, GATE_SELECTED_STROKE } from '../../utils/constants';
import { PortDots } from './GateBase';

const W = 120;
const H = 120;
const CX = 60;
const CY = 58;
const R  = 42;

export function StepperShape({ gate, definition, isSelected, inputSignals, onPointerDown, onPortClick }: GateShapeProps) {
  const stroke = isSelected ? GATE_SELECTED_STROKE : GATE_STROKE;
  const angle  = (gate.customState?.angle as number) ?? 0;

  // Coil activity
  const aOn = inputSignals['a']?.value === 1;
  const bOn = inputSignals['b']?.value === 1;
  const cOn = inputSignals['c']?.value === 1;
  const dOn = inputSignals['d']?.value === 1;

  // Pointer endpoint (rotate around center)
  const rad = (angle - 90) * (Math.PI / 180);
  const px  = CX + Math.cos(rad) * (R - 6);
  const py  = CY + Math.sin(rad) * (R - 6);

  return (
    <g onPointerDown={(e) => onPointerDown(e, gate.id)} style={{ cursor: 'grab' }}>
      <rect x={0} y={0} width={W} height={H} rx={6} fill="#0a1628" stroke={stroke} strokeWidth={isSelected ? 2 : 1.5} />

      {/* Motor outer ring */}
      <circle cx={CX} cy={CY} r={R} fill="#060d1a" stroke="#334155" strokeWidth={1.5} />
      <circle cx={CX} cy={CY} r={R - 8} fill="none" stroke="#1e293b" strokeWidth={1} strokeDasharray="4 4" />

      {/* Coil indicators: N=top(a), E=right(b), S=bottom(c), W=left(d) */}
      <circle cx={CX}      cy={CY - R + 5} r={5} fill={aOn ? '#f97316' : '#1e293b'} stroke={aOn ? '#f97316' : '#334155'} strokeWidth={1} style={{ transition: 'fill 60ms' }} />
      <circle cx={CX + R - 5} cy={CY}      r={5} fill={bOn ? '#f97316' : '#1e293b'} stroke={bOn ? '#f97316' : '#334155'} strokeWidth={1} style={{ transition: 'fill 60ms' }} />
      <circle cx={CX}      cy={CY + R - 5} r={5} fill={cOn ? '#f97316' : '#1e293b'} stroke={cOn ? '#f97316' : '#334155'} strokeWidth={1} style={{ transition: 'fill 60ms' }} />
      <circle cx={CX - R + 5} cy={CY}      r={5} fill={dOn ? '#f97316' : '#1e293b'} stroke={dOn ? '#f97316' : '#334155'} strokeWidth={1} style={{ transition: 'fill 60ms' }} />

      {/* Coil labels */}
      <text x={CX}      y={CY - R + 4}  textAnchor="middle" dominantBaseline="middle" fontSize={6} fill={aOn ? '#fed7aa' : '#475569'} fontFamily="monospace" pointerEvents="none">A</text>
      <text x={CX + R - 5} y={CY}       textAnchor="middle" dominantBaseline="middle" fontSize={6} fill={bOn ? '#fed7aa' : '#475569'} fontFamily="monospace" pointerEvents="none">B</text>
      <text x={CX}      y={CY + R - 4}  textAnchor="middle" dominantBaseline="middle" fontSize={6} fill={cOn ? '#fed7aa' : '#475569'} fontFamily="monospace" pointerEvents="none">C</text>
      <text x={CX - R + 5} y={CY}       textAnchor="middle" dominantBaseline="middle" fontSize={6} fill={dOn ? '#fed7aa' : '#475569'} fontFamily="monospace" pointerEvents="none">D</text>

      {/* Rotating shaft / pointer */}
      <line x1={CX} y1={CY} x2={px} y2={py} stroke="#22c55e" strokeWidth={3} strokeLinecap="round" pointerEvents="none" style={{ transition: 'x2 80ms, y2 80ms' }} />
      <circle cx={CX} cy={CY} r={4} fill="#22c55e" pointerEvents="none" />

      {/* Angle label */}
      <text x={CX} y={H - 6} textAnchor="middle" fontSize={8} fill="#475569" fontFamily="monospace" pointerEvents="none">
        {angle}°
      </text>

      <PortDots gate={gate} definition={definition} inputSignals={inputSignals} onPortClick={onPortClick} />
    </g>
  );
}
