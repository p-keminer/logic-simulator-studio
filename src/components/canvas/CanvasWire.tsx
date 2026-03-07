import { useRef } from 'react';
import type React from 'react';
import type { Wire } from '../../core/types';
import { useCircuitContext } from '../../store/CircuitContext';
import { computeWirePath } from '../../utils/geometry';
import { SIGNAL_HIGH_COLOR, SIGNAL_LOW_COLOR, SIGNAL_UNKNOWN_COLOR } from '../../utils/constants';
import { screenToSVG } from '../../hooks/useViewport';

interface Props {
  wire: Wire;
  onContextMenu: (wireId: string, e: React.MouseEvent) => void;
  onWaypointContextMenu: (wireId: string, index: number, e: React.MouseEvent) => void;
}

export function CanvasWire({ wire, onContextMenu, onWaypointContextMenu }: Props) {
  const { circuit, dispatch, raceNetIds } = useCircuitContext();
  const dragIndex = useRef<number | null>(null);

  const fromGate = circuit.gates[wire.from.gateId];
  const toGate   = circuit.gates[wire.to.gateId];
  if (!fromGate || !toGate) return null;

  const pathData = computeWirePath(wire, fromGate, toGate);
  const isHigh   = wire.signal.value === 1;
  const isHiZ    = wire.signal.value === 2;

  // Race condition: override wire color based on severity of the worst race on this net.
  const netId = `${wire.from.gateId}:${wire.from.portId}`;
  const raceSeverity = raceNetIds.get(netId);
  const isRace = raceSeverity !== undefined;

  // Severity → wire colour mapping (matches RacePanel badge colours).
  const RACE_COLORS: Record<string, string> = {
    critical: '#ef4444', // red
    warning:  '#f59e0b', // amber
    glitch:   '#f97316', // orange
    timing:   '#a855f7', // purple
    loop:     '#ec4899', // pink
  };
  const raceColor = raceSeverity ? (RACE_COLORS[raceSeverity] ?? '#ef4444') : '#ef4444';

  const strokeColor = isRace ? raceColor : (wire.color || (isHiZ ? SIGNAL_UNKNOWN_COLOR : isHigh ? SIGNAL_HIGH_COLOR : SIGNAL_LOW_COLOR));
  const pulseKey    = `${wire.id}-${wire.signal.version}`;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      dispatch({ type: 'WIRE_DELETE', payload: { wireId: wire.id } });
    } else {
      dispatch({ type: 'WIRE_SELECT', payload: { wireId: wire.id } });
    }
  };

  // ─── Waypoint drag handlers ────────────────────────────────────────────────
  const onWpPointerDown = (e: React.PointerEvent<SVGCircleElement>, index: number) => {
    e.stopPropagation();
    dragIndex.current = index;
    (e.currentTarget as SVGCircleElement).setPointerCapture(e.pointerId);
  };

  const onWpPointerMove = (e: React.PointerEvent<SVGCircleElement>) => {
    if (dragIndex.current === null) return;
    const svg = (e.currentTarget as SVGElement).ownerSVGElement;
    if (!svg) return;
    const { x, y } = screenToSVG(svg, e.clientX, e.clientY);
    dispatch({
      type: 'WIRE_MOVE_WAYPOINT',
      payload: { wireId: wire.id, index: dragIndex.current, x, y },
    });
  };

  const onWpPointerUp = () => {
    dragIndex.current = null;
  };

  const onWpContextMenu = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    onWaypointContextMenu(wire.id, index, e);
  };

  return (
    <g data-wire-id={wire.id}>
      {/* Wide transparent hit-area for clicks / context-menu */}
      <path
        d={pathData}
        stroke="transparent"
        strokeWidth={14}
        fill="none"
        style={{ cursor: 'pointer' }}
        onClick={handleClick}
        onContextMenu={(e) => onContextMenu(wire.id, e)}
      />

      {/* Visible wire */}
      <path
        d={pathData}
        stroke={wire.isSelected ? '#60a5fa' : strokeColor}
        strokeWidth={isRace ? 2.5 : (isHigh ? 2.5 : 1.5)}
        fill="none"
        strokeLinecap="round"
        filter={isHigh && !wire.color && !isRace ? 'url(#glow-green)' : undefined}
        style={{ transition: 'stroke 200ms ease, stroke-width 200ms ease', pointerEvents: 'none' }}
      />

      {/* Signal-change pulse animation */}
      {wire.signal.version > 0 && (
        <path
          key={pulseKey}
          d={pathData}
          stroke={isHigh ? '#86efac' : '#94a3b8'}
          strokeWidth={5}
          fill="none"
          strokeLinecap="round"
          style={{ animation: 'wire-pulse 500ms ease-out forwards', pointerEvents: 'none' }}
        />
      )}

      {/* Draggable waypoint dots */}
      {wire.waypoints?.map((wp, i) => (
        <circle
          key={i}
          cx={wp.x}
          cy={wp.y}
          r={5}
          fill={strokeColor}
          stroke="#0f172a"
          strokeWidth={1.5}
          opacity={0.9}
          style={{ cursor: 'move' }}
          onPointerDown={(e) => onWpPointerDown(e, i)}
          onPointerMove={onWpPointerMove}
          onPointerUp={onWpPointerUp}
          onContextMenu={(e) => onWpContextMenu(e, i)}
        />
      ))}
    </g>
  );
}
