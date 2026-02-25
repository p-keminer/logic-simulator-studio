import type { GateShapeProps } from '../../core/types';
import { GATE_STROKE, GATE_SELECTED_STROKE } from '../../utils/constants';
import { PortDots } from './GateBase';

const SEG_ON  = '#ef4444';
const SEG_OFF = 'rgba(239,68,68,0.08)';

// Hex table (a b c d e f g) for digits 0-F
const HEX_TABLE: boolean[][] = [
  [true,  true,  true,  true,  true,  true,  false], // 0
  [false, true,  true,  false, false, false, false], // 1
  [true,  true,  false, true,  true,  false, true],  // 2
  [true,  true,  true,  true,  false, false, true],  // 3
  [false, true,  true,  false, false, true,  true],  // 4
  [true,  false, true,  true,  false, true,  true],  // 5
  [true,  false, true,  true,  true,  true,  true],  // 6
  [true,  true,  true,  false, false, false, false], // 7
  [true,  true,  true,  true,  true,  true,  true],  // 8
  [true,  true,  true,  true,  false, true,  true],  // 9
  [true,  true,  true,  false, true,  true,  true],  // A
  [false, false, true,  true,  true,  true,  true],  // b
  [true,  false, false, true,  true,  true,  false], // C
  [false, true,  true,  true,  true,  false, true],  // d
  [true,  false, false, true,  true,  true,  true],  // E
  [true,  false, false, false, true,  true,  true],  // F
];

function HorizSeg({ x, y, len, on }: { x: number; y: number; len: number; on: boolean }) {
  const s = 4;
  const d = ['M', x + s, y, 'L', x + len / 2 - 2, y - s + 2, 'L', x + len / 2 + 2, y - s + 2,
    'L', x + len - s, y, 'L', x + len / 2 + 2, y + s - 2, 'L', x + len / 2 - 2, y + s - 2, 'Z'].join(' ');
  return <path d={d} fill={on ? SEG_ON : SEG_OFF} style={{ transition: 'fill 80ms' }} />;
}

function VertSeg({ x, y, len, on }: { x: number; y: number; len: number; on: boolean }) {
  const s = 4;
  const d = ['M', x, y + s, 'L', x - s + 2, y + len / 2 - 2, 'L', x - s + 2, y + len / 2 + 2,
    'L', x, y + len - s, 'L', x + s - 2, y + len / 2 + 2, 'L', x + s - 2, y + len / 2 - 2, 'Z'].join(' ');
  return <path d={d} fill={on ? SEG_ON : SEG_OFF} style={{ transition: 'fill 80ms' }} />;
}

export function BinCounter7SegShape({ gate, definition, isSelected, inputSignals, onPointerDown, onPortClick }: GateShapeProps) {
  const W = definition.width;
  const H = definition.height;
  const stroke = isSelected ? GATE_SELECTED_STROKE : GATE_STROKE;
  const count = Math.max(0, Math.min(15, (gate.customState?.count as number) ?? 0));
  const [a, b, c, d, e, f, g] = HEX_TABLE[count];

  // 7-seg display centered in gate
  const ox = Math.floor((W - 52) / 2);
  const oy = 18;
  const sw = 38;
  const sh = 68;
  const vs = sh / 2 - 3;

  return (
    <g onPointerDown={(e) => onPointerDown(e, gate.id)} style={{ cursor: 'grab' }}>
      <rect x={0} y={0} width={W} height={H} rx={6} fill="#0a1628" stroke={stroke} strokeWidth={isSelected ? 2 : 1.5} />

      {/* Display background */}
      <rect x={ox - 6} y={oy - 6} width={sw + 20} height={sh + 12} rx={4} fill="#060d1a" />

      {/* Segments */}
      {/* a: top */}
      <HorizSeg x={ox + 3} y={oy}      len={sw} on={a} />
      {/* b: top-right */}
      <VertSeg  x={ox + sw} y={oy + 3}     len={vs} on={b} />
      {/* c: bottom-right */}
      <VertSeg  x={ox + sw} y={oy + sh / 2 + 3} len={vs} on={c} />
      {/* d: bottom */}
      <HorizSeg x={ox + 3} y={oy + sh}   len={sw} on={d} />
      {/* e: bottom-left */}
      <VertSeg  x={ox} y={oy + sh / 2 + 3}   len={vs} on={e} />
      {/* f: top-left */}
      <VertSeg  x={ox} y={oy + 3}        len={vs} on={f} />
      {/* g: middle */}
      <HorizSeg x={ox + 3} y={oy + sh / 2} len={sw} on={g} />

      {/* Count label below display */}
      <text x={W / 2} y={oy + sh + 22} textAnchor="middle" fontSize={9} fill="#475569" fontFamily="monospace" pointerEvents="none">
        BIN-CTR  {count}
      </text>

      {/* Port labels */}
      <text x={8}   y={H * 0.25 + 3} fontSize={10} fill="#64748b" fontFamily="monospace" pointerEvents="none">CLK</text>
      <text x={8}   y={H * 0.50 + 3} fontSize={10} fill="#64748b" fontFamily="monospace" pointerEvents="none">RST</text>
      <text x={8}   y={H * 0.75 + 3} fontSize={10} fill="#64748b" fontFamily="monospace" pointerEvents="none">EN</text>
      <text x={W - 8} y={H * 0.30 + 3} textAnchor="end" fontSize={10} fill="#64748b" fontFamily="monospace" pointerEvents="none">Q0</text>
      <text x={W - 8} y={H * 0.43 + 3} textAnchor="end" fontSize={10} fill="#64748b" fontFamily="monospace" pointerEvents="none">Q1</text>
      <text x={W - 8} y={H * 0.57 + 3} textAnchor="end" fontSize={10} fill="#64748b" fontFamily="monospace" pointerEvents="none">Q2</text>
      <text x={W - 8} y={H * 0.70 + 3} textAnchor="end" fontSize={10} fill="#64748b" fontFamily="monospace" pointerEvents="none">Q3</text>
      <text x={W - 8} y={H * 0.85 + 3} textAnchor="end" fontSize={10} fill="#facc15" fontFamily="monospace" pointerEvents="none">RCO</text>

      <PortDots gate={gate} definition={definition} inputSignals={inputSignals} onPortClick={onPortClick} showLabels={false} />
    </g>
  );
}
