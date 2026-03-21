import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { buildAnalysisSubsystemOptions } from '../../core/analysis/sequentialProjection';
import type { GateInstance, SignalState, Wire } from '../../core/types';
import type { AnalysisSubsystemOption } from '../../core/analysis/sequentialProjection';
import type { Circuit, TimingSnapshot } from '../../core/types';
import {
  resolveAnalysisSubsystemState,
  resolveActiveAnalysisSubsystem,
  resolveTimingPanelState,
  resolveTimingAnalysisSourceCircuit,
  resolveTruthTablePanelState,
  resolveTruthTableAnalysisSourceCircuit,
  shouldUseProjectedTimingChannels,
} from '../../components/panels/panelViewState';
import { buildStaticAnalysisCircuit } from '../../core/analysis/stateTransitionTable';
import { synthesizeFsm } from '../../fsm/synthesis/synthesize';
import type { FsmMachine } from '../../fsm/types';
import { buildClipboardDataForSelection } from '../../store/clipboardSelection';
import { buildPastedClipboardContent } from '../../store/pasteClipboardProjection';
import { CircuitProvider } from '../../store/CircuitContext';
import { TimingDiagram } from '../../components/panels/TimingDiagram';
import { TruthTableModal } from '../../components/panels/TruthTableModal';

function makeCircuit(idOrGates: string | GateInstance[], wires: Wire[] = []): Circuit {
  const id = typeof idOrGates === 'string' ? idOrGates : 'panel-view-state-test';
  const gates = typeof idOrGates === 'string'
    ? {}
    : Object.fromEntries(idOrGates.map((gate) => [gate.id, gate]));
  return {
    id,
    name: id,
    version: '1.0.0',
    gates,
    wires: Object.fromEntries(wires.map((wire) => [wire.id, wire])),
    viewport: { panX: 0, panY: 0, zoom: 1 },
    metadata: { createdAt: '2026-03-21', updatedAt: '2026-03-21' },
  };
}

const defaultSignal: SignalState = { value: 0, version: 0, lastChangedAt: 0 };

function makeGate(
  id: string,
  typeId: string,
  projection?: GateInstance['projection'],
): GateInstance {
  return {
    id,
    typeId,
    x: 0,
    y: 0,
    projection,
    outputSignals: {},
    customState: {},
    isSelected: false,
  };
}

function makeWire(
  id: string,
  fromGate: string,
  fromPort: string,
  toGate: string,
  toPort: string,
): Wire {
  return {
    id,
    from: { gateId: fromGate, portId: fromPort },
    to: { gateId: toGate, portId: toPort },
    signal: { ...defaultSignal },
    waypoints: [],
    isSelected: false,
  };
}

function makeProjectedGate(
  id: string,
  typeId: string,
  role: NonNullable<GateInstance['projection']>['role'],
  signalLabel: string,
  signalPortId: string,
): GateInstance {
  return makeGate(id, typeId, {
    sourceSystem: 'fsm_synth',
    projectionBatchId: 'batch-single',
    role,
    visibility: 'canonical',
    signalLabel,
    groupKey: `${role}:${signalLabel}`,
    signalPortId,
  });
}

function makeOption(key: string, kind: AnalysisSubsystemOption['kind'], circuit: Circuit): AnalysisSubsystemOption {
  return {
    key,
    label: key,
    circuit,
    kind,
  };
}

function emptyCircuit(id = 'panel-view-circuit'): Circuit {
  return {
    id,
    name: id,
    version: '1.0.0',
    gates: {},
    wires: {},
    viewport: { panX: 0, panY: 0, zoom: 1 },
    metadata: { createdAt: '2026-03-21', updatedAt: '2026-03-21' },
  };
}

function makeFsm(overrides?: Partial<FsmMachine>): FsmMachine {
  return {
    id: 'fsm-panel-view-state',
    name: 'Panel View State FSM',
    archType: 'moore',
    inputCount: 1,
    inputNames: ['A'],
    outputCount: 1,
    outputNames: ['Y'],
    states: {},
    transitions: [],
    ...overrides,
  };
}

function makeTwoStateFsm(): FsmMachine {
  const sA = 'state-a';
  const sB = 'state-b';
  return makeFsm({
    states: {
      [sA]: { id: sA, label: 'SA', x: 100, y: 100, isInitial: true, output: 0 },
      [sB]: { id: sB, label: 'SB', x: 300, y: 100, isInitial: false, output: 1 },
    },
    transitions: [
      { id: 't1', fromId: sA, toId: sB, conditionText: 'A', mealyOutput: 0 },
      { id: 't2', fromId: sA, toId: sA, conditionText: '!A', mealyOutput: 0 },
      { id: 't3', fromId: sB, toId: sA, conditionText: 'A', mealyOutput: 0 },
      { id: 't4', fromId: sB, toId: sB, conditionText: '!A', mealyOutput: 0 },
    ],
  });
}

