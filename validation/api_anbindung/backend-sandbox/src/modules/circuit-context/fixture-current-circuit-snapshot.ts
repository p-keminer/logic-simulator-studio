import type { AppBridgeSnapshot } from '../../contracts/app-bridge';

export const createFixtureCurrentCircuitSnapshot = (): AppBridgeSnapshot => ({
  bridgeVersion: 'sandbox-app-bridge-v1',
  openCircuit: {
    circuitId: 'fixture-circuit-1',
    title: 'Fixture current circuit',
    selection: {
      activeElementIds: ['gate-and-1', 'node-input-a'],
    },
    elements: {
      nodes: [
        {
          id: 'node-input-a',
          nodeType: 'input-node',
          displayName: 'Input A',
        },
        {
          id: 'node-output-y',
          nodeType: 'output-node',
          displayName: 'Output Y',
        },
      ],
      gates: [
        {
          id: 'gate-and-1',
          gateType: 'and',
          displayName: 'AND Gate',
          pins: {
            inputs: [
              {
                gateId: 'gate-and-1',
                port: 'in-a',
              },
              {
                gateId: 'gate-and-1',
                port: 'in-b',
              },
            ],
            outputs: [
              {
                gateId: 'gate-and-1',
                port: 'out',
              },
            ],
          },
        },
      ],
      wires: [
        {
          source: {
            gateId: 'gate-and-1',
            port: 'out',
          },
          target: {
            gateId: 'gate-and-1',
            port: 'in-a',
          },
        },
      ],
    },
    annotations: {
      notes: 'Fixture snapshot for the local sandbox app-bridge handshake.',
    },
  },
});
