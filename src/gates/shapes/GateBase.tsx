import React from 'react';
import type { GateShapeProps } from '../../core/types';
import {
  GATE_BODY_FILL,
  GATE_STROKE,
  GATE_SELECTED_STROKE,
  SIGNAL_HIGH_COLOR,
  SIGNAL_LOW_COLOR,
  PORT_RADIUS,
  GATE_LABEL_COLOR,
} from '../../utils/constants';

interface PortDotsProps {
  gate: GateShapeProps['gate'];
  definition: GateShapeProps['definition'];
  inputSignals: GateShapeProps['inputSignals'];
  onPortClick: GateShapeProps['onPortClick'];
  /** Set to false in shapes that already render their own port labels */
  showLabels?: boolean;
}

export function PortDots({ gate, definition, inputSignals, onPortClick, showLabels = true }: PortDotsProps) {
  return (
    <>
      {definition.inputs.map((p) => {
        const x = p.relativeX * definition.width;
        const y = p.relativeY * definition.height;
        const sig = inputSignals[p.id];
        const isHigh = sig?.value === 1;
        const color = isHigh ? SIGNAL_HIGH_COLOR : SIGNAL_LOW_COLOR;
        const isLeft = p.relativeX <= 0.5;
        const labelX = isLeft ? x + PORT_RADIUS + 4 : x - PORT_RADIUS - 4;
        const anchor: 'start' | 'end' = isLeft ? 'start' : 'end';
        return (
          <React.Fragment key={p.id}>
            <circle
              cx={x}
              cy={y}
              r={PORT_RADIUS}
              fill={color}
              stroke="#0f172a"
              strokeWidth={1.5}
              style={{ cursor: 'crosshair', transition: 'fill 200ms ease' }}
              onClick={(e) => onPortClick(e, { gateId: gate.id, portId: p.id })}
              data-port={p.id}
              data-direction="input"
            />
            {showLabels && p.label && (
              <text
                x={labelX} y={y + 3.5}
                fontSize={9} fill={GATE_LABEL_COLOR}
                fontFamily="monospace" textAnchor={anchor} pointerEvents="none"
              >{p.label}</text>
            )}
          </React.Fragment>
        );
      })}
      {definition.outputs.map((p) => {
        const x = p.relativeX * definition.width;
        const y = p.relativeY * definition.height;
        const sig = gate.outputSignals[p.id];
        const isHigh = sig?.value === 1;
        const color = isHigh ? SIGNAL_HIGH_COLOR : SIGNAL_LOW_COLOR;
        const isRight = p.relativeX >= 0.5;
        const labelX = isRight ? x - PORT_RADIUS - 4 : x + PORT_RADIUS + 4;
        const anchor: 'start' | 'end' = isRight ? 'end' : 'start';
        return (
          <React.Fragment key={p.id}>
            <circle
              cx={x}
              cy={y}
              r={PORT_RADIUS}
              fill={color}
              stroke="#0f172a"
              strokeWidth={1.5}
              style={{ cursor: 'crosshair', transition: 'fill 200ms ease' }}
              onClick={(e) => onPortClick(e, { gateId: gate.id, portId: p.id })}
              data-port={p.id}
              data-direction="output"
            />
            {showLabels && p.label && (
              <text
                x={labelX} y={y + 3.5}
                fontSize={9} fill={GATE_LABEL_COLOR}
                fontFamily="monospace" textAnchor={anchor} pointerEvents="none"
              >{p.label}</text>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}

/** Shared gate body wrapper */
export function GateBody({
  children,
  isSelected,
  onPointerDown,
  gate,
}: {
  children: React.ReactNode;
  isSelected: boolean;
  onPointerDown: GateShapeProps['onPointerDown'];
  gate: GateShapeProps['gate'];
}) {
  return (
    <g
      onPointerDown={(e) => onPointerDown(e, gate.id)}
      style={{ cursor: 'grab' }}
    >
      {children}
      {isSelected && (
        <rect
          x={-4}
          y={-4}
          width={999}
          height={999}
          fill="none"
          stroke={GATE_SELECTED_STROKE}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          rx={2}
          style={{ pointerEvents: 'none' }}
        />
      )}
    </g>
  );
}

export { GATE_BODY_FILL, GATE_STROKE, GATE_SELECTED_STROKE };
