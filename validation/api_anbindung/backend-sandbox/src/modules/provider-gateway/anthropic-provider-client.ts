// Anthropic-Provider-Client fuer die direkte Anbindung an api.anthropic.com.
// Implementiert das ProviderClient-Interface und nutzt ausschliesslich Node 20+
// native fetch – kein zusaetzliches npm-Paket notwendig.
//
// Sicherheitsregel: Der API-Key wird NIEMALS in Logs oder im State gespeichert.
// Er wird genau einmal direkt vor dem HTTP-Call aus der Session geholt und dann
// nur als lokale Variable innerhalb dieser Funktion gehalten.

import type { ProviderClient } from './provider-client.js';
import type {
  ProviderGatewayRequest,
  ProviderGatewayResponse,
} from './provider-types.js';
import { ProviderGatewayError } from './provider-error.js';
import type { SessionService } from '../auth/session-service.js';

// ── Konfiguration ────────────────────────────────────────────────────────────

export interface AnthropicProviderClientOptions {
  /** Basis-URL der Anthropic API. Standard: https://api.anthropic.com */
  base_url?: string;
  /** API-Version-Header fuer den anthropic-version-Header. Standard: 2023-06-01 */
  anthropic_version?: string;
  /** Maximale Anzahl Output-Tokens pro Antwort. Standard: 4096 */
  max_tokens?: number;
}

// ── Anthropic-API-Typen (nur die fuer uns relevanten Felder) ─────────────────

interface AnthropicContentBlock {
  type: 'text';
  text: string;
}

interface AnthropicSuccessResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: AnthropicContentBlock[];
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnthropicErrorResponse {
  type: 'error';
  error: {
    type: string;
    message: string;
  };
}

// ── Client-Implementierung ───────────────────────────────────────────────────

export class AnthropicProviderClient implements ProviderClient {
  readonly name = 'anthropic-provider-client';

  private readonly base_url: string;
  private readonly anthropic_version: string;
  private readonly max_tokens: number;

  constructor(
    private readonly session_service: SessionService,
    options: AnthropicProviderClientOptions = {},
  ) {
    // Trailing-Slash entfernen damit Endpoint-Konkatenation sauber bleibt
    this.base_url = (options.base_url ?? 'https://api.anthropic.com').replace(/\/$/, '');
    this.anthropic_version = options.anthropic_version ?? '2023-06-01';
    this.max_tokens = options.max_tokens ?? 4096;
  }

  async send(request: ProviderGatewayRequest): Promise<ProviderGatewayResponse> {
    // H4 allowedHosts-Durchsetzung: Ziel-Hostname muss in der Laufzeit-Allowlist stehen.
    // Verhindert SSRF-Szenarien falls base_url nachtraeglich manipuliert oder aus einer
    // unsicheren Quelle befuellt wurde. Der Check findet vor jedem Netzwerkzugriff statt.
    const target_host = new URL(this.base_url).hostname;
    if (!request.runtime.allowedHosts.includes(target_host)) {
      throw new ProviderGatewayError(
        'host-denied',
        `Anthropic provider target host '${target_host}' is not in the allowedHosts list.`,
        500,
        false,
        { target_host, allowedHosts: request.runtime.allowedHosts },
      );
    }

    // API-Key direkt vor dem HTTP-Call holen – ausserhalb dieses Scopes nicht sichtbar
    const resolved_key = await this.session_service.resolveActiveSessionKey(
      request.sessionId,
    );

    const endpoint = `${this.base_url}/v1/messages`;
    const model = request.runtime.model;

    // System-Prompt: alle system-Sektionen zusammenfuehren
    const system_content = request.prompt.system
      .map((s) => s.content)
      .join('\n\n');

    // User-Turn: circuit-Kontext + History + eigentliche User-Frage
    // History liegt als PromptSection vor (vorformatierter Text), kein separates
    // Rollen-Splitting noetig fuer den Single-Turn-Ansatz.
    const user_content = [
      ...request.prompt.circuit,
      ...request.prompt.history,
      ...request.prompt.user,
    ]
      .map((s) => s.content)
      .join('\n\n');

    const body = JSON.stringify({
      model,
      max_tokens: this.max_tokens,
      // system-Feld nur setzen wenn Inhalt vorhanden (Anthropic-API lehnt leeren String ab)
      ...(system_content.length > 0 ? { system: system_content } : {}),
      messages: [{ role: 'user', content: user_content }],
    });

    // Debug: Dispatch-Metadaten ohne sensible Daten
    console.debug('[anthropic-provider-client] dispatch', {
      endpoint,
      model,
      sessionId: request.sessionId,
      requestId: request.requestId ?? null,
      timeoutMs: request.runtime.timeoutMs,
      maxAttempts: request.runtime.maxAttempts,
    });

    const started_at = Date.now();
    let last_error: ProviderGatewayError | undefined;

    for (let attempt = 1; attempt <= request.runtime.maxAttempts; attempt++) {
      // AbortController fuer Request-Timeout (pro Versuch neu erstellen)
      const controller = new AbortController();
      const timeout_handle = setTimeout(
        () => controller.abort(),
        request.runtime.timeoutMs,
      );

      try {
        console.debug('[anthropic-provider-client] attempt', {
          attempt,
          maxAttempts: request.runtime.maxAttempts,
        });

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // API-Key wird nie geloggt
            'x-api-key': resolved_key.apiKey,
            'anthropic-version': this.anthropic_version,
          },
          body,
          signal: controller.signal,
        });

