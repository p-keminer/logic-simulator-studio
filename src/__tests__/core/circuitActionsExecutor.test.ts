import '../setup';
import '../../core/registry/index';
import { describe, expect, it, vi } from 'vitest';
import {
  MAX_CIRCUIT_ACTIONS,
  applyCircuitActionsProposal,
  prepareCircuitActionsProposal,
  stripCircuitActionsBlock,
  type PreparedCircuitActions,
} from '../../core/backendBroker/circuitActionsExecutor';
import type { Circuit } from '../../core/types';
import type { CircuitAction } from '../../store/actions';
import { circuitReducer, createEmptyCircuit } from '../../store/circuitReducer';

const responseWithActions = (actions: unknown[], version: unknown = 1) =>
  `Vorschlag\n\n\`\`\`circuit-actions\n${JSON.stringify({ version, actions })}\n\`\`\``;

const requireReadyProposal = (
  result: ReturnType<typeof prepareCircuitActionsProposal>,
): PreparedCircuitActions => {
  if (result.status !== 'ready') {
    throw new Error(`Expected ready proposal, got ${result.status}`);
  }
  return result.proposal;
};

const createConnectedCircuit = (): Circuit => {
  let circuit = { ...createEmptyCircuit(), id: 'circuit-1', name: 'Test' };
  circuit = circuitReducer(circuit, {
    type: 'GATE_ADD',
    payload: { id: 'input-1', typeId: 'INPUT_SWITCH', x: 100, y: 100 },
  });
  circuit = circuitReducer(circuit, {
    type: 'GATE_ADD',
    payload: { id: 'output-1', typeId: 'OUTPUT_LED', x: 300, y: 100 },
  });
  return circuitReducer(circuit, {
    type: 'WIRE_ADD',
    payload: {
      from: { gateId: 'input-1', portId: 'out' },
      to: { gateId: 'output-1', portId: 'in' },
    },
  });
};

