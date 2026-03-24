import type { PromptEnvelope } from '../prompt-orchestrator/prompt-types.js';

export interface ProviderPromptDebug {
  readonly renderedBytes: number;
  readonly promptFingerprint: string;
  readonly sectionCounts: {
    readonly system: number;
    readonly circuit: number;
    readonly history: number;
    readonly user: number;
  };
  readonly templateVersion: string;
}

export interface ProviderGatewayRuntime {
  readonly provider: string;
  readonly model: string;
  readonly allowedHosts: string[];
  readonly timeoutMs: number;
  readonly maxAttempts: number;
  readonly retryBackoffMs: number;
}

export interface ProviderGatewayRequest {
  readonly requestId?: string;
  readonly sessionId: string;
  readonly conversationId: string;
  readonly prompt: PromptEnvelope;
  readonly runtime: ProviderGatewayRuntime;
  readonly debug: ProviderPromptDebug;
}

export interface ProviderGatewayResponse {
  readonly status: 'stubbed' | 'ok';
  readonly provider: string;
  readonly model: string;
  readonly message: string;
  readonly providerRequestId?: string;
  readonly usage?: {
    readonly inputBytes: number;
    readonly outputBytes: number;
  };
  readonly debug: {
    readonly client: string;
    readonly attemptCount: number;
    readonly latencyMs: number;
    readonly host?: string;
    readonly requestId?: string;
    readonly dispatchMode?: 'noop' | 'mock' | 'live';
    readonly promptFingerprint?: string;
    readonly renderedBytes?: number;
    readonly templateVersion?: string;
    readonly maxAttempts?: number;
    readonly timeoutMs?: number;
    readonly allowedHosts?: string[];
    readonly retryBackoffMs?: number;
  };
}

export interface ProviderGatewayLogger {
  debug(bindings: Record<string, unknown>, message: string): void;
  info(bindings: Record<string, unknown>, message: string): void;
  warn(bindings: Record<string, unknown>, message: string): void;
  error(bindings: Record<string, unknown>, message: string): void;
}
