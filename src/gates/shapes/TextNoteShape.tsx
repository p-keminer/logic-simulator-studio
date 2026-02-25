import type { GateShapeProps } from '../../core/types';

export function TextNoteShape({ gate, isSelected, onPointerDown }: GateShapeProps) {
  const text = (gate.customState?.text as string) ?? 'Notiz (Doppelklick)';
  const lines = text.split('\n');
  const W = Math.max(120, lines.reduce((m, l) => Math.max(m, l.length * 7), 0) + 20);
  const H = Math.max(40, lines.length * 18 + 16);

  return (
    <g onPointerDown={(e) => onPointerDown(e, gate.id)} style={{ cursor: 'grab' }}>
      <rect
        x={0} y={0} width={W} height={H}
        rx={4}
        fill="#1e1a00"
        stroke={isSelected ? '#facc15' : '#854d0e'}
        strokeWidth={isSelected ? 2 : 1}
        strokeDasharray={isSelected ? undefined : '4 3'}
        opacity={0.9}
      />
      {lines.map((line, i) => (
        <text
          key={i}
          x={10}
          y={20 + i * 18}
          fontSize={12}
          fill="#fde68a"
          fontFamily="monospace"
          pointerEvents="none"
        >
          {line || ' '}
        </text>
      ))}
    </g>
  );
}
