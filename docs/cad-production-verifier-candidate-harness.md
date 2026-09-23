# CAD production verifier candidate and evidence harness

Status: source-only, inert, pending captain review. Base: PR #383 merge
`b885f1f9a569b5bfa5627858cbb1542342b7da43`. No concrete provider verifier is
accepted, installed or selected. No live evidence has been collected.

## Source boundary

`offline/cad-convex/productionVerifierCandidate.js` composes the existing
`server/cadProductionSessionVerifierBinding.js` with an operation deadline.
Explicit `reviewEnabled: true` and two injected read-only functions permit local
review; defaults inspect neither request nor credentials. `configured` remains
false even after synthetic success, so this object cannot enable gateway
issuance. No production route imports it and no environment selector exists.

The dependency contracts remain those of the existing binding:

- `readAuthenticatedSession(headers, {signal, deadlineAt})` must eventually be
  backed by verified provider identity and fresh exact session/owner reads.
- `readAuthorization(identity, {signal, deadlineAt})` must eventually freshly
  read selected-shop membership and CAD permission in that user's context.

This slice supplies synthetic readers only in tests. It neither implements
cryptographic verification nor treats dependency return values as provider
proof. Existing `convex/librarySession.ts` uses Auth SDK identity plus session
and owner point reads, but its reviewed development/password restriction is
not a production method mapping. Existing `offline/cad-convex/backend.js`
checks `cadUserAuthority` and `cadMemberships`, active/permission state and
matching generations. These are source patterns, not new production adapters.
The service-authenticated Convex HTTP gateway is not a user-auth context.
No Convex function, schema, auth table or validator changes are introduced.

The candidate snapshots bearer headers in the existing request-local binding.
Each resolve/refresh gets its own AbortController, wall-clock deadline (maximum
800 ms), monotonic elapsed-time guard, and cancellation race. Checks before and
after both readers prevent a late session result from starting authorization
and prevent a late authorization result from yielding a grant. Signals are
aborted and listeners/timers cleaned up on completion. Clock rollback and exact
deadline equality fail closed. All failures use `AUTH_UNAVAILABLE`.

JavaScript cannot preempt a synchronously blocked event loop or undo an injected
dependency's side effects. Dependencies must be nonblocking and read-only;
provider cancellation and no-side-effect behavior remain uncollected acceptance
evidence. The timer is a source candidate, not a production liveness guarantee.

## Evidence preparation

`docs/cad-production-verifier-evidence-template.json` expands all twelve PR #383
categories into individual case IDs with resolve/refresh paths and placeholders
for expected/observed outcome, exact candidate/deployment/test version, UTC
execution time, evidence reference/digest and reviewer disposition. Category
requirements retain the authoritative acceptance wording. A separately reviewed
case plan must specify each expected observation before future live collection.
Some observations (provider metadata, actual-route ordering and reviewer
provenance) are inspection tasks rather than calls to the candidate API.

Local synthetic results prove only source behavior. They are reported by the
Node test runner and are never written into provider evidence. In particular,
request getter traps are not actual-router evidence. Required pre-acceptance
upload-body bytes are zero; observed bytes stay null and actual-route
instrumentation stays false/NOT_COLLECTED.

The checker validates a strict, pending template and the unchanged PR #383
acceptance contract. It hashes the candidate, tests, checker and acceptance
packet. It rejects changed sources, missing cases, extra fields, populated
receipts, completed observations, activation claims and all supplied approval
windows, including stale/historical and future windows. There is no accepted
mode and no live collector. `ok: true` means only source-template validity.
Future collection requires a separate approved packet and validator; do not
fill this pending template and interpret checker failure as a runtime gate.

## Validation and next gate

Run:

```sh
node --test scripts/cad-production-verifier-candidate.test.js scripts/cad-production-verifier-evidence.test.js
node scripts/cad-production-verifier-evidence-checker.js
node --test scripts/cad-production-auth-verifier-acceptance.test.js scripts/cad-production-session-verifier-binding.test.js scripts/cad-gateway-exact-session-bridge.test.js scripts/cad-upload-session-gateway-service.test.js scripts/cad-internal-admission-opening-bundle-checker.test.js
node scripts/cad-convex-source-audit.js
node scripts/cad-convex-contract-manifest.js
git diff --check
```

The manifest includes all new files. Production verifier binding, session bridge,
upload router and acceptance packet remain unchanged. The pre-existing
`cad-user-upload-admission.test.js` malformed-versus-disabled expectation is
outside this slice. No UI or build output changes require browser QA.

Next: captain source review of the draft PR. Provider implementation and evidence
collection still need a separate bounded gate naming exact source/deployment,
read-only authenticated-context semantics, fresh window, permitted synthetic
identities, sanitized evidence custody and stop conditions. Issuance, runtime
installation/activation and upload-body admission remain independently blocked.
No provider/env/resource/billing changes, secrets, live Auth tests, real session
issuance, body reads, uploads, conversion, Sandbox dispatch, private CAD,
commercialization, external messages, second live run/retry or deployment were
performed by this work. Expenses: US$0.
