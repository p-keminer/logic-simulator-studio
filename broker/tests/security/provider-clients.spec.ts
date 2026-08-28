// H4 allowedHosts-Durchsetzung: Beide echten Provider-Clients muessen den
// Ziel-Hostnamen gegen request.runtime.allowedHosts pruefen, BEVOR sie einen
// Netzwerkzugriff oder SessionService-Aufruf durchfuehren.
//
// Testziel: Wenn base_url-Hostname NICHT in allowedHosts steht → ProviderGatewayError
// mit code='host-denied' wird geworfen, kein fetch, kein Key-Zugriff.

import { describe, expect, it, vi } from 'vitest';
import { AnthropicProviderClient } from '../../src/modules/provider-gateway/anthropic-provider-client';
import { OpenAICompatibleProviderClient } from '../../src/modules/provider-gateway/openai-compatible-provider-client';
import type { SessionService } from '../../src/modules/auth/session-service';
import type { ProviderGatewayRequest } from '../../src/modules/provider-gateway/provider-types';

// Minimaler SessionService-Mock: resolveActiveSessionKey sollte bei diesen
// Tests NICHT aufgerufen werden, da der Host-Check davor abbrechen muss.
const createSessionServiceMock = (): SessionService => ({
  registerSessionKey: vi.fn(),
  assertActiveSession: vi.fn(),
  deleteSessionKey: vi.fn(),
  resetSession: vi.fn(),
  resolveActiveSessionKey: vi.fn().mockRejectedValue(
    new Error('resolveActiveSessionKey should NOT be called during H4 host-denied test'),
  ),
});

// Minimaler ProviderGatewayRequest mit konfigurierbaren allowedHosts
const createRequest = (allowedHosts: string[]): ProviderGatewayRequest => ({
  requestId: 'req-h4-test',
  sessionId: 'session-h4',
  conversationId: 'conv-h4',
  prompt: {
    templateVersion: 'sandbox-chat-v1',
    system: [{ title: 'sys', content: 'Only active circuit.' }],
    circuit: [{ title: 'circuit', content: 'gate-count=1' }],
    history: [],
    user: [{ title: 'user', content: 'Explain the circuit.' }],
    renderedPrompt: '# SANDBOX CHAT TEMPLATE sandbox-chat-v1\nconversationId=conv-h4',
  },
  runtime: {
    provider: 'test',
    model: 'test-model',
    allowedHosts,
    timeoutMs: 1_000,
    maxAttempts: 1,
    retryBackoffMs: 0,
  },
  debug: {
    renderedBytes: 64,
    promptFingerprint: 'abcdef1234567890',
    sectionCounts: { system: 1, circuit: 1, history: 0, user: 1 },
    templateVersion: 'sandbox-chat-v1',
  },
});

describe('provider clients H4 allowedHosts enforcement', () => {
  describe('AnthropicProviderClient', () => {
    it('throws host-denied before any network call when base_url hostname is not in allowedHosts', async () => {
      const session_service = createSessionServiceMock();
      const client = new AnthropicProviderClient(session_service, {
        base_url: 'https://api.anthropic.com',
      });

      // allowedHosts enthaelt einen ANDEREN Host → muss host-denied werfen
      await expect(
        client.send(createRequest(['evil.example.com'])),
      ).rejects.toMatchObject({
        name: 'ProviderGatewayError',
        code: 'host-denied',
        retryable: false,
      });

      // SessionService darf NICHT aufgerufen worden sein
      expect(session_service.resolveActiveSessionKey).not.toHaveBeenCalled();
    });

    it('throws host-denied when allowedHosts is empty', async () => {
      const session_service = createSessionServiceMock();
      const client = new AnthropicProviderClient(session_service, {
        base_url: 'https://api.anthropic.com',
      });

      await expect(
        client.send(createRequest([])),
      ).rejects.toMatchObject({
        code: 'host-denied',
      });

      expect(session_service.resolveActiveSessionKey).not.toHaveBeenCalled();
    });

    it('does not throw host-denied when base_url hostname is in allowedHosts', async () => {
      const session_service = createSessionServiceMock();
      // resolveActiveSessionKey wird in diesem Zweig tatsaechlich aufgerufen –
      // wir lassen ihn einen kontrollierten Fehler werfen damit kein echter fetch folgt.
      (session_service.resolveActiveSessionKey as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('session-not-found-expected-in-test'),
      );
      const client = new AnthropicProviderClient(session_service, {
        base_url: 'https://api.anthropic.com',
      });

      // Host stimmt → kein host-denied, aber danach schlaegt session lookup fehl
      await expect(
        client.send(createRequest(['api.anthropic.com'])),
      ).rejects.toThrow('session-not-found-expected-in-test');

      // SessionService WURDE aufgerufen – Host-Check hat nicht abgebrochen
      expect(session_service.resolveActiveSessionKey).toHaveBeenCalled();
    });
  });

  describe('OpenAICompatibleProviderClient', () => {
    it('throws host-denied before any network call when base_url hostname is not in allowedHosts', async () => {
      const session_service = createSessionServiceMock();
      const client = new OpenAICompatibleProviderClient(session_service, {
        base_url: 'https://openrouter.ai',
      });

      await expect(
        client.send(createRequest(['api.openai.com'])),
      ).rejects.toMatchObject({
        name: 'ProviderGatewayError',
        code: 'host-denied',
        retryable: false,
      });

      expect(session_service.resolveActiveSessionKey).not.toHaveBeenCalled();
    });

    it('throws host-denied when allowedHosts is empty', async () => {
      const session_service = createSessionServiceMock();
      const client = new OpenAICompatibleProviderClient(session_service, {
        base_url: 'https://openrouter.ai',
      });

      await expect(
        client.send(createRequest([])),
      ).rejects.toMatchObject({
        code: 'host-denied',
      });

      expect(session_service.resolveActiveSessionKey).not.toHaveBeenCalled();
    });

    it('does not throw host-denied when base_url hostname is in allowedHosts', async () => {
      const session_service = createSessionServiceMock();
      (session_service.resolveActiveSessionKey as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('session-not-found-expected-in-test'),
      );
      const client = new OpenAICompatibleProviderClient(session_service, {
        base_url: 'https://openrouter.ai',
      });

      await expect(
        client.send(createRequest(['openrouter.ai'])),
      ).rejects.toThrow('session-not-found-expected-in-test');

      expect(session_service.resolveActiveSessionKey).toHaveBeenCalled();
    });
  });
});
