import type { GateShapeProps } from '../../core/types';
import { GATE_STROKE, GATE_SELECTED_STROKE } from '../../utils/constants';
import { PortDots } from './GateBase';

const SEG_ON  = '#ef4444';
const SEG_OFF = 'rgba(239,68,68,0.08)';

const BCD_TABLE: boolean[][] = [
  [true,  true,  true,  true,  true,  true,  false], // 0
  [false, true,  true,  false, false, false, false],  // 1
  [true,  true,  false, true,  true,  false, true],   // 2
  [true,  true,  true,  true,  false, false, true],   // 3
  [false, true,  true,  false, false, true,  true],   // 4
  [true,  false, true,  true,  false, true,  true],   // 5
  [true,  false, true,  true,  true,  true,  true],   // 6
  [true,  true,  true,  false, false, false, false],  // 7
  [true,  true,  true,  true,  true,  true,  true],   // 8
  [true,  true,  true,  true,  false, true,  true],   // 9
];

function HorizSeg({ x, y, len, on }: { x: number; y: number; len: number; on: boolean }) {
  const s = 4;
  const d = ['M', x+s, y, 'L', x+len/2-2, y-s+2, 'L', x+len/2+2, y-s+2,
    'L', x+len-s, y, 'L', x+len/2+2, y+s-2, 'L', x+len/2-2, y+s-2, 'Z'].join(' ');
  return <path d={d} fill={on ? SEG_ON : SEG_OFF} style={{ transition: 'fill 80ms' }} />;
}

function VertSeg({ x, y, len, on }: { x: number; y: number; len: number; on: boolean }) {
  const s = 4;
  const d = ['M', x, y+s, 'L', x-s+2, y+len/2-2, 'L', x-s+2, y+len/2+2,
    'L', x, y+len-s, 'L', x+s-2, y+len/2+2, 'L', x+s-2, y+len/2-2, 'Z'].join(' ');
  return <path d={d} fill={on ? SEG_ON : SEG_OFF} style={{ transition: 'fill 80ms' }} />;
}

function SingleDisplay({ ox, oy, sw, sh, segs }: {
  ox: number; oy: number; sw: number; sh: number; segs: boolean[];
}) {
  const [a, b, c, d, e, f, g] = segs;
  const vs = sh / 2 - 3;
  return (
    <>
      <HorizSeg x={ox+3}    y={oy}        len={sw} on={a} />
      <VertSeg  x={ox+sw}   y={oy+3}      len={vs} on={b} />
      <VertSeg  x={ox+sw}   y={oy+sh/2+3} len={vs} on={c} />
      <HorizSeg x={ox+3}    y={oy+sh}     len={sw} on={d} />
      <VertSeg  x={ox}      y={oy+sh/2+3} len={vs} on={e} />
      <VertSeg  x={ox}      y={oy+3}      len={vs} on={f} />
      <HorizSeg x={ox+3}    y={oy+sh/2}   len={sw} on={g} />
      <circle cx={ox+sw+8} cy={oy+sh+2} r={2.5} fill={SEG_OFF} />
    </>
  );
}

function bcdSegs(d3: number, d2: number, d1: number, d0: number): boolean[] {
  const val = ((d3 & 1) << 3) | ((d2 & 1) << 2) | ((d1 & 1) << 1) | (d0 & 1);
  return BCD_TABLE[val] ?? BCD_TABLE[0];
}

export function SevenSegDualShape({ gate, definition, isSelected, inputSignals, onPointerDown, onPortClick }: GateShapeProps) {
  const W = definition.width;
  const H = definition.height;
  const stroke = isSelected ? GATE_SELECTED_STROKE : GATE_STROKE;

  let leftSegs: boolean[];
  let rightSegs: boolean[];

  if (definition.typeId === 'SEG7_DUAL') {
    // Direct segment inputs: a1–g1 for left digit, a2–g2 for right digit
    leftSegs = ['a1','b1','c1','d1','e1','f1','g1'].map(
      id => (inputSignals[id]?.value ?? 0) === 1
    );
    rightSegs = ['a2','b2','c2','d2','e2','f2','g2'].map(
      id => (inputSignals[id]?.value ?? 0) === 1
    );
  } else {
    // BCD mode (SEG7_BCD_2)
    leftSegs = bcdSegs(
      inputSignals['t3']?.value ?? 0,
      inputSignals['t2']?.value ?? 0,
      inputSignals['t1']?.value ?? 0,
      inputSignals['t0']?.value ?? 0,
    );
    rightSegs = bcdSegs(
      inputSignals['d3']?.value ?? 0,
      inputSignals['d2']?.value ?? 0,
      inputSignals['d1']?.value ?? 0,
      inputSignals['d0']?.value ?? 0,
    );
  }

  const oy  = 8;
  const sw  = 34;
  const sh  = 76;
  const gap = 10;
  const ox1 = 16;
  const ox2 = ox1 + sw + gap + 12;

  return (
    <g onPointerDown={(e) => onPointerDown(e, gate.id)} style={{ cursor: 'grab' }}>
      <rect x={0} y={0} width={W} height={H} rx={6} fill="#0a1628" stroke={stroke} strokeWidth={isSelected ? 2 : 1.5} />
      <rect x={ox1-6} y={oy-4} width={(ox2+sw+8)-(ox1-6)} height={sh+8} rx={4} fill="#060d1a" />

      <SingleDisplay ox={ox1} oy={oy} sw={sw} sh={sh} segs={leftSegs} />
      <SingleDisplay ox={ox2} oy={oy} sw={sw} sh={sh} segs={rightSegs} />

      <PortDots gate={gate} definition={definition} inputSignals={inputSignals} onPortClick={onPortClick} />
    </g>
  );
}
