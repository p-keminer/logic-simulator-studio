import type {
  BackendBrokerChatRequest,
  BackendBrokerChatResetRequest,
  BackendBrokerChatResetResponse,
  BackendBrokerChatResponse,
  BackendBrokerSessionDeletion,
  BackendBrokerSessionRegistration,
} from './contracts';
import { createBackendBrokerApiError } from './errors';

export interface BackendBrokerClientOptions {
  baseUrl?: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

export const DEFAULT_BACKEND_BROKER_BASE_URL = 'http://127.0.0.1:8787/v1';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

function assertString(
  value: unknown,
  field: string,
  options: { optional: true },
): string | undefined;
function assertString(
  value: unknown,
  field: string,
  options?: { optional?: false | undefined },
): string;
function assertString(
  value: unknown,
  field: string,
  options: { optional?: boolean } = {},
) {
  if (value == null && options.optional) {
    return undefined;
  }

  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Backend broker payload is missing a valid "${field}" string.`);
  }

  return value;
};

const assertBooleanLiteral = <TValue extends boolean>(
  value: unknown,
  expected: TValue,
  field: string,
) : TValue => {
  if (value !== expected) {
    throw new Error(`Backend broker payload is missing "${field}" = ${String(expected)}.`);
  }

  return expected;
};

const assertStringArray = (value: unknown, field: string): string[] => {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new Error(`Backend broker payload is missing a valid "${field}" string array.`);
  }

  return [...value];
};

const parseSessionRegistration = (payload: unknown): BackendBrokerSessionRegistration => {
  const record = asRecord(payload);

  if (!record) {
    throw new Error('Backend broker returned an invalid session registration payload.');
  }

  return {
    sessionId: assertString(record.sessionId, 'sessionId'),
    issuedAt: assertString(record.issuedAt, 'issuedAt'),
    expiresAt: assertString(record.expiresAt, 'expiresAt'),
    status:
      record.status === 'active'
        ? 'active'
        : (() => {
            throw new Error('Backend broker returned an invalid session status.');
          })(),
  };
};

const parseSessionDeletion = (payload: unknown): BackendBrokerSessionDeletion => {
  const record = asRecord(payload);

  if (!record) {
    throw new Error('Backend broker returned an invalid session deletion payload.');
  }

  return {
    deleted: assertBooleanLiteral(record.deleted, true, 'deleted'),
    sessionId: assertString(record.sessionId, 'sessionId'),
    deletedAt: assertString(record.deletedAt, 'deletedAt'),
  };
};

const parseChatResponse = (payload: unknown): BackendBrokerChatResponse => {
  const record = asRecord(payload);

  if (!record) {
    throw new Error('Backend broker returned an invalid chat response payload.');
  }

  return {
    message: assertString(record.message, 'message'),
    conversationId: assertString(record.conversationId, 'conversationId', {
      optional: true,
    }),
    model: assertString(record.model, 'model', { optional: true }),
    circuitContextVersion: assertString(
      record.circuitContextVersion,
      'circuitContextVersion',
    ),
  };
};

const parseChatResetResponse = (payload: unknown): BackendBrokerChatResetResponse => {
  const record = asRecord(payload);

  if (!record) {
    throw new Error('Backend broker returned an invalid chat reset payload.');
  }

  return {
    reset: assertBooleanLiteral(record.reset, true, 'reset'),
    sessionId: assertString(record.sessionId, 'sessionId'),
    conversationId: assertString(record.conversationId, 'conversationId', {
      optional: true,
    }),
    clearedConversationIds: assertStringArray(
      record.clearedConversationIds,
      'clearedConversationIds',
    ),
    clearedTurns:
      typeof record.clearedTurns === 'number' && Number.isFinite(record.clearedTurns)
        ? record.clearedTurns
        : (() => {
            throw new Error(
              'Backend broker payload is missing a valid "clearedTurns" number.',
            );
          })(),
    resetAt: assertString(record.resetAt, 'resetAt'),
  };
};

const readJsonPayload = async (response: Response) => {
  const text = await response.text();

  if (text.trim().length === 0) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

export function normalizeBackendBrokerBaseUrl(rawValue: string): string {
  const trimmed = rawValue.trim();

  if (trimmed.length === 0) {
    return DEFAULT_BACKEND_BROKER_BASE_URL;
  }

  const url = new URL(trimmed);
  let pathname = url.pathname.replace(/\/+$/, '');

  if (pathname === '' || pathname === '/') {
    pathname = '/v1';
  } else if (!pathname.endsWith('/v1')) {
    pathname = `${pathname}/v1`;
  }

  url.pathname = pathname;
  url.search = '';
  url.hash = '';

  return url.toString().replace(/\/$/, '');
}

export class BackendBrokerClient {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: BackendBrokerClientOptions = {}) {
    this.baseUrl = normalizeBackendBrokerBaseUrl(
      options.baseUrl ?? DEFAULT_BACKEND_BROKER_BASE_URL,
    );
    this.fetchFn = options.fetchFn ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 30_000;
  }

  private async requestJson<TResponse>(
    path: string,
    options: {
      body?: unknown;
      method: 'POST' | 'DELETE';
      parser: (payload: unknown) => TResponse;
    },
  ): Promise<TResponse> {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchFn(`${this.baseUrl}${path}`, {
        method: options.method,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
      const payload = await readJsonPayload(response);

      if (!response.ok) {
        throw createBackendBrokerApiError(response.status, payload);
      }

      return options.parser(payload);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new Error(
          `Backend broker request timed out after ${this.timeoutMs} ms.`,
        );
        timeoutError.name = 'AbortError';
        throw timeoutError;
      }

      throw error;
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  async registerSessionKey(apiKey: string): Promise<BackendBrokerSessionRegistration> {
    return this.requestJson('/session/key', {
      body: { apiKey },
      method: 'POST',
      parser: parseSessionRegistration,
    });
  }

  async deleteSessionKey(sessionId: string): Promise<BackendBrokerSessionDeletion> {
    return this.requestJson('/session/key', {
      body: { sessionId },
      method: 'DELETE',
      parser: parseSessionDeletion,
    });
  }

  async sendChatRequest(
    request: BackendBrokerChatRequest,
  ): Promise<BackendBrokerChatResponse> {
    return this.requestJson('/chat/request', {
      body: request,
      method: 'POST',
      parser: parseChatResponse,
    });
  }

  async resetChat(
    request: BackendBrokerChatResetRequest,
  ): Promise<BackendBrokerChatResetResponse> {
    return this.requestJson('/chat/reset', {
      body: request,
      method: 'POST',
      parser: parseChatResetResponse,
    });
  }
}
