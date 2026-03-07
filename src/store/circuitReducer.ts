import type { Circuit, GateInstance, SignalState, Wire } from '../core/types';
import type { CircuitAction } from './actions';
import { gateRegistry } from '../core/registry/GateRegistry';
import { generateId } from '../utils/idGenerator';
import { GRID_SIZE, MIN_ZOOM, MAX_ZOOM } from '../utils/constants';

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function makeInitialSignal(): SignalState {
  return { value: 0, version: 0, lastChangedAt: 0 };
}

export function createEmptyCircuit(): Circuit {
  return {
    id: generateId(),
    name: 'Unbenannte Schaltung',
    version: '1.0.0',
    gates: {},
    wires: {},
    viewport: { panX: 0, panY: 0, zoom: 1.5 },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

export function circuitReducer(state: Circuit, action: CircuitAction): Circuit {
  switch (action.type) {
    case 'GATE_ADD': {
      const { typeId, x, y } = action.payload;
      const def = gateRegistry.get(typeId);
      const id = generateId();

      const outputSignals: GateInstance['outputSignals'] = {};
      for (const output of def.outputs) {
        outputSignals[output.id] = makeInitialSignal();
      }

      const newGate: GateInstance = {
        id,
        typeId,
        x: snapToGrid(x - def.width / 2),
        y: snapToGrid(y - def.height / 2),
        outputSignals,
        isSelected: false,
      };

      return { ...state, gates: { ...state.gates, [id]: newGate } };
    }

    case 'GATE_MOVE': {
      const { gateId, dx, dy } = action.payload;
      const gate = state.gates[gateId];
      if (!gate) return state;
      return {
        ...state,
        gates: {
          ...state.gates,
          [gateId]: {
            ...gate,
            x: snapToGrid(gate.x + dx),
            y: snapToGrid(gate.y + dy),
          },
        },
      };
    }

    case 'GATE_MOVE_TO': {
      const { gateId, x, y } = action.payload;
      const gate = state.gates[gateId];
      if (!gate) return state;
      return {
        ...state,
        gates: {
          ...state.gates,
          [gateId]: { ...gate, x: snapToGrid(x), y: snapToGrid(y) },
        },
      };
    }

    case 'GATE_DELETE': {
      const { gateId } = action.payload;
      const newGates = { ...state.gates };
      delete newGates[gateId];
      const newWires = Object.fromEntries(
        Object.entries(state.wires).filter(
          ([, w]) => w.from.gateId !== gateId && w.to.gateId !== gateId
        )
      );
      return { ...state, gates: newGates, wires: newWires };
    }

    case 'GATES_SELECT_SET': {
      const { gateIds } = action.payload;
      const selSet = new Set(gateIds);
      return {
        ...state,
        gates: Object.fromEntries(
          Object.entries(state.gates).map(([id, g]) => [id, { ...g, isSelected: selSet.has(id) }])
        ),
      };
    }

    case 'GATE_SELECT': {
      const { gateId, multi } = action.payload;
      const updatedGates = { ...state.gates };
      if (!multi) {
        for (const id of Object.keys(updatedGates)) {
          updatedGates[id] = { ...updatedGates[id], isSelected: id === gateId };
        }
      } else {
        const gate = updatedGates[gateId];
        if (gate) updatedGates[gateId] = { ...gate, isSelected: !gate.isSelected };
      }
      return { ...state, gates: updatedGates };
    }

    case 'GATE_TOGGLE_SWITCH': {
      const { gateId } = action.payload;
      const gate = state.gates[gateId];
      if (!gate || gate.typeId !== 'INPUT_SWITCH') return state;
      const current = (gate.customState?.value as 0 | 1) ?? 0;
      return {
        ...state,
        gates: {
          ...state.gates,
          [gateId]: {
            ...gate,
            customState: { ...gate.customState, value: (current ^ 1) as 0 | 1 },
          },
        },
      };
    }

    case 'GATE_BTN_PULSE': {
      const { gateId } = action.payload;
      const gate = state.gates[gateId];
      if (!gate || gate.typeId !== 'PUSH_BTN') return state;
      return {
        ...state,
        gates: {
          ...state.gates,
          [gateId]: { ...gate, customState: { ...gate.customState, value: 1 as 0 | 1 } },
        },
      };
    }

    case 'GATE_BTN_RELEASE': {
      const { gateId } = action.payload;
      const gate = state.gates[gateId];
      if (!gate || gate.typeId !== 'PUSH_BTN') return state;
      return {
        ...state,
        gates: {
          ...state.gates,
          [gateId]: { ...gate, customState: { ...gate.customState, value: 0 as 0 | 1 } },
        },
      };
    }

    case 'GATE_ROM_LOAD': {
      const { gateId, data } = action.payload;
      const gate = state.gates[gateId];
      if (!gate || gate.typeId !== 'ROM256') return state;
      return {
        ...state,
        gates: {
          ...state.gates,
          [gateId]: {
            ...gate,
            customState: { ...gate.customState, data: data.slice(0, 256) },
          },
        },
      };
    }

    case 'GATE_CLOCK_TICK': {
      const { gateId } = action.payload;
      const gate = state.gates[gateId];
      if (!gate || gate.typeId !== 'CLOCK') return state;
      const current = (gate.customState?.value as 0 | 1) ?? 0;
      return {
        ...state,
        gates: {
          ...state.gates,
          [gateId]: {
            ...gate,
            customState: { ...gate.customState, value: (current ^ 1) as 0 | 1 },
          },
        },
      };
    }

    case 'GATE_SET_LABEL': {
      const { gateId, label } = action.payload;
      const gate = state.gates[gateId];
      if (!gate) return state;
      return {
        ...state,
        gates: { ...state.gates, [gateId]: { ...gate, label } },
      };
    }

    case 'GATE_SET_TEXT': {
      const { gateId, text } = action.payload as { gateId: string; text: string };
      const gate = state.gates[gateId];
      if (!gate) return state;
      return {
        ...state,
        gates: {
          ...state.gates,
          [gateId]: { ...gate, customState: { ...gate.customState, text } },
        },
      };
    }

    case 'GATE_ROTATE': {
      const { gateId } = action.payload;
      const gate = state.gates[gateId];
      if (!gate) return state;
      const current = (gate.rotation ?? 0);
      return {
        ...state,
        gates: {
          ...state.gates,
          [gateId]: { ...gate, rotation: (current + 90) % 360 },
        },
      };
    }

    case 'GATE_SET_FREQ': {
      const { gateId, frequency } = action.payload;
      const gate = state.gates[gateId];
      if (!gate || gate.typeId !== 'CLOCK') return state;
      return {
        ...state,
        gates: {
          ...state.gates,
          [gateId]: { ...gate, customState: { ...gate.customState, frequency } },
        },
      };
    }

    case 'GATE_SET_LED_COLOR': {
      const { gateId, color } = action.payload;
      const gate = state.gates[gateId];
      if (!gate) return state;
      return {
        ...state,
        gates: {
          ...state.gates,
          [gateId]: { ...gate, customState: { ...gate.customState, ledColor: color } },
        },
      };
    }

    case 'WIRE_ADD': {
      const { from, to, waypoints } = action.payload;
      if (from.gateId === to.gateId) return state;

      const alreadyConnected = Object.values(state.wires).some(
        (w) => w.to.gateId === to.gateId && w.to.portId === to.portId
      );
      if (alreadyConnected) return state;

      const newWire: Wire = {
        id: generateId(),
        from,
        to,
        signal: makeInitialSignal(),
        waypoints: waypoints && waypoints.length > 0 ? waypoints : undefined,
        isSelected: false,
      };
      return { ...state, wires: { ...state.wires, [newWire.id]: newWire } };
    }

    case 'WIRE_DELETE': {
      const newWires = { ...state.wires };
      delete newWires[action.payload.wireId];
      return { ...state, wires: newWires };
    }

    case 'WIRE_SELECT': {
      const updatedWires = { ...state.wires };
      for (const id of Object.keys(updatedWires)) {
        updatedWires[id] = { ...updatedWires[id], isSelected: id === action.payload.wireId };
      }
      return { ...state, wires: updatedWires };
    }

    case 'WIRE_SET_COLOR': {
      const { wireId, color } = action.payload;
      const wire = state.wires[wireId];
      if (!wire) return state;
      return {
        ...state,
        wires: { ...state.wires, [wireId]: { ...wire, color } },
      };
    }

    case 'WIRE_SET_WAYPOINTS': {
      const { wireId, waypoints } = action.payload;
      const wire = state.wires[wireId];
      if (!wire) return state;
      return {
        ...state,
        wires: { ...state.wires, [wireId]: { ...wire, waypoints } },
      };
    }

    case 'WIRE_MOVE_WAYPOINT': {
      const { wireId, index, x, y } = action.payload;
      const wire = state.wires[wireId];
      if (!wire || !wire.waypoints) return state;
      const pts = [...wire.waypoints];
      pts[index] = { x: snapToGrid(x), y: snapToGrid(y) };
      return {
        ...state,
        wires: { ...state.wires, [wireId]: { ...wire, waypoints: pts } },
      };
    }

    case 'WIRE_REMOVE_WAYPOINT': {
      const { wireId, index } = action.payload;
      const wire = state.wires[wireId];
      if (!wire || !wire.waypoints) return state;
      const pts = wire.waypoints.filter((_, i) => i !== index);
      return {
        ...state,
        wires: {
          ...state.wires,
          [wireId]: { ...wire, waypoints: pts.length > 0 ? pts : undefined },
        },
      };
    }

    case 'WIRE_INSERT_JUNCTION': {
      const { wireId, x, y } = action.payload;
      const wire = state.wires[wireId];
      if (!wire) return state;

      // Build junction gate
      const juncId = generateId();
      const def = gateRegistry.get('JUNCTION');
      const jx = snapToGrid(x - def.width / 2);
      const jy = snapToGrid(y - def.height / 2);
      const outputSignals: GateInstance['outputSignals'] = {};
      for (const output of def.outputs) {
        outputSignals[output.id] = makeInitialSignal();
      }
      const juncGate: GateInstance = {
        id: juncId,
        typeId: 'JUNCTION',
        x: jx,
        y: jy,
        outputSignals,
        isSelected: false,
      };

      // Split waypoints: determine which waypoints come before/after the junction
      // by finding the nearest segment along the polyline path.
      const wps = wire.waypoints ?? [];
      let splitIdx = wps.length; // default: all waypoints go to wire1
      if (wps.length > 0) {
        // Find closest segment to the junction point (x, y)
        // The path is: [from_port] → wp[0] → wp[1] → ... → [to_port]
        // We only need waypoint indices, not from/to port coords
        // Segment i connects wp[i-1] to wp[i] (with virtual wp[-1]=from_port, wp[n]=to_port)
        // Since we don't have from/to port coords in the reducer, we approximate:
        // check each consecutive pair of waypoints and find the closest segment.
        let bestDist = Infinity;
        for (let i = 0; i <= wps.length; i++) {
          // Segment from A to B
          const A = i === 0 ? null : wps[i - 1]; // null = from_port (unknown exact pos)
          const B = i < wps.length ? wps[i] : null; // null = to_port (unknown exact pos)
          if (!A && !B) continue;
          // For segments touching unknown endpoints, use simple distance to the known point
          if (!A) {
            const d = Math.hypot(B!.x - x, B!.y - y);
            if (d < bestDist) { bestDist = d; splitIdx = i; }
            continue;
          }
          if (!B) {
            const d = Math.hypot(A.x - x, A.y - y);
            if (d < bestDist) { bestDist = d; splitIdx = i; }
            continue;
          }
          // Point-to-segment distance
          const dx = B.x - A.x, dy = B.y - A.y;
          const len2 = dx * dx + dy * dy;
          const t = len2 > 0 ? Math.max(0, Math.min(1, ((x - A.x) * dx + (y - A.y) * dy) / len2)) : 0;
          const px = A.x + t * dx, py = A.y + t * dy;
          const d = Math.hypot(px - x, py - y);
          if (d < bestDist) { bestDist = d; splitIdx = i; }
        }
      }
      const waypoints1 = wps.slice(0, splitIdx);
      const waypoints2 = wps.slice(splitIdx);

      // Split the wire: original → junction.in, junction.y0 → original target
      const wire1Id = generateId();
      const wire2Id = generateId();
      const wire1: Wire = {
        id: wire1Id,
        from: wire.from,
        to: { gateId: juncId, portId: 'in' },
        signal: makeInitialSignal(),
        color: wire.color,
        waypoints: waypoints1.length > 0 ? waypoints1 : undefined,
        isSelected: false,
      };
      const wire2: Wire = {
        id: wire2Id,
        from: { gateId: juncId, portId: 'y0' },
        to: wire.to,
        signal: makeInitialSignal(),
        color: wire.color,
        waypoints: waypoints2.length > 0 ? waypoints2 : undefined,
        isSelected: false,
      };

      const newWires = { ...state.wires };
      delete newWires[wireId];
      newWires[wire1Id] = wire1;
      newWires[wire2Id] = wire2;

      return {
        ...state,
        gates: { ...state.gates, [juncId]: juncGate },
        wires: newWires,
      };
    }

    case 'SIMULATION_APPLY': {
      const { gateSignals, wireSignals, customStateUpdates } = action.payload;
      const updatedGates = { ...state.gates };
      for (const [gateId, signals] of Object.entries(gateSignals)) {
        if (updatedGates[gateId]) {
          updatedGates[gateId] = { ...updatedGates[gateId], outputSignals: signals };
        }
      }
      // Apply stateful gate customState updates (flip-flops, registers)
      for (const [gateId, nextState] of Object.entries(customStateUpdates)) {
        if (updatedGates[gateId]) {
          updatedGates[gateId] = {
            ...updatedGates[gateId],
            customState: { ...updatedGates[gateId].customState, ...nextState },
          };
        }
      }
      const updatedWires = { ...state.wires };
      for (const [wireId, signal] of Object.entries(wireSignals)) {
        if (updatedWires[wireId]) {
          updatedWires[wireId] = { ...updatedWires[wireId], signal };
        }
      }
      return { ...state, gates: updatedGates, wires: updatedWires };
    }

    case 'VIEWPORT_PAN':
      return {
        ...state,
        viewport: {
          ...state.viewport,
          panX: state.viewport.panX - action.payload.dx / state.viewport.zoom,
          panY: state.viewport.panY - action.payload.dy / state.viewport.zoom,
        },
      };

    case 'VIEWPORT_ZOOM': {
      const { zoom, centerX, centerY } = action.payload;
      const oldZoom = state.viewport.zoom;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
      return {
        ...state,
        viewport: {
          zoom: newZoom,
          panX: centerX - (centerX - state.viewport.panX) * (oldZoom / newZoom),
          panY: centerY - (centerY - state.viewport.panY) * (oldZoom / newZoom),
        },
      };
    }

    case 'VIEWPORT_SET':
      return { ...state, viewport: action.payload };

    case 'CIRCUIT_LOAD':
      return action.payload.circuit;

    case 'CIRCUIT_RESET':
      return createEmptyCircuit();

    case 'SELECTION_CLEAR': {
      const clearedGates = Object.fromEntries(
        Object.entries(state.gates).map(([id, g]) => [id, { ...g, isSelected: false }])
      );
      const clearedWires = Object.fromEntries(
        Object.entries(state.wires).map(([id, w]) => [id, { ...w, isSelected: false }])
      );
      return { ...state, gates: clearedGates, wires: clearedWires };
    }

    case 'DELETE_SELECTED': {
      const selectedGateIds = new Set(
        Object.values(state.gates).filter((g) => g.isSelected).map((g) => g.id)
      );
      const selectedWireIds = new Set(
        Object.values(state.wires).filter((w) => w.isSelected).map((w) => w.id)
      );
      const newGates = Object.fromEntries(
        Object.entries(state.gates).filter(([id]) => !selectedGateIds.has(id))
      );
      const newWires = Object.fromEntries(
        Object.entries(state.wires).filter(
          ([id, w]) =>
            !selectedWireIds.has(id) &&
            !selectedGateIds.has(w.from.gateId) &&
            !selectedGateIds.has(w.to.gateId)
        )
      );
      return { ...state, gates: newGates, wires: newWires };
    }

    case 'GATE_SET_ADC_VALUE': {
      const { gateId, value } = action.payload;
      const gate = state.gates[gateId];
      if (!gate || gate.typeId !== 'ADC8') return state;
      const clamped = Math.max(0, Math.min(255, value));
      return {
        ...state,
        gates: {
          ...state.gates,
          [gateId]: { ...gate, customState: { ...gate.customState, value: clamped } },
        },
      };
    }

    case 'GATES_MOVE_STEP': {
      const { dx, dy } = action.payload;
      const updatedGates = { ...state.gates };
      for (const [id, gate] of Object.entries(updatedGates)) {
        if (gate.isSelected) {
          updatedGates[id] = {
            ...gate,
            x: snapToGrid(gate.x + dx),
            y: snapToGrid(gate.y + dy),
          };
        }
      }
      return { ...state, gates: updatedGates };
    }

    case 'GATES_PASTE': {
      const { gates: pastedGates, wires: pastedWires } = action.payload;
      // Deselect all existing
      const clearedGates = Object.fromEntries(
        Object.entries(state.gates).map(([id, g]) => [id, { ...g, isSelected: false }])
      );
      const clearedWires = Object.fromEntries(
        Object.entries(state.wires).map(([id, w]) => [id, { ...w, isSelected: false }])
      );
      // Insert pasted gates (already selected)
      const newGates = { ...clearedGates };
      for (const g of pastedGates) {
        newGates[g.id] = g;
      }
      // Insert pasted wires
      const newWires = { ...clearedWires };
      for (const w of pastedWires) {
        newWires[w.id] = w;
      }
      return { ...state, gates: newGates, wires: newWires };
    }

    default:
      return state;
  }
}