        clearTimeout(timeout_handle);

        console.debug('[anthropic-provider-client] response', {
          status: response.status,
          attempt,
        });

        if (!response.ok) {
          const error_body = await response.text();
          let parsed: AnthropicErrorResponse | undefined;

          try {
            parsed = JSON.parse(error_body) as AnthropicErrorResponse;
          } catch {
            // Fehler-Body ist kein JSON – rohen Text verwenden
          }

          const error_message = parsed?.error?.message ?? error_body;

          // HTTP-Status auf ProviderGatewayError-Code mappen
          if (response.status === 401 || response.status === 403) {
            throw new ProviderGatewayError(
              'auth',
              `Anthropic authentication failed: ${error_message}`,
              response.status,
              false, // nicht retryable – falscher Key bleibt falsch
            );
          }

          if (response.status === 429) {
            throw new ProviderGatewayError(
              'rate-limit',
              `Anthropic rate limit reached: ${error_message}`,
              429,
              true, // retryable – nach Backoff versuchen
            );
          }

          if (response.status === 500 || response.status === 529) {
            throw new ProviderGatewayError(
              'unavailable',
              `Anthropic service unavailable (${response.status}): ${error_message}`,
              response.status,
              true, // retryable – transientes Server-Problem
            );
          }

          throw new ProviderGatewayError(
            'unknown',
            `Anthropic returned unexpected status ${response.status}: ${error_message}`,
            response.status,
            false,
          );
        }

        // Erfolgsantwort parsen
        const data = (await response.json()) as AnthropicSuccessResponse;
        const text_block = data.content.find((b) => b.type === 'text');
        const message_text = text_block?.text ?? '';
        const latency_ms = Date.now() - started_at;

        // Debug: Erfolg ohne sensible Daten
        console.debug('[anthropic-provider-client] success', {
          model: data.model,
          providerRequestId: data.id,
          inputTokens: data.usage.input_tokens,
          outputTokens: data.usage.output_tokens,
          attempt,
          latencyMs: latency_ms,
        });

        return {
          status: 'ok',
          provider: 'anthropic',
          model: data.model,
          message: message_text,
          providerRequestId: data.id,
          usage: {
            // Tokens als Byte-Proxy – exakte Byte-Zaehlung wuerde UTF-8-Encoding benoetigen
            inputBytes: data.usage.input_tokens,
            outputBytes: data.usage.output_tokens,
          },
          debug: {
            client: this.name,
            attemptCount: attempt,
            latencyMs: latency_ms,
            host: new URL(this.base_url).hostname,
            requestId: data.id,
          },
        };
      } catch (error) {
        clearTimeout(timeout_handle);

        // fetch AbortError → Timeout
        if (error instanceof Error && error.name === 'AbortError') {
          last_error = new ProviderGatewayError(
            'timeout',
            `Anthropic request timed out after ${request.runtime.timeoutMs}ms.`,
            504,
            true,
          );
          console.debug('[anthropic-provider-client] timeout', {
            attempt,
            timeoutMs: request.runtime.timeoutMs,
          });
        } else if (error instanceof ProviderGatewayError) {
          last_error = error;
        } else {
          last_error = new ProviderGatewayError(
            'unknown',
            error instanceof Error
              ? error.message
              : 'Unknown error during Anthropic dispatch.',
            502,
            false,
          );
        }

        // Nicht-retryable Fehler sofort weiterwerfen (z.B. auth)
        if (!last_error.retryable) {
          console.debug('[anthropic-provider-client] non-retryable error', {
            code: last_error.code,
            attempt,
          });
          throw last_error;
        }

        // Letzten Versuch erschoepft
        if (attempt >= request.runtime.maxAttempts) {
          break;
        }

        // Exponentieller Backoff vor naechstem Versuch
        const backoff_ms = request.runtime.retryBackoffMs * attempt;
        console.debug('[anthropic-provider-client] retry backoff', {
          backoff_ms,
          nextAttempt: attempt + 1,
        });
        await new Promise((resolve) => setTimeout(resolve, backoff_ms));
      }
    }

    throw (
      last_error ??
      new ProviderGatewayError(
        'unknown',
        'Anthropic dispatch failed after all attempts.',
        502,
        false,
      )
    );
  }
}
