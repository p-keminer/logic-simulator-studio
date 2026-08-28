import { useEffect, useMemo, useState } from 'react';
import Markdown, { type Components } from 'react-markdown';

// Custom-Renderer damit Markdown-Elemente ohne Tailwind-Typography-Plugin
// korrekt gestylt werden.
const MARKDOWN_COMPONENTS: Components = {
  h1: ({ children }) => <h1 className="mb-2 text-base font-bold text-slate-100">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-1 mt-3 text-sm font-semibold text-slate-200">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-1 mt-2 text-sm font-semibold text-slate-300">{children}</h3>,
  p:  ({ children }) => <p  className="mb-2 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 list-disc pl-4 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal pl-4 space-y-0.5">{children}</ol>,
  li: ({ children }) => <li className="text-sm">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-slate-100">{children}</strong>,
  em:     ({ children }) => <em className="italic text-slate-300">{children}</em>,
  a: ({ children, href }) => (
    <a
      className="text-cyan-300 underline decoration-cyan-700 underline-offset-2"
      href={href}
      rel="noreferrer noopener"
      target="_blank"
    >
      {children}
    </a>
  ),
  // Provider-controlled Markdown must not trigger external image requests.
  img: ({ alt }) => (
    <span className="text-xs italic text-slate-500">
      {alt ? `[Bild blockiert: ${alt}]` : '[Externes Bild blockiert]'}
    </span>
  ),
  code:   ({ children }) => <code className="rounded bg-slate-800 px-1 py-0.5 font-mono text-xs text-cyan-300">{children}</code>,
  pre:    ({ children }) => <pre className="mb-2 overflow-x-auto rounded bg-slate-800 p-2 font-mono text-xs text-cyan-300">{children}</pre>,
  table:  ({ children }) => (
    <div className="mb-2 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-slate-700/50">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr:    ({ children }) => <tr className="border-b border-slate-700">{children}</tr>,
  th:    ({ children }) => <th className="px-3 py-1.5 text-left font-semibold text-slate-200">{children}</th>,
  td:    ({ children }) => <td className="px-3 py-1.5 text-slate-300">{children}</td>,
};
import {
  createBackendSandboxCurrentCircuitSnapshot,
  summarizeBackendSandboxCurrentCircuitSnapshot,
} from '../../core/io/backendSandboxSnapshot';
import { shouldClearBackendBrokerUiErrorOnUserEdit } from '../../core/backendBroker/errors';
import { getBackendBrokerModalControlState } from '../../core/backendBroker/modalState';
import {
  applyCircuitActionsProposal,
  prepareCircuitActionsProposal,
  stripCircuitActionsBlock,
  type PreparedCircuitActions,
} from '../../core/backendBroker/circuitActionsExecutor';
import { useBackendBroker } from '../../hooks/useBackendBroker';
import { useCircuitContext } from '../../store/CircuitContext';

interface Props {
  onClose: () => void;
}

function formatIsoTimestamp(value: string | undefined): string {
  if (!value) {
    return 'n/a';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(date);
}

export function BackendBrokerModal({ onClose }: Props) {
  const { circuit, dispatch: circuitDispatch } = useCircuitContext();
  const {
    brokerBaseUrl,
    setBrokerBaseUrl,
    clearError,
    clearLocalState,
    connect,
    conversationId,
    disconnect,
    hasActiveSession,
    lastError,
    messages,
    phase,
    rateLimitCooldownRemainingSeconds,
    resetConversation,
    sendMessage,
    session,
  } = useBackendBroker();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [draftResetReason, setDraftResetReason] = useState('');
  // Ergebnis der letzten circuit-actions-Ausführung (null = kein Banner)
  const [lastExecution, setLastExecution] = useState<{
    executed: number;
    errorCount: number;
  } | null>(null);
  const [pendingCircuitActions, setPendingCircuitActions] =
    useState<PreparedCircuitActions | null>(null);
  const [circuitActionErrors, setCircuitActionErrors] = useState<string[]>([]);
  const snapshot = useMemo(
    () => createBackendSandboxCurrentCircuitSnapshot(circuit),
    [circuit],
  );
  const snapshotSummary = useMemo(
    () => summarizeBackendSandboxCurrentCircuitSnapshot(snapshot),
    [snapshot],
  );
  const controlState = useMemo(
    () =>
      getBackendBrokerModalControlState({
        phase,
        hasActiveSession,
        apiKeyInput,
        draftMessage,
        sessionKeyCooldownRemainingSeconds:
          rateLimitCooldownRemainingSeconds.sessionKey,
        chatRequestCooldownRemainingSeconds:
          rateLimitCooldownRemainingSeconds.chatRequest,
        chatResetCooldownRemainingSeconds:
          rateLimitCooldownRemainingSeconds.chatReset,
      }),
    [
      apiKeyInput,
      draftMessage,
      hasActiveSession,
      phase,
      rateLimitCooldownRemainingSeconds.chatRequest,
      rateLimitCooldownRemainingSeconds.chatReset,
      rateLimitCooldownRemainingSeconds.sessionKey,
    ],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleConnect = async () => {
    await connect(apiKeyInput.trim());
    setApiKeyInput('');
  };

  const handleSend = async () => {
    setCircuitActionErrors([]);
    setLastExecution(null);
    const response = await sendMessage(draftMessage, snapshot, snapshotSummary);
    const result = prepareCircuitActionsProposal(response.message, circuit);
    if (result.status === 'ready') {
      setPendingCircuitActions(result.proposal);
    } else {
      setPendingCircuitActions(null);
      if (result.status === 'invalid') setCircuitActionErrors(result.errors);
    }
    setDraftMessage('');
  };

  const handleApplyCircuitActions = () => {
    if (!pendingCircuitActions) return;

    // The circuit may have changed while the preview was visible. Revalidate
    // against the latest state before the single atomic dispatch.
    const latest = prepareCircuitActionsProposal(
      pendingCircuitActions.sourceText,
      circuit,
    );
    if (latest.status !== 'ready') {
      setPendingCircuitActions(null);
      setCircuitActionErrors(
        latest.status === 'invalid'
          ? latest.errors
          : ['Die vorgeschlagenen Aktionen sind nicht mehr verfuegbar.'],
      );
      return;
    }

    const result = applyCircuitActionsProposal(latest.proposal, circuitDispatch);
    setPendingCircuitActions(null);
    setCircuitActionErrors([]);
    setLastExecution({ executed: result.executed, errorCount: 0 });
  };

  const handleReset = async () => {
    await resetConversation(draftResetReason.trim() || undefined);
    setPendingCircuitActions(null);
    setCircuitActionErrors([]);
    setDraftResetReason('');
  };

  const runBrokerAction = (promise: Promise<unknown>) => {
    void promise.catch(() => undefined);
  };

  const clearErrorOnUserEdit = () => {
    if (shouldClearBackendBrokerUiErrorOnUserEdit(lastError)) {
      clearError();
    }
  };

  return (
    <div
      data-testid="backend-broker-modal-overlay"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 px-3 py-4"
      onClick={onClose}
    >
      <div
        data-testid="backend-broker-modal"
        className="flex max-h-[calc(100vh-1.5rem)] w-[min(1100px,calc(100vw-1rem))] flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-800 px-4 py-3 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-mono text-sm font-bold text-slate-100">
                Broker Bridge
              </h2>
              <p className="mt-1 max-w-2xl text-xs text-slate-400">
                Key, Chat und Reset laufen hier ausschliesslich ueber den Broker.
                Es gibt keinen direkten Provider-Call aus der App.
              </p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 rounded border border-slate-700 px-2 py-1 text-xs font-mono text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-200"
            >
              Schliessen
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="min-h-0 overflow-auto border-b border-slate-800 p-4 lg:border-b-0 lg:border-r lg:border-slate-800">
            <div className="space-y-4">
              <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="font-mono text-xs font-semibold uppercase tracking-wide text-slate-300">
                    Verbindung
                  </h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-mono ${
                      hasActiveSession
                        ? 'bg-emerald-950/80 text-emerald-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {controlState.phaseLabel}
                  </span>
                </div>
                <label className="mb-1 block text-[11px] font-mono uppercase tracking-wide text-slate-500">
                  Broker Base URL
                </label>
                <input
                  data-testid="broker-base-url-input"
                  type="url"
                  value={brokerBaseUrl}
                  onChange={(event) => {
                    clearErrorOnUserEdit();
                    setBrokerBaseUrl(event.target.value);
                  }}
                  disabled={controlState.baseUrlDisabled}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-xs font-mono text-slate-200 outline-none transition-colors focus:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <p className="mt-2 text-[11px] text-slate-500">
                  Basis-URL ist waehrend einer aktiven Sitzung gesperrt, damit
                  Session und Broker-Endpunkt nicht auseinanderlaufen.
                </p>
              </section>

              <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                <h3 className="mb-2 font-mono text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Session
                </h3>
                {!hasActiveSession ? (
                  <>
                    <label className="mb-1 block text-[11px] font-mono uppercase tracking-wide text-slate-500">
                      API Key
                    </label>
                    <input
                      data-testid="broker-api-key-input"
                      type="password"
                      value={apiKeyInput}
                      onChange={(event) => {
                        clearErrorOnUserEdit();
                        setApiKeyInput(event.target.value);
                      }}
                      placeholder="sk-..."
                      disabled={controlState.apiKeyDisabled}
                      className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-xs font-mono text-slate-200 outline-none transition-colors focus:border-cyan-500"
                    />
                    <button
                      data-testid="broker-connect-button"
                      onClick={() => {
                        runBrokerAction(handleConnect());
                      }}
                      disabled={controlState.connectDisabled}
                      className="mt-3 w-full rounded bg-cyan-500 px-3 py-2 text-xs font-mono font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                    >
                      {controlState.connectLabel}
                    </button>
                  </>
                ) : (
                  <>
                    <dl className="space-y-2 text-xs">
                      <div>
                        <dt className="font-mono uppercase tracking-wide text-slate-500">
                          Session ID
                        </dt>
                        <dd className="mt-1 break-all font-mono text-slate-200">
                          <span data-testid="broker-session-id">
                          {session?.sessionId}
                          </span>
                        </dd>
                      </div>
                      <div>
                        <dt className="font-mono uppercase tracking-wide text-slate-500">
                          Gueltig bis
                        </dt>
                        <dd className="mt-1 font-mono text-slate-200">
                          {formatIsoTimestamp(session?.expiresAt)}
                        </dd>
                      </div>
                    </dl>
                    <button
                      data-testid="broker-disconnect-button"
                      onClick={() => {
                        runBrokerAction(disconnect());
                      }}
                      disabled={controlState.disconnectDisabled}
                      className="mt-3 w-full rounded border border-rose-700 bg-rose-950/40 px-3 py-2 text-xs font-mono font-semibold text-rose-200 transition-colors hover:bg-rose-900/50 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-500"
                    >
                      {controlState.disconnectLabel}
                    </button>
                  </>
                )}
              </section>

              <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                <h3 className="mb-2 font-mono text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Aktive Schaltung
                </h3>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded border border-slate-800 bg-slate-950/80 p-2">
                    <dt className="font-mono text-slate-500">Circuit</dt>
                    <dd className="mt-1 font-mono text-slate-200">
                      {snapshotSummary.circuitId}
                    </dd>
                  </div>
                  <div className="rounded border border-slate-800 bg-slate-950/80 p-2">
                    <dt className="font-mono text-slate-500">Selection</dt>
                    <dd className="mt-1 font-mono text-slate-200">
                      {snapshotSummary.selectedElementCount}
                    </dd>
                  </div>
                  <div className="rounded border border-slate-800 bg-slate-950/80 p-2">
                    <dt className="font-mono text-slate-500">Nodes/Gates</dt>
                    <dd className="mt-1 font-mono text-slate-200">
                      {snapshotSummary.nodeCount} / {snapshotSummary.gateCount}
                    </dd>
                  </div>
                  <div className="rounded border border-slate-800 bg-slate-950/80 p-2">
                    <dt className="font-mono text-slate-500">Wires</dt>
                    <dd className="mt-1 font-mono text-slate-200">
                      {snapshotSummary.wireCount}
                    </dd>
                  </div>
                </dl>
                <div className="mt-3 rounded border border-slate-800 bg-slate-950/80 p-2">
                  <div className="font-mono text-[11px] uppercase tracking-wide text-slate-500">
                    Snapshot Fingerprint
                  </div>
                  <div className="mt-1 break-all font-mono text-[11px] text-slate-300">
                    {snapshotSummary.snapshotFingerprint}
                  </div>
                </div>
              </section>

              {lastError && (
                <section
                  data-testid="broker-error-panel"
                  className="rounded-lg border border-amber-700/60 bg-amber-950/30 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3
                        data-testid="broker-error-title"
                        className="font-mono text-xs font-semibold uppercase tracking-wide text-amber-200"
                      >
                        {lastError.title}
                      </h3>
                      <p className="mt-2 text-xs text-amber-100/90">
                        {lastError.message}
                      </p>
                      {lastError.requestId && (
                        <p className="mt-2 font-mono text-[11px] text-amber-300/80">
                          requestId: {lastError.requestId}
                        </p>
                      )}
                      {typeof lastError.retryAfterSeconds === 'number' && (
                        <p className="mt-1 font-mono text-[11px] text-amber-300/80">
                          retryAfter: {lastError.retryAfterSeconds}s
                        </p>
                      )}
                    </div>
                    <button
                      data-testid="broker-clear-error-button"
                      onClick={clearError}
                      className="rounded border border-amber-700/60 px-2 py-1 text-[11px] font-mono text-amber-200 transition-colors hover:bg-amber-900/40"
                    >
                      OK
                    </button>
                    <button
                      data-testid="broker-clear-local-button"
                      onClick={clearLocalState}
                      className="rounded border border-slate-700 px-2 py-1 text-[11px] font-mono text-slate-300 transition-colors hover:bg-slate-900/40"
                    >
                      Lokal leeren
                    </button>
                  </div>
                </section>
              )}
            </div>
          </aside>

          <section className="flex min-h-0 flex-col">
            <div className="border-b border-slate-800 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-mono text-sm font-semibold text-slate-100">
                    Broker Chat
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Konversation bleibt lokal in der App und wird per Broker-Reset
                    wieder geloescht.
                  </p>
                </div>
                <div className="rounded border border-slate-800 bg-slate-950/80 px-3 py-2 text-[11px] font-mono text-slate-400">
                  conversationId:{' '}
                  <span data-testid="broker-conversation-id">
                    {conversationId ?? 'noch keine'}
                  </span>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
              {messages.length === 0 ? (
                <div className="flex h-full min-h-56 items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-6 text-center">
                  <div>
                    <p className="font-mono text-sm text-slate-300">
                      Noch keine Broker-Konversation aktiv
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Setze zuerst einen Key und sende danach eine Nachricht zur
                      aktuell geoeffneten Schaltung.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => (
                    <article
                      key={message.id}
                      className={`rounded-xl border px-3 py-3 ${
                        message.role === 'assistant'
                          ? 'border-cyan-800/60 bg-cyan-950/20'
                          : message.role === 'system'
                            ? 'border-amber-800/60 bg-amber-950/20'
                            : 'border-slate-800 bg-slate-900/70'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-[11px] uppercase tracking-wide text-slate-400">
                          {message.role}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          {formatIsoTimestamp(message.createdAt)}
                        </span>
                      </div>
                      {message.role === 'assistant' ? (
                        <div className="mt-2 text-sm text-slate-100">
                          <Markdown components={MARKDOWN_COMPONENTS}>
                            {stripCircuitActionsBlock(message.content)}
                          </Markdown>
                        </div>
                      ) : (
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-100">
                          {message.content}
                        </p>
                      )}
                      {message.model && (
                        <p className="mt-2 font-mono text-[11px] text-cyan-300/80">
                          model: {message.model}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>

            {circuitActionErrors.length > 0 && (
              <div
                data-testid="circuit-actions-validation-error"
                className="mx-4 mt-2 rounded-lg border border-amber-700/70 bg-amber-950/30 px-3 py-2 text-xs text-amber-100"
              >
                <p className="font-mono font-semibold">
                  Schaltungsvorschlag nicht anwendbar
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {circuitActionErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {pendingCircuitActions && (
              <div
                data-testid="circuit-actions-preview"
                className={`mx-4 mt-2 rounded-lg border px-3 py-3 text-xs ${
                  pendingCircuitActions.destructive
                    ? 'border-red-700/70 bg-red-950/30 text-red-100'
                    : 'border-cyan-700/70 bg-cyan-950/30 text-cyan-100'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono font-semibold">
                    Schaltungsaenderungen pruefen
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
                      pendingCircuitActions.destructive
                        ? 'bg-red-900 text-red-100'
                        : 'bg-cyan-900 text-cyan-100'
                    }`}
                  >
                    {pendingCircuitActions.destructive
                      ? 'Destruktive Aktionen enthalten'
                      : 'Noch nicht angewendet'}
                  </span>
                </div>
                <p className="mt-2 text-slate-300">
                  Der Modellvorschlag wird erst nach deiner ausdruecklichen
                  Bestaetigung als ein rueckgaengiger Schritt angewendet.
                </p>
                <ol className="mt-2 max-h-40 list-decimal space-y-1 overflow-auto pl-5">
                  {pendingCircuitActions.preview.map((item) => (
                    <li key={`${item.index}-${item.type}`}>
                      <span className="font-mono text-[11px]">{item.type}</span>
                      {item.destructive && (
                        <span className="ml-2 rounded bg-red-900/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-red-100">
                          destruktiv
                        </span>
                      )}
                      <span className="ml-2 text-slate-200">{item.description}</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <button
                    data-testid="circuit-actions-reject-button"
                    onClick={() => setPendingCircuitActions(null)}
                    className="rounded border border-slate-600 bg-slate-900 px-3 py-2 font-mono text-[11px] text-slate-200 transition-colors hover:bg-slate-800"
                  >
                    Verwerfen
                  </button>
                  <button
                    data-testid="circuit-actions-confirm-button"
                    onClick={handleApplyCircuitActions}
                    className={`rounded px-3 py-2 font-mono text-[11px] font-semibold transition-colors ${
                      pendingCircuitActions.destructive
                        ? 'bg-red-500 text-white hover:bg-red-400'
                        : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                    }`}
                  >
                    {pendingCircuitActions.destructive
                      ? 'Destruktive Aenderungen anwenden'
                      : 'Aenderungen anwenden'}
                  </button>
                </div>
              </div>
            )}

            {lastExecution && (
              <div
                className={`mx-4 mb-0 mt-2 flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs font-mono ${
                  lastExecution.errorCount > 0
                    ? 'border-amber-700/60 bg-amber-950/30 text-amber-200'
                    : 'border-emerald-700/60 bg-emerald-950/30 text-emerald-200'
                }`}
              >
                <span>
                  {lastExecution.executed} Befehl
                  {lastExecution.executed !== 1 ? 'e' : ''} ausgefuehrt
                  {lastExecution.errorCount > 0
                    ? ` · ${lastExecution.errorCount} Fehler (siehe Console)`
                    : ''}
                </span>
                <button
                  onClick={() => setLastExecution(null)}
                  className="shrink-0 opacity-60 hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="border-t border-slate-800 px-4 py-4">
              <div className="grid gap-3">
                <textarea
                  data-testid="broker-message-input"
                  value={draftMessage}
                  onChange={(event) => {
                    clearErrorOnUserEdit();
                    setDraftMessage(event.target.value);
                  }}
                  placeholder="Frage zur aktuell geoeffneten Schaltung..."
                  rows={4}
                  disabled={controlState.draftMessageDisabled}
                  className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-100 outline-none transition-colors focus:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <div className="flex flex-col gap-3 md:flex-row">
                  <input
                    data-testid="broker-reset-reason-input"
                    type="text"
                    value={draftResetReason}
                    onChange={(event) => {
                      clearErrorOnUserEdit();
                      setDraftResetReason(event.target.value);
                    }}
                    placeholder="Optionaler Reset-Grund"
                    disabled={controlState.draftResetReasonDisabled}
                    className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-200 outline-none transition-colors focus:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      data-testid="broker-reset-button"
                      onClick={() => {
                        runBrokerAction(handleReset());
                      }}
                      disabled={controlState.resetDisabled}
                      className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono text-slate-200 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-500"
                    >
                      {controlState.resetLabel}
                    </button>
                    <button
                      data-testid="broker-send-button"
                      onClick={() => {
                        runBrokerAction(handleSend());
                      }}
                      disabled={
                        controlState.sendDisabled || pendingCircuitActions !== null
                      }
                      className="rounded bg-cyan-500 px-4 py-2 text-xs font-mono font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                    >
                      {controlState.sendLabel}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
