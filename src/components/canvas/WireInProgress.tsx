import { useEffect, useState } from 'react';
import type React from 'react';
import { useCircuitContext } from '../../store/CircuitContext';
import { screenToSVG } from '../../hooks/useViewport';
import { computeInProgressWirePath, findPortAt, getPortPosition } from '../../utils/geometry';
import { SIGNAL_HIGH_COLOR } from '../../utils/constants';

const SNAP_RADIUS = 40; // px in SVG world coords

interface Props {
  from: { gateId: string; portId: string };
  waypoints: Array<{ x: number; y: number }>;
  mouseX: number;
  mouseY: number;
  svgRef: React.RefObject<SVGSVGElement | null>;
  snapMode: boolean;
}

export function WireInProgress({ from, waypoints, mouseX, mouseY, svgRef, snapMode }: Props) {
  const { circuit } = useCircuitContext();
  const [svgElement, setSvgElement] = useState<SVGSVGElement | null>(null);

  useEffect(() => {
    setSvgElement(svgRef.current);
  }, [svgRef]);

  const fromGate = circuit.gates[from.gateId];
  if (!fromGate || !svgElement) return null;

  const { x: svgX, y: svgY } = screenToSVG(svgElement, mouseX, mouseY);

  let endX = svgX;
  let endY = svgY;
  let snapPos: { x: number; y: number } | null = null;

  if (snapMode) {
    const found = findPortAt(svgX, svgY, circuit, SNAP_RADIUS);
    if (found && found.direction === 'input' && found.gateId !== from.gateId) {
      const targetGate = circuit.gates[found.gateId];
      if (targetGate) {
        const pos = getPortPosition(targetGate, found.portId, 'input');
        endX = pos.x;
        endY = pos.y;
        snapPos = pos;
      }
    }
  }

  const pathData = computeInProgressWirePath(fromGate, from.portId, endX, endY, waypoints);
  const wireColor = snapPos ? '#facc15' : SIGNAL_HIGH_COLOR;

  return (
    <g style={{ pointerEvents: 'none' }}>
      <path
        d={pathData}
        stroke={wireColor}
        strokeWidth={2}
        fill="none"
        strokeDasharray="6 4"
        strokeLinecap="round"
        opacity={0.8}
        style={{ animation: 'dash-flow 1s linear infinite' }}
      />
      {/* Snap-to-port highlight ring */}
      {snapPos && (
        <>
          <circle cx={snapPos.x} cy={snapPos.y} r={12}
            fill="rgba(250,204,21,0.12)" stroke="#facc15" strokeWidth={2} strokeDasharray="3 2" />
          <circle cx={snapPos.x} cy={snapPos.y} r={5}
            fill="#facc15" opacity={0.9} />
        </>
      )}
      {/* Waypoint dots */}
      {waypoints.map((wp, i) => (
        <circle key={i} cx={wp.x} cy={wp.y} r={4} fill={SIGNAL_HIGH_COLOR} opacity={0.8} />
      ))}
    </g>
  );
}