function makeCopiedProjectedCircuit(): Circuit {
  const first = synthesizeFsm(makeTwoStateFsm(), emptyCircuit('first'));
  const baseCircuit: Circuit = {
    ...emptyCircuit('base'),
    gates: first.gates,
    wires: first.wires,
  };

  const clipboard = buildClipboardDataForSelection(
    baseCircuit,
    new Set(Object.keys(baseCircuit.gates)),
  );

  const pasted = buildPastedClipboardContent({
    clipboard: clipboard!,
    existingCircuit: baseCircuit,
    offsetX: 24,
    offsetY: 24,
    createId: (() => {
      let index = 0;
      return () => `panel-copy-${++index}`;
    })(),
  });

  return {
    ...emptyCircuit('copied'),
    gates: {
      ...baseCircuit.gates,
      ...Object.fromEntries(pasted.gates.map((gate) => [gate.id, gate])),
    },
    wires: {
      ...baseCircuit.wires,
      ...Object.fromEntries(pasted.wires.map((wire) => [wire.id, wire])),
    },
  };
}

function makeSeparatelySynthesizedProjectedCircuit(): Circuit {
  const first = synthesizeFsm(makeTwoStateFsm(), emptyCircuit('first-synth'));
  const firstCircuit: Circuit = {
    ...emptyCircuit('first-synth-circuit'),
    gates: first.gates,
    wires: first.wires,
  };
  const second = synthesizeFsm(makeTwoStateFsm(), firstCircuit);

  return {
    ...emptyCircuit('second-synth-circuit'),
    gates: { ...first.gates, ...second.gates },
    wires: { ...first.wires, ...second.wires },
  };
}

function installWindowMock(initialStorage: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initialStorage));
  const previousWindow = (globalThis as { window?: unknown }).window;

  (globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    },
  };

  return () => {
    if (previousWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
      return;
    }
    (globalThis as { window?: unknown }).window = previousWindow;
  };
}