describe('circuit-actions proposal validation', () => {
  it('strictly validates refs, gate types and ports before preparing mutations', () => {
    const circuit = createEmptyCircuit();
    const result = prepareCircuitActionsProposal(
      responseWithActions([
        { type: 'ADD_INPUT', nodeType: 'INPUT_SWITCH', ref: 'A' },
        { type: 'ADD_INPUT', nodeType: 'INPUT_SWITCH', ref: 'B' },
        { type: 'ADD_GATE', gateType: 'AND', ref: 'AND_1' },
        { type: 'ADD_OUTPUT', nodeType: 'OUTPUT_LED', ref: 'Y' },
        {
          type: 'CONNECT',
          from: { ref: 'A', port: 'out' },
          to: { ref: 'AND_1', port: 'a' },
        },
        {
          type: 'CONNECT',
          from: { ref: 'B', port: 'out' },
          to: { ref: 'AND_1', port: 'b' },
        },
        {
          type: 'CONNECT',
          from: { ref: 'AND_1', port: 'out' },
          to: { ref: 'Y', port: 'in' },
        },
      ]),
      circuit,
    );

    const proposal = requireReadyProposal(result);
    expect(proposal.actionCount).toBe(7);
    expect(proposal.destructive).toBe(false);
    expect(proposal.mutations).toHaveLength(7);
    expect(proposal.preview.every((item) => !item.destructive)).toBe(true);
    expect(proposal.preview[4]?.description).toBe(
      'ref:A:out mit ref:AND_1:a verbinden',
    );
  });

  it.each([
    ['wrong version', responseWithActions([{ type: 'CLEAR' }], 2)],
    [
      'unknown field',
      `\`\`\`circuit-actions\n${JSON.stringify({
        version: 1,
        actions: [{ type: 'ADD_GATE', gateType: 'AND', ref: 'G', x: 1 }],
      })}\n\`\`\``,
    ],
    [
      'unapproved gate type',
      responseWithActions([{ type: 'ADD_GATE', gateType: 'TEXT', ref: 'G' }]),
    ],
    [
      'duplicate ref',
      responseWithActions([
        { type: 'ADD_GATE', gateType: 'AND', ref: 'G' },
        { type: 'ADD_GATE', gateType: 'OR', ref: 'G' },
      ]),
    ],
    [
      'unknown id',
      responseWithActions([{ type: 'DELETE_NODE', id: 'missing-gate' }]),
    ],
    [
      'CLEAR after another action',
      responseWithActions([
        { type: 'ADD_GATE', gateType: 'AND', ref: 'G' },
        { type: 'CLEAR' },
      ]),
    ],
  ])('rejects %s', (_name, response) => {
    const result = prepareCircuitActionsProposal(response, createEmptyCircuit());
    expect(result.status).toBe('invalid');
  });

  it('rejects an invalid late action without dispatching earlier valid actions', () => {
    const response = responseWithActions([
      { type: 'ADD_INPUT', nodeType: 'INPUT_SWITCH', ref: 'A' },
      { type: 'ADD_OUTPUT', nodeType: 'OUTPUT_LED', ref: 'Y' },
      {
        type: 'CONNECT',
        from: { ref: 'A', port: 'not-an-output' },
        to: { ref: 'Y', port: 'in' },
      },
    ]);
    const dispatch = vi.fn<(action: CircuitAction) => void>();
    const result = prepareCircuitActionsProposal(response, createEmptyCircuit());

    if (result.status === 'ready') {
      applyCircuitActionsProposal(result.proposal, dispatch);
    }

    expect(result.status).toBe('invalid');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('rejects multiple blocks and proposals above the action limit', () => {
    const single = responseWithActions([{ type: 'CLEAR' }]);
    expect(
      prepareCircuitActionsProposal(`${single}\n${single}`, createEmptyCircuit()).status,
    ).toBe('invalid');

    const excessive = Array.from({ length: MAX_CIRCUIT_ACTIONS + 1 }, (_, index) => ({
      type: 'ADD_GATE',
      gateType: 'AND',
      ref: `G_${index}`,
    }));
    expect(
      prepareCircuitActionsProposal(
        responseWithActions(excessive),
        createEmptyCircuit(),
      ).status,
    ).toBe('invalid');
  });

  it('removes circuit-actions blocks from visible assistant text', () => {
    expect(stripCircuitActionsBlock(responseWithActions([{ type: 'CLEAR' }]))).toBe(
      'Vorschlag',
    );
  });
});

describe('circuit-actions confirmation batch', () => {
  it('dispatches a validated proposal exactly once as one atomic batch', () => {
    const proposal = requireReadyProposal(
      prepareCircuitActionsProposal(
        responseWithActions([
          { type: 'ADD_INPUT', nodeType: 'INPUT_SWITCH', ref: 'A' },
          { type: 'ADD_OUTPUT', nodeType: 'OUTPUT_LED', ref: 'Y' },
          {
            type: 'CONNECT',
            from: { ref: 'A', port: 'out' },
            to: { ref: 'Y', port: 'in' },
          },
        ]),
        createEmptyCircuit(),
      ),
    );
    const dispatch = vi.fn<(action: CircuitAction) => void>();

    applyCircuitActionsProposal(proposal, dispatch);

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0]?.[0]).toMatchObject({
      type: 'CIRCUIT_ACTIONS_APPLY_BATCH',
      payload: { actions: expect.any(Array) },
    });
  });

  it('marks CLEAR as destructive and keeps it undoable by preserving circuit identity', () => {
    const circuit = createConnectedCircuit();
    const proposal = requireReadyProposal(
      prepareCircuitActionsProposal(
        responseWithActions([
          { type: 'CLEAR' },
          { type: 'ADD_GATE', gateType: 'NOT', ref: 'replacement' },
        ]),
        circuit,
      ),
    );
    let dispatched: CircuitAction | null = null;

    applyCircuitActionsProposal(proposal, (action) => {
      dispatched = action;
    });

    expect(proposal.destructive).toBe(true);
    expect(proposal.preview[0]).toMatchObject({ type: 'CLEAR', destructive: true });
    if (!dispatched) throw new Error('Expected one batch dispatch');
    const next = circuitReducer(circuit, dispatched);
    expect(next.id).toBe(circuit.id);
    expect(Object.keys(next.gates)).toHaveLength(1);
    expect(Object.keys(next.wires)).toHaveLength(0);
    expect(Object.keys(circuit.gates)).toHaveLength(2);
  });

  it('marks DELETE_NODE as destructive and removes attached wires in the batch', () => {
    const circuit = createConnectedCircuit();
    const proposal = requireReadyProposal(
      prepareCircuitActionsProposal(
        responseWithActions([{ type: 'DELETE_NODE', id: 'input-1' }]),
        circuit,
      ),
    );
    let dispatched: CircuitAction | null = null;
    applyCircuitActionsProposal(proposal, (action) => {
      dispatched = action;
    });

    expect(proposal.preview).toEqual([
      expect.objectContaining({ type: 'DELETE_NODE', destructive: true }),
    ]);
    if (!dispatched) throw new Error('Expected one batch dispatch');
    const next = circuitReducer(circuit, dispatched);
    expect(next.gates['input-1']).toBeUndefined();
    expect(Object.keys(next.wires)).toHaveLength(0);
  });
});
