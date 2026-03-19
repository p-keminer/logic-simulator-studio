import type { Circuit, GateDefinition, GateInstance, Wire, WireEndpoint } from '../types';
import { gateRegistry } from '../registry/GateRegistry';

interface FlattenPlan {
  gate: GateInstance;
  definition: GateDefinition;
  idMap: Record<string, string>;
  inputFanout: Record<string, WireEndpoint[]>;
  inputDrivers: Record<string, WireEndpoint[]>;
  outputDrivers: Record<string, WireEndpoint>;
  outputPassthroughs: Record<string, string>;
}

function cloneJson<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function cloneGate(gate: GateInstance): GateInstance {
  return {
    ...gate,
    outputSignals: cloneJson(gate.outputSignals),
    customState: cloneJson(gate.customState),
  };
}

function cloneWire(wire: Wire): Wire {
  return {
    ...wire,
    from: { ...wire.from },
    to: { ...wire.to },
    signal: { ...wire.signal },
    waypoints: cloneJson(wire.waypoints) ?? [],
  };
}

function buildFlattenPlan(gate: GateInstance, definition: GateDefinition): FlattenPlan {
  const meta = definition.customIC;
  if (!meta) {
    throw new Error(`Custom IC "${gate.typeId}" is missing export metadata.`);
  }

  const subcircuit = meta.subcircuit;
  const idMap: Record<string, string> = {};
  for (const [innerGateId, innerGate] of Object.entries(subcircuit.gates)) {
    if (innerGate.typeId === 'INPUT_SWITCH' || innerGate.typeId === 'OUTPUT_LED') continue;
    if (innerGate.typeId.startsWith('CIC_')) {
      throw new Error(`Nested custom IC "${innerGate.typeId}" inside "${gate.typeId}" is not supported for HDL export.`);
    }
    idMap[innerGateId] = `${gate.id}__${innerGateId}`;
  }

  const inputFanout: Record<string, WireEndpoint[]> = {};
  const inputPortsByGateId: Record<string, string> = {};
  for (let i = 0; i < meta.inputGateIds.length; i++) {
    const inputGateId = meta.inputGateIds[i];
    const portId = `i${i}`;
    inputPortsByGateId[inputGateId] = portId;
    inputFanout[portId] = Object.values(subcircuit.wires)
      .filter((wire) => wire.from.gateId === inputGateId && wire.from.portId === 'out')
      .map((wire) => ({ gateId: idMap[wire.to.gateId], portId: wire.to.portId }))
      .filter((endpoint) => endpoint.gateId !== undefined);
  }

  const outputDrivers: Record<string, WireEndpoint> = {};
  const outputPassthroughs: Record<string, string> = {};
  for (let i = 0; i < meta.outputGateIds.length; i++) {
    const outputGateId = meta.outputGateIds[i];
    const driver = Object.values(subcircuit.wires).find(
      (wire) => wire.to.gateId === outputGateId && wire.to.portId === 'in',
    );
    if (!driver) {
      throw new Error(`Custom IC "${gate.typeId}" output o${i} has no driven OUTPUT_LED in its subcircuit.`);
    }
    const passthroughPort = inputPortsByGateId[driver.from.gateId];
    if (passthroughPort) {
      outputPassthroughs[`o${i}`] = passthroughPort;
      continue;
    }

    const flattenedDriverGateId = idMap[driver.from.gateId];
    if (!flattenedDriverGateId) {
      throw new Error(
        `Custom IC "${gate.typeId}" output o${i} is driven by unsupported inner source "${driver.from.gateId}".`,
      );
    }
    outputDrivers[`o${i}`] = {
      gateId: flattenedDriverGateId,
      portId: driver.from.portId,
    };
  }

  return {
    gate,
    definition,
    idMap,
    inputFanout,
    inputDrivers: {},
    outputDrivers,
    outputPassthroughs,
  };
}

function isFlattenableCustomGate(gate: GateInstance): boolean {
  if (!gateRegistry.has(gate.typeId)) {
    return gate.typeId.startsWith('CIC_');
  }
  const definition = gateRegistry.get(gate.typeId);
  return definition.category === 'custom';
}

function expandSource(endpoint: WireEndpoint, plans: Map<string, FlattenPlan>): WireEndpoint[] {
  const plan = plans.get(endpoint.gateId);
  if (!plan) return [{ ...endpoint }];
  const passthroughPort = plan.outputPassthroughs[endpoint.portId];
  if (passthroughPort) {
    const drivers = plan.inputDrivers[passthroughPort];
    if (!drivers || drivers.length === 0) {
      throw new Error(
        `Custom IC "${plan.gate.typeId}" output "${endpoint.portId}" is a passthrough from unconnected input "${passthroughPort}".`,
      );
    }
    return drivers.flatMap((driver) => expandSource(driver, plans));
  }
  const driver = plan.outputDrivers[endpoint.portId];
  if (!driver) {
    throw new Error(`Custom IC "${plan.gate.typeId}" has no mapped export driver for port "${endpoint.portId}".`);
  }
  return [{ ...driver }];
}

