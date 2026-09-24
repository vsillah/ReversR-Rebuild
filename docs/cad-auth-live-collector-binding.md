# CAD Auth live collector binding packet

Status: source-only. This packet records the exact reason the approved September
24, 2026 read-only synthetic evidence window stopped with `MISSING_PREREQUISITE`.
It adds a guarded precheck source that makes future missing runtime bindings
machine-checkable, but it does not run live evidence or issue an executable
collector command card.

The guarded source is `offline/cad-auth-live-collector-binding/guardedCollector.js`.
It accepts only inert JSON precheck facts, checks the exact approved UTC window,
merge commit, packet digests and sealed-card state, and returns a sanitized stop
receipt. It never reads environment variables, secrets, requests, bodies or files;
never calls provider APIs; never issues upload sessions; and never changes runtime
state. Even if every named binding is marked present, it still stops with
`LIVE_COLLECTOR_STILL_NOT_AUTHORIZED` until a separately reviewed executable
command card exists.

The current approved window was `2026-09-24T13:00:00Z` through
`2026-09-24T13:30:00Z`. The Captain woke inside the window and produced a local
ignored stop receipt at:

`.local/cad-auth-live-evidence-runs/20260924T132411Z/stop-receipt.json`

That receipt is local-only and sanitized. It is not committed and does not contain
tokens, account identifiers, provider responses, request bodies or private CAD.

## Missing bindings

Live collection remains blocked until all of these have independently reviewed
receipts and are bound into a fresh sealed executable card:

- Concrete provider runtime binding.
- Executable collector command.
- Restricted synthetic cohort receipt.
- Custody and independent reviewer receipt.
- Durable consumed-run ledger.
- Installed route/body observer.
- Late-grant observer.
- Immutable target recheck receipt.

The existing offline provider adapter, receipt collector and route instrumentation
are useful source foundations, but they are not live runtime bindings. Source-only
checks cannot be presented as live provider evidence.

## Local validation

```sh
node scripts/cad-auth-live-collector-binding-checker.js
node --test scripts/cad-auth-live-collector-binding.test.js scripts/cad-auth-live-evidence-sealed-card-prep.test.js scripts/cad-auth-live-evidence-acceptance.test.js scripts/cad-auth-sealed-setup.test.js
node scripts/cad-convex-source-audit.js
node scripts/cad-convex-contract-manifest.js
git diff --check
```

No live Auth/provider tests, provider/env/resource/billing changes, secrets or
secret reads, upload-session issuance, production upload activation, request-body
admission/read, conversion, Sandbox dispatch, private CAD, real-user
commercialization, external messages, retries, second run, runtime activation or
commercial-readiness claim is authorized by this packet.
