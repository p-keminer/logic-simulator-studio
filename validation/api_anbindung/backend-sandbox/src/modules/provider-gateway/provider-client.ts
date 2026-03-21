import type {
  ProviderGatewayRequest,
  ProviderGatewayResponse,
} from './provider-types';
import { ProviderGatewayError } from './provider-error';

export interface ProviderClient {
  readonly name: string;
  send(request: ProviderGatewayRequest): Promise<ProviderGatewayResponse>;
}

export class NoopProviderClient implements ProviderClient {
  readonly name = 'noop-provider-client';

  async send(request: ProviderGatewayRequest): Promise<ProviderGatewayResponse> {
    return {
      status: 'stubbed',
      provider: request.runtime.provider,
      model: request.runtime.model,
      message:
        'Chat request accepted by the sandbox broker. No provider request was made.',
      providerRequestId: `stub-${request.conversationId}`,
      usage: {
        inputBytes: request.debug.renderedBytes,
        outputBytes: 0,
      },
      debug: {
        client: this.name,
        attemptCount: 1,
        latencyMs: 0,
        host: request.runtime.allowedHosts[0],
      },
    };
  }
}

export class MockSuccessProviderClient implements ProviderClient {
  readonly name = 'mock-success-provider-client';

  constructor(
    private readonly message = 'Mock provider response from the sandbox.',
  ) {}

  async send(request: ProviderGatewayRequest): Promise<ProviderGatewayResponse> {
    return {
      status: 'ok',
      provider: request.runtime.provider,
      model: request.runtime.model,
      message: this.message,
      providerRequestId: `mock-${request.conversationId}`,
      usage: {
        inputBytes: request.debug.renderedBytes,
        outputBytes: this.message.length,
      },
      debug: {
        client: this.name,
        attemptCount: 1,
        latencyMs: 1,
        host: request.runtime.allowedHosts[0],
      },
    };
  }
}

export class MockFailingProviderClient implements ProviderClient {
  readonly name = 'mock-failing-provider-client';

  constructor(private readonly error: ProviderGatewayError) {}

  async send(_request: ProviderGatewayRequest): Promise<ProviderGatewayResponse> {
    throw this.error;
  }
}
