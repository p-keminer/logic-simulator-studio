
import { GRID_SIZE, CANVAS_WIDTH, CANVAS_HEIGHT } from '../../utils/constants';

interface Props {
  panX: number;
  panY: number;
  zoom: number;
}

export function CanvasBackground({ panX, panY, zoom }: Props) {
  const dotColor = '#1e293b';
  const gridId = 'grid-pattern';

  return (
    <g style={{ pointerEvents: 'none' }}>
      <defs>
        <pattern
          id={gridId}
          x={(-panX * zoom) % (GRID_SIZE)}
          y={(-panY * zoom) % (GRID_SIZE)}
          width={GRID_SIZE}
          height={GRID_SIZE}
          patternUnits="userSpaceOnUse"
        >
          <circle cx={GRID_SIZE / 2} cy={GRID_SIZE / 2} r={0.8} fill={dotColor} />
        </pattern>
      </defs>
      <rect
        x={panX}
        y={panY}
        width={CANVAS_WIDTH / zoom + GRID_SIZE * 2}
        height={CANVAS_HEIGHT / zoom + GRID_SIZE * 2}
        fill={`url(#${gridId})`}
      />
    </g>
  );
}
