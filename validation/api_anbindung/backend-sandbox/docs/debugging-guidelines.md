# Debugging Guidelines

These rules apply to the sandbox broker while the provider path is still isolated and not yet connected to a live upstream.

## Required debug trail

- keep structured debug statements in the `chat/request -> provider-gateway -> provider-client` path
- preserve correlation fields such as `requestId`, `sessionId`, and `conversationId`
- keep policy-block, rate-limit, audit, and provider breadcrumbs aligned to the same request/session/conversation context
- keep provider diagnostics such as `provider`, `model`, `attemptCount`, `timeoutMs`, `allowedHosts`, `retryBackoffMs`, and `dispatchMode`
- keep prompt diagnostics at metadata level only, for example `promptFingerprint`, rendered byte size, section counts, and template version
- route-boundary logs must use a flat summary field set and may not forward arbitrary provider debug payloads wholesale
- local app-bridge and current-circuit logs must stay on safe summary fields such as `providerId`, `providerMode`, `circuitId`, and element counts, never raw file payloads or absolute snapshot paths
- local app-bridge breadcrumbs must include the active sandbox `sessionId`, but never bypass session checks just because the route is marked as local or debug-only
- when changing debug fields, update the matching tests and this document in the same sandbox change

## Secret handling

- never log raw API keys
- never log full hidden instructions or raw provider credentials
- avoid logging full rendered prompts unless a later approved integration step explicitly requires it
- prefer fingerprints, lengths, counters, and allowlisted host names over raw sensitive text
- nested error details and audit payloads must be redacted or mapped to a safe subset before logging or returning them

## Expected log points

- request enters the sandbox dispatch flow
- session-key rate limit is evaluated
- session-key registration is blocked by sandbox rate limit
- chat request passes sandbox policy
- sandbox policy blocks a request with normalized violation data
- provider gateway request is staged
- provider gateway dispatch attempt starts
- provider gateway retry is scheduled
- provider gateway response is received
- provider gateway dispatch fails with normalized error data
- route-level response logging includes only a flat provider debug summary
- chat reset completion emits structured breadcrumbs
- local app bridge capability and current-circuit requests emit only safe provider-summary breadcrumbs

## Future integration note

When a real provider is attached later, this debug trail should be extended, not removed. The live integration should keep the same correlation fields so sandbox and real traces remain comparable.
