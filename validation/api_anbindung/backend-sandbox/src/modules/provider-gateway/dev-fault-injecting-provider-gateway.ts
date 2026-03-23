import type {
  ProviderGateway,
  ProviderGatewaySendInput,
} from './provider-gateway.js';
import { ProviderGatewayError } from './provider-error.js';
import type {
  DevProviderFaultController,
  DevProviderFaultMode,
} from './dev-provider-fault-controller.js';

const createFaultError = (mode: DevProviderFaultMode) => {
  if (mode === 'timeout') {
    return new ProviderGatewayError(
      'timeout',
      'Dev provider timeout injected by sandbox helper.',
      504,
      true,
      {
        attemptCount: 1,
        dispatchMode: 'dev-fault',
        maxAttempts: 1,
        retryAfterSeconds: 1,
        timeoutMs: 1_500,
      },
    );
  }

  return new ProviderGatewayError(
    'unavailable',
    'Dev provider unavailability injected by sandbox helper.',
    503,
    true,
    {
      attemptCount: 1,
      dispatchMode: 'dev-fault',
      maxAttempts: 1,
      timeoutMs: 1_500,
    },
  );
};

export class DevFaultInjectingProviderGateway implements ProviderGateway {
  constructor(
    private readonly delegate: ProviderGateway,
    private readonly controller: DevProviderFaultController,
  ) {}

  async send(input: ProviderGatewaySendInput) {
    const mode = this.controller.consume();

    if (!mode) {
      return this.delegate.send(input);
    }

    throw createFaultError(mode);
  }
}
