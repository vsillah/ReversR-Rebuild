# CAD Auth Runtime Install Current Binding

Roadmap status: 5/6 complete. Step 6 remains closed, but this gate addresses
the stale deployment-binding loop that blocked the approved live-opening
attempt.

## What Changed

- Added a source-only current deployment metadata reader that accepts only
  allowlisted non-secret Vercel system metadata for the production `main`
  deployment of `vsillah/ReversR-Rebuild`.
- Added a disabled-by-default current-deployment runtime install binding helper
  that can construct an exact installable production execution binding from
  reviewed source plus current deployment metadata.
- The default production path still exports a disabled
  `PRODUCTION_BINDING_INSTALLATION`; no route, request, environment toggle, or
  provider setting opens upload admission.
- The checker proves the default path stays fail-closed and the prepared helper
  can resolve a non-null binding only when explicit live-gate inputs are
  supplied in a controlled source-owned call.

## Closed Controls

This packet does not authorize provider, environment, resource or billing
changes; secrets or secret reads; private evidence reads; upload-session
issuance; production upload activation; request-body admission or reads beyond
fail-closed smoke; conversion; Sandbox dispatch; private CAD use; live evidence
collection; runtime installation activation; executable command-card issuance;
external messages; retries; second live runs; real-user commercialization; or a
commercial-readiness claim.

## Next Gate

After public review, merge, production deployment, and fail-closed smoke, the
next gate must verify that the deployed source can derive the current production
deployment binding from allowlisted system metadata, then compute the exact
command-card SHA-256, installation SHA-256, fresh UTC opening window, and later
live-opening approval phrase. If current deployment metadata is missing or
untrusted, stop instead of producing another live-opening phrase.
