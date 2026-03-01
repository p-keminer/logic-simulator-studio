import type { Circuit, GateInstance, SignalState, Wire, WireEndpoint } from '../core/types';
import { gateRegistry } from '../core/registry/GateRegistry';

/** Rotate a local port position around a gate's center, accounting for gate.rotation */
function rotateLocalPoint(
  localX: number,
  localY: number,
  width: number,
  height: number,
  rotationDeg: number
): { x: number; y: number } {
  if (rotationDeg === 0) return { x: localX, y: localY };
  const cx = width / 2;
  const cy = height / 2;
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = localX - cx;
  const dy = localY - cy;
  return {
    x: cx + cos * dx - sin * dy,
    y: cy + sin * dx + cos * dy,
  };
}

/** Convert absolute port position in world space */
export function getPortPosition(
  gate: GateInstance,
  portId: string,
  direction: 'input' | 'output'
): { x: number; y: number } {
  const def = gateRegistry.get(gate.typeId);
  const ports = direction === 'input' ? def.inputs : def.outputs;
  const portDef = ports.find((p) => p.id === portId);
  if (!portDef) return { x: gate.x, y: gate.y };

  const localX = portDef.relativeX * def.width;
  const localY = portDef.relativeY * def.height;
  const rotation = gate.rotation ?? 0;
  const rotated = rotateLocalPoint(localX, localY, def.width, def.height, rotation);

  return {
    x: gate.x + rotated.x,
    y: gate.y + rotated.y,
  };
}

/** Compute a cubic bezier SVG path between two ports */
export function computeWirePath(
  wire: Wire,
  fromGate: GateInstance,
  toGate: GateInstance
): string {
  const from = getPortPosition(fromGate, wire.from.portId, 'output');
  const to = getPortPosition(toGate, wire.to.portId, 'input');

  if (wire.waypoints && wire.waypoints.length > 0) {
    const points = [from, ...wire.waypoints, to];
    return 'M ' + points.map((p) => `${p.x} ${p.y}`).join(' L ');
  }

  const dx = Math.abs(to.x - from.x);
  const controlOffset = Math.max(40, dx * 0.5);
  return `M ${from.x} ${from.y} C ${from.x + controlOffset} ${from.y}, ${to.x - controlOffset} ${to.y}, ${to.x} ${to.y}`;
}

/** Compute path for a wire in progress (to mouse position), with optional waypoints */
export function computeInProgressWirePath(
  fromGate: GateInstance,
  fromPortId: string,
  toX: number,
  toY: number,
  waypoints?: Array<{ x: number; y: number }>
): string {
  const from = getPortPosition(fromGate, fromPortId, 'output');

  if (waypoints && waypoints.length > 0) {
    const points = [from, ...waypoints, { x: toX, y: toY }];
    return 'M ' + points.map((p) => `${p.x} ${p.y}`).join(' L ');
  }

  const dx = Math.abs(toX - from.x);
  const controlOffset = Math.max(40, dx * 0.5);
  return `M ${from.x} ${from.y} C ${from.x + controlOffset} ${from.y}, ${toX - controlOffset} ${toY}, ${toX} ${toY}`;
}

/** Resolve input signals for a gate by tracing back through connected wires.
 *  Pass `portToWireIdMap` (from CircuitContext) for O(1) lookup; omit for
 *  the O(Ports×Wires) fallback (used outside of React render paths). */
export function resolveInputSignals(
  gateId: string,
  circuit: Circuit,
  portToWireIdMap?: ReadonlyMap<string, string>
): Record<string, SignalState> {
  const gate = circuit.gates[gateId];
  if (!gate) return {};

  const def = gateRegistry.get(gate.typeId);
  const result: Record<string, SignalState> = {};
  const defaultSignal: SignalState = { value: 0, version: 0, lastChangedAt: 0 };

  for (const inputPort of def.inputs) {
    if (portToWireIdMap) {
      const wireId = portToWireIdMap.get(`${gateId}:${inputPort.id}`);
      result[inputPort.id] = wireId
        ? (circuit.wires[wireId]?.signal ?? defaultSignal)
        : defaultSignal;
    } else {
      const wire = Object.values(circuit.wires).find(
        (w) => w.to.gateId === gateId && w.to.portId === inputPort.id
      );
      result[inputPort.id] = wire ? wire.signal : defaultSignal;
    }
  }

  return result;
}

/** Check if a point is near a port (for hit testing) */
export function isNearPort(
  px: number,
  py: number,
  gate: GateInstance,
  portId: string,
  direction: 'input' | 'output',
  radius: number
): boolean {
  const pos = getPortPosition(gate, portId, direction);
  const dx = px - pos.x;
  const dy = py - pos.y;
  return dx * dx + dy * dy <= radius * radius;
}

/** Find which port is at SVG coordinates, returns endpoint or null */
export function findPortAt(
  svgX: number,
  svgY: number,
  circuit: Circuit,
  radius: number
): (WireEndpoint & { direction: 'input' | 'output' }) | null {
  for (const gate of Object.values(circuit.gates)) {
    const def = gateRegistry.get(gate.typeId);
    for (const p of def.outputs) {
      if (isNearPort(svgX, svgY, gate, p.id, 'output', radius)) {
        return { gateId: gate.id, portId: p.id, direction: 'output' };
      }
    }
    for (const p of def.inputs) {
      if (isNearPort(svgX, svgY, gate, p.id, 'input', radius)) {
        return { gateId: gate.id, portId: p.id, direction: 'input' };
      }
    }
  }
  return null;
}
