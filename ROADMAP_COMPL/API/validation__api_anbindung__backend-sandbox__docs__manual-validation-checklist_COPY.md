# Manual Validation Checklist

Use this checklist when the scaffold is ready for a later implementation pass.

## API0 checks

- confirm the sandbox builds as an isolated project
- confirm the route shells expose only the intended placeholder endpoints
- confirm `POST /v1/chat/request` only accepts a session-bound reduced active-circuit payload
- confirm `POST /v1/chat/reset` only clears sandbox-local conversation history for the bound session
- confirm session and chat contracts reject unknown fields
- confirm the local app-bridge contract can map an app-near open-circuit snapshot onto the existing sandbox chat/reset contracts without importing active-app code
- confirm `CurrentCircuitSnapshotProvider` can be swapped from fixture to a later real adapter without changing chat or circuit modules
- confirm the file-backed current-circuit adapter reads only sandbox-local JSON snapshots, rejects lexical path escapes outside `backend-sandbox`, and also rejects symlink/junction escapes after real-path resolution
- confirm missing snapshot files return the documented unavailable/not-found behavior without leaking filesystem paths
- confirm invalid JSON and schema-invalid snapshot files fail with normalized sandbox errors instead of raw parse details
- confirm expired sessions cause the associated in-memory key material to be redacted even when no later route touches the session again
- confirm circuit-context mapping only accepts the whitelisted surface
- confirm policy blocks stop prompt construction before any provider step would happen
- confirm session-key, chat-request, and chat-reset rate limits can return `429` inside the sandbox without leaking secrets
- confirm audit events exist for session registration/deletion, chat request/completion/reset, provider dispatch, and rate-limit blocks
- confirm recursive redaction removes nested `apiKey`, `authorization`, `token`, and URL credential values from logs and HTTP error details
- confirm structured debug logs contain correlation IDs, provider attempt data, and prompt fingerprints but no secrets
- confirm no active app files are imported or modified

## API1 checks

- confirm the sandbox can later be linked to the app through a dedicated integration step
- confirm the future active-app adapter can target the local app-bridge contract instead of bypassing sandbox contracts
- confirm local app bridge routes stay disabled unless explicitly enabled for sandbox validation
- confirm enabled local app bridge routes still require an active `x-session-id` and reject stale or missing sessions
- confirm later live adapters can replace the file adapter at the `CurrentCircuitSnapshotProvider` edge without changing route contracts
- confirm key/session flows are still bounded to the broker
- confirm request and error payloads do not expose secrets
- confirm smoke tests cover the intended key, chat, and reset flow

## API2 checks

- confirm audit events and redaction remain consistent
- confirm provider access stays behind a single gateway boundary
- confirm guardrails can block disallowed prompt patterns before provider dispatch
- confirm rate-limit and policy-block breadcrumbs still match the documented debug trail after integration work
- confirm the documented debug trail still exists after provider integration work
- confirm the test harness can grow into unit, integration, and smoke coverage

## Notes for later validation

- this checklist is for future manual validation, not for active integration now
- if a validation step would require touching files outside `backend-sandbox`, treat it as a TODO instead of making the change
