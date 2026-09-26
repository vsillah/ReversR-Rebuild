# Production executable runner prerequisites

This source-only successor to PR #420 prepares a non-executable command-card
candidate and an adapter request/receipt boundary. The parent opening-preparation
and runner packets remain unchanged and valid. Their null executable command card
and false liveExecutionReady remain accurate. No production runner is mounted or
provided by this change; durable adapters and independent expiry remain unimplemented.

## Source mechanics

`prepareCommandCard` accepts only a closed schema of SHA-256 references and exact
UTC bounds. References bind approval, reviewed source, packet, rollup, provenance,
eight-category receipt bundle, immutable deployment, exact route, cohort, fresh
run, session, reviewer, restricted custody and rollback contract. Hash values are
opaque references; syntactic acceptance does not authenticate any evidence.
Canonical field ordering keeps the binding digest stable. The approval/run key is
independent of target/window so a future durable adapter must reject reuse even
when an attempted second request changes those fields.

The result is a data descriptor, with no shell command, callback, live mode or
execution entry point. Every operation carries the full binding digest. Preflight
must verify provenance, receipt categories, closed baseline, durable counters,
independent expiry/crash closure, rollback controls, observers and provider
readiness. Session/admission prechecks require the existing permission, cohort,
origin/CSRF, session expiry, payload metadata and separate authority requirements.
No booleans or hashes supplied here constitute approval or live proof.

`createReceiptRehearsal` snapshots the candidate, checks complete ordered receipt
shapes and rechecks trusted monotonic time at every forward transition. Start is
inclusive; expiry is exclusive. Unknown claim/attempt outcomes preserve simulated
tombstones and force close, revoke, tombstone verification and smoke. Invalid
rollback receipts restart ordered idempotent closure; they never permit forward
retry. Rollback remains possible after expiry. Smoke requires every parent case,
the pre-existing separately authorized fixture, exact target and healthy observers
with zero body reads, issued sessions, conversions and Sandbox dispatches.

Closeout contains only a digest, fixed statuses, counts and simulated flags. Even
successful rehearsal keeps cleanup, command-card issuance and live readiness
false. Restarting a rehearsal is not a durable reservation. No receipt authenticity,
real authentication, production concurrency or crash behavior is proven here.

## Review commands

- `node scripts/cad-auth-prod-executable-runner-checker.js`
- `node --test scripts/cad-auth-prod-executable-runner.test.js scripts/cad-auth-prod-runner.test.js scripts/cad-auth-prod-opening-prep.test.js`
- `node scripts/cad-convex-source-audit.js`
- `node scripts/cad-convex-contract-manifest.js`

The checker reads fixed public sources only. Its sole mutation option, `--write`,
regenerates the local source manifest; execution flags and arbitrary paths fail.

## Remaining gates

Captain source review and integration come next. A separately reviewed durable
adapter must implement atomic cross-process claims, one-session/attempt counters,
independent expiry, crash closure and idempotent rollback before live readiness can
be proposed. It must independently authenticate fresh receipts and bind real
session/admission checks to the deployed fence. Then a fresh explicit exact-window
human approval must bind the reviewed commit, packet, immutable deployment/route,
cohort, fresh run and rollback/smoke contract. Command-card issuance, session
issuance, activation and body admission/read remain separate gates.

No live Auth/provider tests, live evidence, private CAD, conversion, Sandbox,
provider/env/resource/billing changes, secrets, external messages, retry, second
live run or commercial-readiness claim are supplied or authorized. No UI or runtime
routes changed; no deployment or production smoke was performed by this lane.
