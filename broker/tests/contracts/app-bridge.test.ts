import { describe, expect, it } from 'vitest';
import {
  appBridgeCapabilitiesSchema,
  appBridgeChatRequestSchema,
  appBridgeCurrentCircuitChatRequestSchema,
  appBridgeCurrentCircuitResponseSchema,
  appBridgeChatResetRequestSchema,
} from '../../src/contracts/app-bridge';
import { createFixtureCurrentCircuitSnapshot } from '../../src/modules/circuit-context/fixture-current-circuit-snapshot';
import {
  createAppBridgeChatRequest,
  createAppBridgeChatResetRequest,
} from '../integration/fixtures';

describe('app bridge contracts', () => {
  it('accepts a valid local bridge chat and reset payload', () => {
    const sessionId = '11111111-1111-4111-8111-111111111111';

    expect(
      appBridgeChatRequestSchema.safeParse(
        createAppBridgeChatRequest(sessionId),
      ).success,
    ).toBe(true);
    expect(
      appBridgeChatResetRequestSchema.safeParse(
        createAppBridgeChatResetRequest(sessionId),
      ).success,
    ).toBe(true);
    expect(
      appBridgeCurrentCircuitChatRequestSchema.safeParse({
        sessionId,
        userMessage: 'Explain the current circuit.',
        conversation: {
          conversationId: 'bridge-conversation-1',
        },
      }).success,
    ).toBe(true);
    expect(
      appBridgeCapabilitiesSchema.safeParse({
        bridgeVersion: 'sandbox-app-bridge-v1',
        providerId: 'fixture-current-circuit-snapshot-provider',
        providerMode: 'fixture',
        supportsCurrentCircuit: true,
        endpoints: {
          capabilities: '/v1/local-app-bridge/capabilities',
          currentCircuit: '/v1/local-app-bridge/current-circuit',
        },
      }).success,
    ).toBe(true);
    expect(
      appBridgeCurrentCircuitResponseSchema.safeParse({
        bridgeVersion: 'sandbox-app-bridge-v1',
        providerId: 'fixture-current-circuit-snapshot-provider',
        providerMode: 'fixture',
        fetchedAt: '2026-03-21T00:00:00.000Z',
        snapshot: createFixtureCurrentCircuitSnapshot(),
      }).success,
    ).toBe(true);
  });

  it('rejects unknown bridge fields and missing open-circuit data', () => {
    const sessionId = '11111111-1111-4111-8111-111111111111';
    const invalidRequest = {
      ...createAppBridgeChatRequest(sessionId),
      snapshot: {
        bridgeVersion: 'sandbox-app-bridge-v1',
      },
      debugLeak: true,
    };

    expect(appBridgeChatRequestSchema.safeParse(invalidRequest).success).toBe(
      false,
    );
  });
});
