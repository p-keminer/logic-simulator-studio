import type { GateShapeProps } from '../../core/types';
import { GATE_STROKE, GATE_SELECTED_STROKE } from '../../utils/constants';
import { PortDots } from './GateBase';

const SEG_ON = '#ef4444';
const SEG_OFF = 'rgba(239,68,68,0.08)';

function HorizSeg({ x, y, len, on }: { x: number; y: number; len: number; on: boolean }) {
  const s = 5;
  const d = [
    'M', x + s, y,
    'L', x + len / 2 - 2, y - s + 2,
    'L', x + len / 2 + 2, y - s + 2,
    'L', x + len - s, y,
    'L', x + len / 2 + 2, y + s - 2,
    'L', x + len / 2 - 2, y + s - 2,
    'Z'
  ].join(' ');
  return <path d={d} fill={on ? SEG_ON : SEG_OFF} style={{ transition: 'fill 80ms' }} />;
}

function VertSeg({ x, y, len, on }: { x: number; y: number; len: number; on: boolean }) {
  const s = 5;
  const d = [
    'M', x, y + s,
    'L', x - s + 2, y + len / 2 - 2,
    'L', x - s + 2, y + len / 2 + 2,
    'L', x, y + len - s,
    'L', x + s - 2, y + len / 2 + 2,
    'L', x + s - 2, y + len / 2 - 2,
    'Z'
  ].join(' ');
  return <path d={d} fill={on ? SEG_ON : SEG_OFF} style={{ transition: 'fill 80ms' }} />;
}

// BCD to segment table (a b c d e f g)
const BCD_TABLE: boolean[][] = [
  [true, true, true, true, true, true, false],   // 0
  [false,true, true, false,false,false,false],    // 1
  [true, true, false,true, true, false,true],     // 2
  [true, true, true, true, false,false,true],     // 3
  [false,true, true, false,false,true, true],     // 4
  [true, false,true, true, false,true, true],     // 5
  [true, false,true, true, true, true, true],     // 6
  [true, true, true, false,false,false,false],    // 7
  [true, true, true, true, true, true, true],     // 8
  [true, true, true, true, false,true, true],     // 9
];

export function SevenSegShape({ gate, definition, isSelected, inputSignals, onPointerDown, onPortClick }: GateShapeProps) {
  const W = definition.width;
  const H = definition.height;
  const stroke = isSelected ? GATE_SELECTED_STROKE : GATE_STROKE;

  const segments = definition.typeId === 'SEG7_BCD'
    ? BCD_TABLE[
        ((inputSignals['d3']?.value ?? 0) << 3)
        | ((inputSignals['d2']?.value ?? 0) << 2)
        | ((inputSignals['d1']?.value ?? 0) << 1)
        | (inputSignals['d0']?.value ?? 0)
      ] ?? BCD_TABLE[0]
    : [
        (inputSignals['a']?.value ?? 0) === 1,
        (inputSignals['b']?.value ?? 0) === 1,
        (inputSignals['c']?.value ?? 0) === 1,
        (inputSignals['d']?.value ?? 0) === 1,
        (inputSignals['e']?.value ?? 0) === 1,
        (inputSignals['f']?.value ?? 0) === 1,
        (inputSignals['g']?.value ?? 0) === 1,
      ];
  const [a, b, c, d, e, f, g] = segments;

  // Display area: 48x84 centered at offset (20, 8)
  const ox = 20; const oy = 8;
  const sw = 44; const sh = 80;
  const hs = sw - 8;   // horiz segment width
  const vs = sh / 2 - 4; // vert segment height

  return (
    <g onPointerDown={(e) => onPointerDown(e, gate.id)} style={{ cursor: 'grab' }}>
      <rect x={0} y={0} width={W} height={H} rx={6} fill="#0a1628" stroke={stroke} strokeWidth={isSelected ? 2 : 1.5} />
      <rect x={ox - 4} y={oy - 4} width={sw + 16} height={sh + 8} rx={4} fill="#060d1a" />
      {/* a: top */}
      <HorizSeg x={ox + 4} y={oy} len={hs} on={a} />
      {/* b: top-right */}
      <VertSeg x={ox + sw} y={oy + 4} len={vs} on={b} />
      {/* c: bottom-right */}
      <VertSeg x={ox + sw} y={oy + sh / 2 + 4} len={vs} on={c} />
      {/* d: bottom */}
      <HorizSeg x={ox + 4} y={oy + sh} len={hs} on={d} />
      {/* e: bottom-left */}
      <VertSeg x={ox} y={oy + sh / 2 + 4} len={vs} on={e} />
      {/* f: top-left */}
      <VertSeg x={ox} y={oy + 4} len={vs} on={f} />
      {/* g: middle */}
      <HorizSeg x={ox + 4} y={oy + sh / 2} len={hs} on={g} />
      {/* decimal point */}
      <circle cx={ox + sw + 10} cy={oy + sh + 2} r={3} fill={SEG_OFF} />
      <PortDots gate={gate} definition={definition} inputSignals={inputSignals} onPortClick={onPortClick} />
    </g>
  );
}
