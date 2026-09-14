# CAD durable engine implementation candidate

Base: `8f6b5a512917bdef75b16d5ddad6bf39b5e36cdc` (PR #208).
Branch: `codex/cad-durable-engine-implementation`.
Status: local source and tests complete; publication and live qualification blocked.

## Implemented source path

This slice adds a real bounded transaction engine for the future synthetic metadata
qualification run. `durableEngine.js` owns the ledger transition inside a host
serializable transaction. The Convex binding in `cadDurableEngine.ts` registers only
internal queries and mutations; no public Convex function, HTTP route, application
component or upload handler imports the adapter or runner.

The ledger stores one immutable six-digest scope, bounded control state, exact
four-field selectors, command/proposal receipts, generation-CAS custody claims and
persisted cursor progress. Four authority rows—login, upload session, membership and
permission—are point-read in the same transaction. Missing, duplicated, expired or
revoked dependencies deny the operation. Reservation, both concurrency leases, the
full integer-microdollar hold, selector and receipt commit together. Unknown outcomes
retain the hold and leases. Clock rollback, revision exhaustion, scope drift, stale
revision, stale claim and oversized pages fail closed.

`durableEngineAdapter.js` binds the reviewed internal function references and
sanitizes every result. A mutation transport failure stops the adapter as
`OUTCOME_UNKNOWN`; it never retries the write. `durableEngineRunner.js` allows only
the nine enumerated metadata operations, caps a run at 256 logical commands and 768
transaction attempts, accepts at most a 5-second transaction deadline, and retries
only explicit conflicts at 100/250 ms. There is no CLI, default destination,
credential resolver, environment reader, approval parser, automatic resume or route
wiring.

## Evidence boundary

The adapter invokes the predecessor synthetic evidence inspector before settlement.
A matching synthetic receipt is explicitly rejected because the inspector never
authenticates independent evidence. The Convex function binding also supplies a
literal-false independent verifier, so deployed source cannot settle a hold from a
caller assertion. The engine contract supports settlement only when a separately
reviewed verifier returns an exact selector-bound evidence digest, terminal outcome
and integer actual cost. Binding that verifier remains a later source review and
qualification gate.

Local tests use the same engine code with a deterministic transaction-store fixture.
They cover stale CAS, shared cost retention, all four authority dependencies,
revocation before fencing, unknown-outcome custody, verified and unverified evidence,
idempotent/conflicting settlement, 40-row cursor pagination, safe stop, bounded retry
and the literal-false upload route. These tests do not prove Convex isolation,
durability, restart behavior, evidence authenticity or a live resource.

## Preserved gates and remaining risks

`POST /api/cad/user-import` still has `BODY_ADMISSION_AUTHORIZED = false` before body
subscription. The default `cad-live-runner.js` C0-C4 command remains blocked. No CAD
bytes, conversion code, Sandbox dependency, external request, provider client,
credential, environment value or live resource is introduced.

The source candidate does not qualify backup/restore, store restart or window
rollover. The bounded ledger uses one document for at most 64 synthetic records;
live review must verify document and transaction limits, index isolation, concurrent
authority deletion, acknowledgement loss, cursor restart, claim reassignment and
actual engine receipts. A trusted independent evidence verifier, existing isolated
resource, exact private command records, unused run identity, trusted clock and stop
owner, enforceable all-in cap, accepted custody and the complete one-run approval are
still required.

## Validation

```sh
node --test scripts/cad-durable-engine-atomicity.test.js scripts/cad-durable-engine-source.test.js scripts/cad-durable-engine.test.js scripts/cad-durable-evidence-binding.test.js scripts/cad-live-runner.test.js scripts/cad-runner-command-cards.test.js scripts/cad-live-run-approval-packet.test.js scripts/cad-shared-controls-adapter-qualification.test.js scripts/cad-upload-shared-controls.test.js scripts/cad-user-upload-admission.test.js scripts/cad-user-upload-route.test.js
npm run typecheck
node scripts/cad-convex-codegen.js --check
node scripts/cad-convex-contract-manifest.js --write
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

No Convex push, provider call, route probe, CAD operation, UI test or expense belongs
to this source-only validation.

## Next gates

Publication is the immediate human gate. The captain substitutes the final reviewed
local commit:

> Approve pushing only commit [full reviewed SHA] from codex/cad-durable-engine-implementation to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only CAD durable engine, internal adapter/runner and evidence-binding integration. No merge, deployment, live tests, production/development env or provider/auth/resource changes, secrets, usage/billing changes, enrollment, email/SMS/Slack, store mutation, CAD upload activation, CAD conversion, private CAD, Sandbox dispatch or branch/worktree cleanup.

After publication and review, the live qualification request must use the complete
one-run wording in `cad-live-dev-run-execution-plan.md`. It is not presentable until
the exact resource, source SHAs, command bytes/digests, verifier, evidence custody,
cost enforcement, UTC window, stop ownership and disabled-route plan are resolved.
