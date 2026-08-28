// OpenAI-kompatibler Provider-Client fuer die Anbindung an:
//   - OpenAI:     https://api.openai.com
//   - OpenRouter: https://openrouter.ai  (empfohlen fuer Multi-Provider-Zugang)
//   - Ollama:     http://localhost:11434  (lokale Modelle)
//   - Jede weitere API im OpenAI-Chat-Completions-Format
//
// Implementiert das ProviderClient-Interface und nutzt ausschließlich Node.js-Bordmittel.
// native fetch – kein zusaetzliches npm-Paket notwendig.
//
// Sicherheitsregel: Der API-Key wird NIEMALS in Logs oder im State gespeichert.
// Er wird genau einmal direkt vor dem HTTP-Call aus der Session geholt.

import type { ProviderClient } from './provider-client.js';
import type {
  ProviderGatewayRequest,
  ProviderGatewayResponse,
} from './provider-types.js';
import { ProviderGatewayError } from './provider-error.js';
import type { SessionService } from '../auth/session-service.js';

// ── Konfiguration ────────────────────────────────────────────────────────────

export interface OpenAICompatibleProviderClientOptions {
  /** Pflicht: Basis-URL des Providers. Beispiele: https://api.openai.com, https://openrouter.ai */
  base_url: string;
  /** Maximale Anzahl Output-Tokens pro Antwort. Standard: 4096 */
  max_tokens?: number;
  /**
   * X-HTTP-Referer-Header – von OpenRouter empfohlen fuer Tracking/Attribution.
   * Beispiel: 'https://github.com/p-keminer/logic-simulator-studio'
   */
  http_referer?: string;
  /**
   * X-Title-Header – von OpenRouter empfohlen fuer das Dashboard.
   * Beispiel: 'Logic Simulator Studio'
   */
  x_title?: string;
}

