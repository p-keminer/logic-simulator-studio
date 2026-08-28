import type {
  AppBridgeChatRequest,
  AppBridgeChatResetRequest,
  AppBridgeSnapshot,
} from '../../src/contracts/app-bridge';

export const createAppBridgeSnapshot = (): AppBridgeSnapshot => ({
  bridgeVersion: 'sandbox-app-bridge-v1',
  openCircuit: {
    circuitId: 'bridge-circuit-1',
    title: 'Bridge fixture circuit',
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
      notes: 'Local sandbox bridge fixture for the active circuit.',
    },
  },
});

export const createAppBridgeChatRequest = (
  sessionId: string,
): AppBridgeChatRequest => ({
  sessionId,
  userMessage: 'Explain the currently open circuit from the local bridge.',
  conversation: {
    conversationId: 'bridge-conversation-1',
  },
  snapshot: createAppBridgeSnapshot(),
});

export const createAppBridgeChatResetRequest = (
  sessionId: string,
): AppBridgeChatResetRequest => ({
  sessionId,
  conversation: {
    conversationId: 'bridge-conversation-1',
  },
  resetReason: 'Clear the local bridge conversation.',
});
