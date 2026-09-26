# CAD Auth production runner source implementation

This implements the offline state machine for the PR #419 contract at
`07b57a96f3243826743f9ea3361056b7e7385eed`. Production sources remain unchanged.
The runner is disabled, unmounted and has no live mode, adapters, effect callbacks,
credential access, session issuance, body access, provider calls or command cards.

## Local review

- `node scripts/cad-auth-prod-runner-checker.js` verifies the source packet.
- `node scripts/cad-auth-prod-runner-checker.js --dry-run` exercises fixed public synthetic data.
- `node --test scripts/cad-auth-prod-runner.test.js scripts/cad-auth-prod-opening-prep.test.js`
- `node scripts/cad-convex-source-audit.js`
- `node scripts/cad-convex-contract-manifest.js`

The checker only reads fixed public repository sources. `--write` regenerates its
source manifest. Arbitrary paths, approval strings and execution flags are rejected.
No test or check accepts private receipts or requires runtime configuration.

## Mechanics and limits

The factory snapshots a validated synthetic plan. Each ordered step requires an
exact match of its complete binding, named checks, trusted monotonic timestamp and
zero observer deltas. Before every forward transition it enforces inclusive start,
exclusive expiry and a finite approved duration. Target, packet, source, run,
cohort, session, reviewer and approval bindings cannot change mid-sequence.

Preflight checks cover the closed baseline, receipt/provenance categories,
independent expiry, rollback, observers and provider readiness. Session checks
cover authentication, permission, cohort, origin/CSRF, expiry/revocation, payload
metadata and separate capability authority. These are synthetic assertions only;
this code does not authenticate anyone or verify real receipts.

The local model consumes one run and one attempt. Unknown claim outcomes retain
local tombstones and block further forward steps. Failure requires ordered CLOSE,
REVOKE, TOMBSTONES and SMOKE transitions. Closure can run after expiry; it cannot
reopen admission. Missing or altered smoke cases and nonzero observer deltas block
simulated cleanup. Completed runners cannot run again. A failed runner remains
marked stopped even when simulated closure is later verified.

The in-memory factory is intentionally not a durable concurrency ledger. Creating
another factory does not reserve another production run. This gate supplies no
independently enforced expiry or production crash recovery implementation. A later
reviewed adapter must prove durable atomic claims across processes and restarts,
one-session/attempt counters and independent server-side expiry before live use.
The model's simulated fence never changes the actual production fence.

## Rollback and production follow-through

The required order remains: close admission, revoke session/pending grants,
preserve consumed tombstones, verify exact-target closure and late-grant denial,
then verify every post-rollback smoke case from PR #419. Require the separately
authorized existing synthetic fixture and healthy target-bound observers, with
zero body reads, sessions issued, conversions and Sandbox dispatches. Responses
alone cannot prove closure. Missing proof, unknown closure, or failed smoke stops
cleanup and requires a decision; no retry or second live run is authorized.

The Integration Captain may review, merge on green checks, deploy normally from
main and run the already-authorized production fail-closed smoke. No deployment
or live smoke is claimed by this source lane. If that smoke needs credentials,
new fixtures/sessions, runtime configuration or unapproved evidence collection,
stop and report the missing prerequisite. No UI changed, so viewport QA is outside
this implementation scope.

## Next gate

No new phrase is needed for the approved source review and green-check integration.
A live opening remains blocked on reviewed runtime adapters and a fresh explicit
exact-window approval binding the packet, reviewed commit, immutable deployment,
fresh production run, cohort, window and rollback contract. The unresolved phrase
in `docs/cad-auth-prod-opening-prep.json` remains the reference; this change does
not fill or issue it. Session issuance, activation and body admission each need
separate explicit authority. Source validation never confers live or commercial
readiness. Provider/env/resource/billing changes, secrets, conversion, Sandbox,
private CAD, live evidence, external messages and retries remain excluded.
