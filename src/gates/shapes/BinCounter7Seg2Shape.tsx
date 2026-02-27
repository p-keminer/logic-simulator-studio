import type { GateShapeProps } from '../../core/types';
import { GATE_STROKE, GATE_SELECTED_STROKE } from '../../utils/constants';
import { PortDots } from './GateBase';

const SEG_ON  = '#ef4444';
const SEG_OFF = 'rgba(239,68,68,0.08)';

const DEC_TABLE: boolean[][] = [
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

function SingleDisplay({ ox, oy, sw, sh, digit }: {
  ox: number; oy: number; sw: number; sh: number; digit: number;
}) {
  const [a, b, c, d, e, f, g] = DEC_TABLE[digit] ?? DEC_TABLE[0];
  const vs = sh / 2 - 3;
  return (
    <>
      <HorizSeg x={ox+3}  y={oy}        len={sw} on={a} />
      <VertSeg  x={ox+sw} y={oy+3}      len={vs} on={b} />
      <VertSeg  x={ox+sw} y={oy+sh/2+3} len={vs} on={c} />
      <HorizSeg x={ox+3}  y={oy+sh}     len={sw} on={d} />
      <VertSeg  x={ox}    y={oy+sh/2+3} len={vs} on={e} />
      <VertSeg  x={ox}    y={oy+3}      len={vs} on={f} />
      <HorizSeg x={ox+3}  y={oy+sh/2}   len={sw} on={g} />
    </>
  );
}

export function BinCounter7Seg2Shape({ gate, definition, isSelected, inputSignals, onPointerDown, onPortClick }: GateShapeProps) {
  const W = definition.width;
  const H = definition.height;
  const stroke = isSelected ? GATE_SELECTED_STROKE : GATE_STROKE;
  const count = Math.max(0, Math.min(99, (gate.customState?.count as number) ?? 0));
  const tens = Math.floor(count / 10);
  const ones = count % 10;

  const oy  = 18;
  const sw  = 30;
  const sh  = 64;
  const gap = 8;
  const ox1 = Math.floor((W - (sw * 2 + gap + 12)) / 2);
  const ox2 = ox1 + sw + gap + 12;

  return (
    <g onPointerDown={(e) => onPointerDown(e, gate.id)} style={{ cursor: 'grab' }}>
      <rect x={0} y={0} width={W} height={H} rx={6} fill="#0a1628" stroke={stroke} strokeWidth={isSelected ? 2 : 1.5} />

      {/* Display background */}
      <rect x={ox1-6} y={oy-6} width={(ox2+sw+8)-(ox1-6)} height={sh+12} rx={4} fill="#060d1a" />

      <SingleDisplay ox={ox1} oy={oy} sw={sw} sh={sh} digit={tens} />
      <SingleDisplay ox={ox2} oy={oy} sw={sw} sh={sh} digit={ones} />

      {/* Count label */}
      <text x={W/2} y={oy+sh+22} textAnchor="middle" fontSize={9} fill="#475569" fontFamily="monospace" pointerEvents="none">
        BIN-CTR  {String(count).padStart(2, '0')}
      </text>

      {/* Port labels */}
      <text x={8} y={H*0.22+3} fontSize={10} fill="#64748b" fontFamily="monospace" pointerEvents="none">CLK</text>
      <text x={8} y={H*0.44+3} fontSize={10} fill="#64748b" fontFamily="monospace" pointerEvents="none">RST</text>
      <text x={8} y={H*0.66+3} fontSize={10} fill="#64748b" fontFamily="monospace" pointerEvents="none">EN</text>
      <text x={W-8} y={H*0.27+3} textAnchor="end" fontSize={10} fill="#64748b" fontFamily="monospace" pointerEvents="none">Q0</text>
      <text x={W-8} y={H*0.38+3} textAnchor="end" fontSize={10} fill="#64748b" fontFamily="monospace" pointerEvents="none">Q1</text>
      <text x={W-8} y={H*0.49+3} textAnchor="end" fontSize={10} fill="#64748b" fontFamily="monospace" pointerEvents="none">Q2</text>
      <text x={W-8} y={H*0.60+3} textAnchor="end" fontSize={10} fill="#64748b" fontFamily="monospace" pointerEvents="none">Q3</text>
      <text x={W-8} y={H*0.71+3} textAnchor="end" fontSize={10} fill="#64748b" fontFamily="monospace" pointerEvents="none">Q4</text>
      <text x={W-8} y={H*0.82+3} textAnchor="end" fontSize={10} fill="#64748b" fontFamily="monospace" pointerEvents="none">Q5</text>
      <text x={W-8} y={H*0.93+3} textAnchor="end" fontSize={10} fill="#facc15" fontFamily="monospace" pointerEvents="none">RCO</text>

      <PortDots gate={gate} definition={definition} inputSignals={inputSignals} onPortClick={onPortClick} showLabels={false} />
    </g>
  );
}