// ── OpenAI-API-Typen (nur die relevanten Felder) ─────────────────────────────

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAISuccessResponse {
  id: string;
  object: 'chat.completion';
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string | null;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIErrorResponse {
  error: {
    message: string;
    type: string;
    code?: string | null;
  };
}

// ── Client-Implementierung ───────────────────────────────────────────────────

export class OpenAICompatibleProviderClient implements ProviderClient {
  readonly name = 'openai-compatible-provider-client';

  private readonly base_url: string;
  private readonly max_tokens: number;
  private readonly http_referer: string | undefined;
  private readonly x_title: string | undefined;

  constructor(
    private readonly session_service: SessionService,
    options: OpenAICompatibleProviderClientOptions,
  ) {
    // Trailing-Slash entfernen damit Endpoint-Konkatenation sauber bleibt
    this.base_url = options.base_url.replace(/\/$/, '');
    this.max_tokens = options.max_tokens ?? 4096;
    this.http_referer = options.http_referer;
    this.x_title = options.x_title;
  }

  async send(request: ProviderGatewayRequest): Promise<ProviderGatewayResponse> {
    // H4 allowedHosts-Durchsetzung: Ziel-Hostname muss in der Laufzeit-Allowlist stehen.
    // Verhindert SSRF-Szenarien falls base_url nachtraeglich manipuliert oder aus einer
    // unsicheren Quelle befuellt wurde. Der Check findet vor jedem Netzwerkzugriff statt.
    const target_host = new URL(this.base_url).hostname;
    if (!request.runtime.allowedHosts.includes(target_host)) {
      throw new ProviderGatewayError(
        'host-denied',
        `OpenAI-compatible provider target host '${target_host}' is not in the allowedHosts list.`,
        500,
        false,
        { target_host, allowedHosts: request.runtime.allowedHosts },
      );
    }

    // API-Key direkt vor dem HTTP-Call holen – ausserhalb dieses Scopes nicht sichtbar
    const resolved_key = await this.session_service.resolveActiveSessionKey(
      request.sessionId,
    );

    const endpoint = `${this.base_url}/v1/chat/completions`;
    const model = request.runtime.model;

    // System-Prompt: alle system-Sektionen zusammenfuehren
    const system_content = request.prompt.system
      .map((s) => s.content)
      .join('\n\n');

    // User-Turn: circuit-Kontext + History + eigentliche User-Frage
    const user_content = [
      ...request.prompt.circuit,
      ...request.prompt.history,
      ...request.prompt.user,
    ]
      .map((s) => s.content)
      .join('\n\n');

    // Messages-Array: system-Message nur wenn Inhalt vorhanden
    const messages: OpenAIMessage[] = [
      ...(system_content.length > 0
        ? [{ role: 'system' as const, content: system_content }]
        : []),
      { role: 'user', content: user_content },
    ];

    const body = JSON.stringify({
      model,
      max_tokens: this.max_tokens,
      messages,
    });

    // Optionale OpenRouter-spezifische Header zusammenstellen
    const optional_headers: Record<string, string> = {};
    if (this.http_referer) {
      optional_headers['X-HTTP-Referer'] = this.http_referer;
    }
    if (this.x_title) {
      optional_headers['X-Title'] = this.x_title;
    }

    // Debug: Dispatch-Metadaten ohne sensible Daten
    console.debug('[openai-compatible-provider-client] dispatch', {
      endpoint,
      model,
      sessionId: request.sessionId,
      requestId: request.requestId ?? null,
      timeoutMs: request.runtime.timeoutMs,
      maxAttempts: request.runtime.maxAttempts,
      hasReferer: !!this.http_referer,
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
        console.debug('[openai-compatible-provider-client] attempt', {
          attempt,
          maxAttempts: request.runtime.maxAttempts,
        });

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Bearer-Auth fuer OpenAI-kompatible APIs – Key nie geloggt
            Authorization: `Bearer ${resolved_key.apiKey}`,
            ...optional_headers,
          },
          body,
          signal: controller.signal,
        });

        clearTimeout(timeout_handle);

        console.debug('[openai-compatible-provider-client] response', {
          status: response.status,
          attempt,
        });

        if (!response.ok) {
          const error_body = await response.text();
          let parsed: OpenAIErrorResponse | undefined;

          try {
            parsed = JSON.parse(error_body) as OpenAIErrorResponse;
          } catch {
            // Fehler-Body ist kein JSON – rohen Text verwenden
          }

          const error_message = parsed?.error?.message ?? error_body;

          // HTTP-Status auf ProviderGatewayError-Code mappen
          if (response.status === 401 || response.status === 403) {
            throw new ProviderGatewayError(
              'auth',
              `Provider authentication failed: ${error_message}`,
              response.status,
              false, // nicht retryable – falscher Key bleibt falsch
            );
          }

          if (response.status === 429) {
            throw new ProviderGatewayError(
              'rate-limit',
              `Provider rate limit reached: ${error_message}`,
              429,
              true, // retryable – nach Backoff versuchen
            );
          }

          if (response.status >= 500) {
            throw new ProviderGatewayError(
              'unavailable',
              `Provider service unavailable (${response.status}): ${error_message}`,
              response.status,
              true, // retryable – transientes Server-Problem
            );
          }

          throw new ProviderGatewayError(
            'unknown',
            `Provider returned unexpected status ${response.status}: ${error_message}`,
            response.status,
            false,
          );
        }

        // Erfolgsantwort parsen – erst als Text lesen fuer bessere Fehlerdiagnose
        const response_text = await response.text();
        let data: OpenAISuccessResponse;
        try {
          data = JSON.parse(response_text) as OpenAISuccessResponse;
        } catch {
          // Provider hat HTTP 200 gesendet aber keinen gueltigen JSON-Body.
          // Tritt auf wenn z.B. ein falscher Model-Slug eine HTML-Fehlerseite ausloest.
          console.debug('[openai-compatible-provider-client] non-json 200 body', {
            status: response.status,
            bodyPreview: response_text.slice(0, 300),
          });
          throw new ProviderGatewayError(
            'serialization',
            `Provider returned non-JSON body with status 200 (model slug korrekt?).`,
            502,
            false,
          );
        }
        const choice = data.choices[0];
        const message_text = choice?.message?.content ?? '';
        const latency_ms = Date.now() - started_at;

        // Debug: Erfolg ohne sensible Daten
        console.debug('[openai-compatible-provider-client] success', {
          model: data.model,
          providerRequestId: data.id,
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          attempt,
          latencyMs: latency_ms,
        });

        return {
          status: 'ok',
          provider: 'openai-compatible',
          model: data.model,
          message: message_text,
          providerRequestId: data.id,
          usage: {
            // Tokens als Byte-Proxy – exakte Byte-Zaehlung wuerde UTF-8-Encoding benoetigen
            inputBytes: data.usage.prompt_tokens,
            outputBytes: data.usage.completion_tokens,
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
            `Provider request timed out after ${request.runtime.timeoutMs}ms.`,
            504,
            true,
          );
          console.debug('[openai-compatible-provider-client] timeout', {
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
              : 'Unknown error during provider dispatch.',
            502,
            false,
          );
        }

        // Nicht-retryable Fehler sofort weiterwerfen (z.B. auth)
        if (!last_error.retryable) {
          console.debug('[openai-compatible-provider-client] non-retryable error', {
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
        console.debug('[openai-compatible-provider-client] retry backoff', {
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
        'Provider dispatch failed after all attempts.',
        502,
        false,
      )
    );
  }
}
