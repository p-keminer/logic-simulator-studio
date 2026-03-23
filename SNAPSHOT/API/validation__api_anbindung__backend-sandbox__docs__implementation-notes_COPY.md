# Implementation Notes

This sandbox is a standalone backend scaffold for the planned API connection. It is intentionally not wired into the active app and does not perform any real provider calls.

## Roadmap mapping

- `API0`: foundation work that must exist before any live provider usage
- `API1`: app integration, staging, and smoke validation
- `API2`: hardening, multi-provider evolution, and post-pilot improvements

## What is scaffolded

- isolated backend project layout for a future Node.js service
- Fastify entry points and route shells
- shared config, error, result, and request-context helpers
- contract placeholders for session, chat, error, and circuit-context payloads
- session-bound chat request staging that validates a reduced active-circuit payload
- local prompt templates plus sandbox-only in-memory conversation history and reset handling
- provider-neutral gateway staging with structured debug metadata, retry diagnostics, and normalized sandbox failures
- local in-memory rate limits, audit events, metrics counters, and recursive secret redaction across session, chat, reset, and provider paths
- a local app-bridge seam that maps a future "currently open circuit" snapshot onto the existing sandbox chat and reset contracts without importing the active app
- a dedicated `CurrentCircuitSnapshotProvider` port with a fixture adapter, a sandbox-local file adapter, and opt-in handshake routes so a later live app adapter stays isolated at one edge
- module boundaries for auth, guardrails, prompt orchestration, provider gateway, and audit
- documentation and test harness folders that can be expanded later

## What is intentionally missing

- active frontend integration
- real provider credentials or network calls
- production secrets handling
- business logic beyond small placeholders and interfaces
- any file changes outside `backend-sandbox`

## Local assumptions and TODOs

- only the currently open circuit is in scope
- circuit payloads should stay behind a strict field whitelist
- session and API key handling should remain session-bound and redacted
- session TTL must actively redact abandoned key material even when no later route touches the expired session again
- provider selection should stay behind a neutral gateway interface
- prompt assembly should remain separated into system, circuit, history, and user parts
- future app integration should enter through a local bridge contract first, not by importing active-app runtime types directly
- the current-circuit access path should stay behind a provider port and may return `null` when the snapshot is unavailable
- file-backed current-circuit snapshots must stay inside `backend-sandbox` and must never dereference paths outside the sandbox root
- file-backed current-circuit snapshots must re-check the resolved real path before reads so symlinks or junctions cannot escape the sandbox root
- chat requests should fail before provider dispatch when session checks or guardrails reject them
- local reset/history behavior is only a sandbox contract and not yet a production retention strategy
- structured debug statements are part of the sandbox contract and should survive later provider hookup work
- rate limits, audit sinks, and metrics remain intentionally in-memory and per-sandbox-instance for now
- persistence and deployment wiring remain future work

## Debugging policy

- keep route-level and gateway-level correlation fields aligned through `requestId`, `sessionId`, and `conversationId`
- log only safe prompt metadata such as fingerprints, byte counts, template version, and section counts
- keep rate-limit and policy-block breadcrumbs visible through request kind, retry-after, and safe bucket metadata
- keep retry, timeout, allowlist, and normalized provider-error data visible in structured logs
- keep local app-bridge route logs limited to safe provider metadata and current-circuit summary fields, never raw file contents or absolute paths
- run nested error details through redaction or explicit safe-subset mapping before they reach logs or HTTP bodies
- never log raw API keys or full provider credentials

## Test structure intent

- `tests/unit`: fast isolated checks for helpers and pure functions
- `tests/integration`: route and module interaction tests with mocked dependencies
- `tests/smoke`: minimal end-to-end sanity checks for the sandbox only, including the local app-bridge seam

## Local app bridge route policy

- local app bridge routes are opt-in and stay disabled unless `enableLocalAppBridgeRoutes` is explicitly set
- local app bridge routes require an active sandbox session via `x-session-id` even when they are explicitly enabled
- when enabled without an injected provider, the sandbox may fall back to the fixture provider only inside this sandbox
- when `currentCircuitSnapshotFilePath` is configured, the sandbox may use a local JSON snapshot file inside `backend-sandbox` as an adapter-only bridge source
- `GET /v1/local-app-bridge/current-circuit` should return `404` when no current snapshot is available
- invalid JSON or schema-invalid file snapshots should fail as normalized sandbox errors without leaking filesystem internals

## Integration boundary

This scaffold is a preparation layer only. The active app, root build setup, and existing planning docs remain untouched until a later, explicitly approved integration step.