function expandDest(endpoint: WireEndpoint, plans: Map<string, FlattenPlan>): WireEndpoint[] {
  const plan = plans.get(endpoint.gateId);
  if (!plan) return [{ ...endpoint }];
  const fanout = plan.inputFanout[endpoint.portId];
  if (!fanout) {
    throw new Error(`Custom IC "${plan.gate.typeId}" has no mapped import fanout for port "${endpoint.portId}".`);
  }
  return fanout.map((target) => ({ ...target }));
}

export function flattenCustomICs(circuit: Circuit): Circuit {
  const customGates = Object.values(circuit.gates).filter(isFlattenableCustomGate);
  if (customGates.length === 0) return circuit;

  for (const gate of customGates) {
    if (!gateRegistry.has(gate.typeId)) {
      throw new Error(`Custom IC "${gate.typeId}" is not registered. Reload saved custom ICs before exporting.`);
    }
  }

  const plans = new Map<string, FlattenPlan>();
  for (const gate of customGates) {
    const definition = gateRegistry.get(gate.typeId);
    plans.set(gate.id, buildFlattenPlan(gate, definition));
  }

  for (const wire of Object.values(circuit.wires)) {
    const plan = plans.get(wire.to.gateId);
    if (!plan) continue;
    if (!plan.inputDrivers[wire.to.portId]) {
      plan.inputDrivers[wire.to.portId] = [];
    }
    plan.inputDrivers[wire.to.portId].push({ ...wire.from });
  }

  const gates: Record<string, GateInstance> = {};
  for (const [gateId, gate] of Object.entries(circuit.gates)) {
    const plan = plans.get(gateId);
    if (!plan) {
      gates[gateId] = cloneGate(gate);
      continue;
    }

    const innerStates =
      (gate.customState?.innerStates as Record<string, Record<string, unknown>> | undefined) ?? {};
    const subcircuit = plan.definition.customIC!.subcircuit;
    for (const [innerGateId, innerGate] of Object.entries(subcircuit.gates)) {
      if (innerGate.typeId === 'INPUT_SWITCH' || innerGate.typeId === 'OUTPUT_LED') continue;
      const flattenedGate = cloneGate(innerGate);
      flattenedGate.id = plan.idMap[innerGateId];
      flattenedGate.customState = cloneJson(innerStates[innerGateId] ?? innerGate.customState);
      flattenedGate.isSelected = false;
      if (flattenedGate.label) {
        flattenedGate.label = `${gateId}_${flattenedGate.label}`;
      }
      gates[flattenedGate.id] = flattenedGate;
    }
  }

  const wires: Record<string, Wire> = {};
  let derivedWireCounter = 0;
  for (const [wireId, wire] of Object.entries(circuit.wires)) {
    const sourceEndpoints = expandSource(wire.from, plans);
    const destEndpoints = expandDest(wire.to, plans);
    if (sourceEndpoints.length === 0 || destEndpoints.length === 0) continue;

    let expansionIndex = 0;
    for (const source of sourceEndpoints) {
      for (const dest of destEndpoints) {
        const flattenedWire = cloneWire(wire);
        const needsDerivedId =
          source.gateId !== wire.from.gateId ||
          source.portId !== wire.from.portId ||
          dest.gateId !== wire.to.gateId ||
          dest.portId !== wire.to.portId ||
          sourceEndpoints.length > 1 ||
          destEndpoints.length > 1;
        flattenedWire.id = needsDerivedId
          ? `${wireId}__flat${derivedWireCounter++}_${expansionIndex++}`
          : wireId;
        flattenedWire.from = source;
        flattenedWire.to = dest;
        flattenedWire.waypoints = needsDerivedId ? [] : (flattenedWire.waypoints ?? []);
        wires[flattenedWire.id] = flattenedWire;
      }
    }
  }

  for (const plan of plans.values()) {
    const subcircuit = plan.definition.customIC!.subcircuit;
    for (const [innerWireId, innerWire] of Object.entries(subcircuit.wires)) {
      const fromGate = subcircuit.gates[innerWire.from.gateId];
      const toGate = subcircuit.gates[innerWire.to.gateId];
      if (!fromGate || !toGate) continue;
      if (fromGate.typeId === 'INPUT_SWITCH' || fromGate.typeId === 'OUTPUT_LED') continue;
      if (toGate.typeId === 'INPUT_SWITCH' || toGate.typeId === 'OUTPUT_LED') continue;

      const flattenedWire = cloneWire(innerWire);
      flattenedWire.id = `${plan.gate.id}__${innerWireId}`;
      flattenedWire.from = {
        gateId: plan.idMap[innerWire.from.gateId],
        portId: innerWire.from.portId,
      };
      flattenedWire.to = {
        gateId: plan.idMap[innerWire.to.gateId],
        portId: innerWire.to.portId,
      };
      wires[flattenedWire.id] = flattenedWire;
    }
  }

  return {
    ...circuit,
    gates,
    wires,
  };
}