describe('panelViewState', () => {
  it('uses the projected analysis subsystem for truth-table/STT views even when it is the only option', () => {
    const fullCircuit = makeCircuit('full');
    const projectedCircuit = makeCircuit('projected');
    const options = [makeOption('fsm:1', 'projected_fsm', projectedCircuit)];

    const active = resolveActiveAnalysisSubsystem(options, '');
    expect(active?.key).toBe('fsm:1');
    expect(resolveTruthTableAnalysisSourceCircuit(fullCircuit, active)).toBe(projectedCircuit);
  });

  it('keeps timing full mode on the full circuit but selected mode on the active subsystem', () => {
    const fullCircuit = makeCircuit('full');
    const projectedCircuit = makeCircuit('projected');
    const options = [makeOption('fsm:1', 'projected_fsm', projectedCircuit)];
    const active = resolveActiveAnalysisSubsystem(options, '');

    expect(resolveTimingAnalysisSourceCircuit(fullCircuit, active, 'all')).toBe(fullCircuit);
    expect(resolveTimingAnalysisSourceCircuit(fullCircuit, active, 'selected')).toBe(projectedCircuit);
  });

  it('uses projected timing channels only in selected mode', () => {
    expect(shouldUseProjectedTimingChannels('all')).toBe(false);
    expect(shouldUseProjectedTimingChannels('selected')).toBe(true);
  });

  it('shows subsystem selection state for copied projected FSM circuits in both timing and truth-table paths', () => {
    const circuit = makeCopiedProjectedCircuit();
    const truthTableOptions = buildAnalysisSubsystemOptions(buildStaticAnalysisCircuit(circuit));
    const timingOptions = buildAnalysisSubsystemOptions(circuit);

    expect(truthTableOptions.map((option) => option.label)).toEqual(['Y', 'Y_1']);
    expect(timingOptions.map((option) => option.label)).toEqual(['Y', 'Y_1']);

    const truthTableState = resolveTruthTablePanelState(
      buildStaticAnalysisCircuit(circuit),
      truthTableOptions,
      '',
    );
    const timingState = resolveTimingPanelState(circuit, timingOptions, '', 'selected');

    expect(truthTableState.showSubsystemSelector).toBe(true);
    expect(truthTableState.activeAnalysisSubsystem?.label).toBe('Y');
    expect(timingState.showSubsystemSelector).toBe(true);
    expect(timingState.activeAnalysisSubsystem?.label).toBe('Y');
  });

  it('shows subsystem selection state for separately synthesized FSM circuits', () => {
    const circuit = makeSeparatelySynthesizedProjectedCircuit();
    const truthTableOptions = buildAnalysisSubsystemOptions(buildStaticAnalysisCircuit(circuit));
    const timingOptions = buildAnalysisSubsystemOptions(circuit);
    const subsystemState = resolveAnalysisSubsystemState(timingOptions, '');

    expect(truthTableOptions.map((option) => option.label)).toEqual(['Y', 'Y_1']);
    expect(timingOptions.map((option) => option.label)).toEqual(['Y', 'Y_1']);
    expect(subsystemState.showSubsystemSelector).toBe(true);
    expect(resolveTimingPanelState(circuit, timingOptions, '', 'all').showSubsystemSelector).toBe(false);
    expect(resolveTimingPanelState(circuit, timingOptions, '', 'selected').showSubsystemSelector).toBe(true);
  });

  it('renders the timing subsystem selector for copied FSMs in selected mode', () => {
    const circuit = makeCopiedProjectedCircuit();
    const restoreWindow = installWindowMock({
      'logic-sim:timing-diagram:view-mode': 'selected',
    });

    try {
      const html = renderToStaticMarkup(
        React.createElement(
          CircuitProvider,
          {
            initialCircuit: circuit,
            children: React.createElement(TimingDiagram, {
              history: [] as TimingSnapshot[],
              onClose: () => undefined,
            }),
          },
        ),
      );

      expect(html).toContain('aria-label="Timing-System"');
      expect(html).toContain('>Y<');
      expect(html).toContain('>Y_1<');
    } finally {
      restoreWindow();
    }
  });

  it('renders the truth-table subsystem selector for copied FSMs', () => {
    const circuit = makeCopiedProjectedCircuit();
    const html = renderToStaticMarkup(
      React.createElement(
        CircuitProvider,
        {
          initialCircuit: circuit,
          children: React.createElement(TruthTableModal, {
            onClose: () => undefined,
          }),
        },
      ),
    );

    expect(html).toContain('aria-label="System"');
    expect(html).toContain('>Y<');
    expect(html).toContain('>Y_1<');
  });

  it('keeps a single projected FSM on its trimmed subsystem when only raw observer outputs are attached', () => {
    const circuit = makeCircuit(
      [
        makeProjectedGate('clk', 'CLOCK', 'clock', 'CLK', 'clk'),
        makeProjectedGate('inA', 'INPUT_SWITCH', 'input', 'A', 'out'),
        makeProjectedGate('q0', 'D_FF_R', 'state', 'Q0', 'q'),
        makeProjectedGate('outY', 'OUTPUT_LED', 'output', 'Y', '_display'),
        makeGate('rawAnd', 'AND'),
        makeGate('rawLed', 'OUTPUT_LED'),
      ],
      [
        makeWire('w1', 'clk', 'clk', 'q0', 'clk'),
        makeWire('w2', 'inA', 'out', 'q0', 'd'),
        makeWire('w3', 'q0', 'q', 'outY', 'in'),
        makeWire('w4', 'q0', 'q', 'rawAnd', 'a'),
        makeWire('w5', 'q0', 'q', 'rawAnd', 'b'),
        makeWire('w6', 'rawAnd', 'out', 'rawLed', 'in'),
      ],
    );
    const analysisOptions = buildAnalysisSubsystemOptions(circuit);

    expect(analysisOptions).toHaveLength(1);
    expect(analysisOptions[0]?.kind).toBe('projected_fsm');

    const active = resolveActiveAnalysisSubsystem(analysisOptions, '');
    const truthTableCircuit = resolveTruthTableAnalysisSourceCircuit(circuit, active);
    const selectedTimingCircuit = resolveTimingAnalysisSourceCircuit(circuit, active, 'selected');

    expect(Object.keys(truthTableCircuit.gates).sort()).toEqual(['clk', 'inA', 'outY', 'q0']);
    expect(Object.keys(selectedTimingCircuit.gates).sort()).toEqual(['clk', 'inA', 'outY', 'q0']);
    expect(resolveTimingAnalysisSourceCircuit(circuit, active, 'all')).toBe(circuit);
  });

  it('keeps a single projected FSM on its trimmed subsystem when a raw LED only observes q directly', () => {
    const circuit = makeCircuit(
      [
        makeProjectedGate('clk', 'CLOCK', 'clock', 'CLK', 'clk'),
        makeProjectedGate('inA', 'INPUT_SWITCH', 'input', 'A', 'out'),
        makeProjectedGate('q0', 'D_FF_R', 'state', 'Q0', 'q'),
        makeProjectedGate('outY', 'OUTPUT_LED', 'output', 'Y', '_display'),
        makeGate('rawLed', 'OUTPUT_LED'),
      ],
      [
        makeWire('w1', 'clk', 'clk', 'q0', 'clk'),
        makeWire('w2', 'inA', 'out', 'q0', 'd'),
        makeWire('w3', 'q0', 'q', 'outY', 'in'),
        makeWire('w4', 'q0', 'q', 'rawLed', 'in'),
      ],
    );
    const analysisOptions = buildAnalysisSubsystemOptions(circuit);

    expect(analysisOptions).toHaveLength(1);
    expect(analysisOptions[0]?.kind).toBe('projected_fsm');

    const active = resolveActiveAnalysisSubsystem(analysisOptions, '');
    const truthTableCircuit = resolveTruthTableAnalysisSourceCircuit(circuit, active);
    const selectedTimingCircuit = resolveTimingAnalysisSourceCircuit(circuit, active, 'selected');

    expect(Object.keys(truthTableCircuit.gates).sort()).toEqual(['clk', 'inA', 'outY', 'q0']);
    expect(Object.keys(selectedTimingCircuit.gates).sort()).toEqual(['clk', 'inA', 'outY', 'q0']);
    expect(resolveTimingAnalysisSourceCircuit(circuit, active, 'all')).toBe(circuit);
  });
});
