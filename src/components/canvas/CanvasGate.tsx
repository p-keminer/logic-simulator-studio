import React from 'react';
import { gateRegistry } from '../../core/registry/GateRegistry';
import { useCircuitContext } from '../../store/CircuitContext';
import { resolveInputSignals } from '../../utils/geometry';
import type { GateInstance, WireEndpoint } from '../../core/types';

interface Props {
  gate: GateInstance;
  onGatePointerDown: (e: React.PointerEvent, gateId: string) => void;
  onPortClick: (e: React.MouseEvent, endpoint: WireEndpoint) => void;
  onGateContextMenu: (gateId: string, e: React.MouseEvent) => void;
}

export function CanvasGate({ gate, onGatePointerDown, onPortClick, onGateContextMenu }: Props) {
  const { dispatch } = useCircuitContext();
  const { circuit } = useCircuitContext();
  const definition = gateRegistry.get(gate.typeId);
  const inputSignals = resolveInputSignals(gate.id, circuit);
  const ShapeComponent = definition.shapeComponent;

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (gate.typeId === 'INPUT_SWITCH') {
      dispatch({ type: 'GATE_TOGGLE_SWITCH', payload: { gateId: gate.id } });
    } else if (gate.typeId === 'PUSH_BTN') {
      dispatch({ type: 'GATE_BTN_PULSE', payload: { gateId: gate.id } });
    } else if (gate.typeId === 'TEXT_NOTE') {
      const current = (gate.customState?.text as string) ?? '';
      const next = window.prompt('Notiztext:', current);
      if (next !== null) dispatch({ type: 'GATE_SET_TEXT', payload: { gateId: gate.id, text: next } });
    } else {
      const current = gate.label ?? '';
      const next = window.prompt('Instanzname (für HDL):', current);
      if (next !== null) dispatch({ type: 'GATE_SET_LABEL', payload: { gateId: gate.id, label: next } });
    }
  };

  const cx = definition.width / 2;
  const cy = definition.height / 2;
  const rotation = gate.rotation ?? 0;

  return (
    <g
      transform={`translate(${gate.x}, ${gate.y})${rotation !== 0 ? ` rotate(${rotation}, ${cx}, ${cy})` : ''}`}
      data-gate-id={gate.id}
      onDoubleClick={handleDoubleClick}
      onContextMenu={(e) => onGateContextMenu(gate.id, e)}
    >
      <ShapeComponent
        gate={gate}
        definition={definition}
        isSelected={gate.isSelected}
        inputSignals={inputSignals}
        onPointerDown={onGatePointerDown}
        onPortClick={onPortClick}
      />
      {gate.label && (
        <text
          x={cx}
          y={definition.height + 14}
          textAnchor="middle"
          fontSize={10}
          fill="#94a3b8"
          pointerEvents="none"
          fontFamily="monospace"
          transform={rotation !== 0 ? `rotate(${-rotation}, ${cx}, ${definition.height + 14})` : undefined}
        >
          {gate.label}
        </text>
      )}
    </g>
  );
}