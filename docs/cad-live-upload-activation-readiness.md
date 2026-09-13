# CAD live user-upload activation readiness

Status: source-only packet; uploads disabled, execution unapproved, expense $0.
Base: `bf983bdad89d4373fd3000fb5e4474f593bd27db`.
Branch: `codex/cad-live-upload-activation-readiness`.
Worktree suffix: `ReversR-Rebuild.worktrees/cad-live-upload-activation-readiness`.

## What this packet establishes

[The manifest](../offline/cad-convex/userUploadActivationReadiness.json) inventories
nine separate approval gates with unresolved evidence slots. Every approval is
false; all authority references are null. It is a review checklist, never an
execution authorization or runtime configuration. Filling a field or passing a
test cannot enable admission. No production, development or provider state was
queried by this lane. Historical deployment receipts are not fresh evidence.

Current source at the base has these boundaries:

| Surface | Existing source behavior | Evidence still required |
| --- | --- | --- |
| `POST /api/cad/user-import` | Session verification followed by terminal 503 `USER_UPLOADS_DISABLED`; no body parser or executor | Reviewed runtime implementation and explicit activation |
| Upload session service | Refreshes exact `loginSessionId`, user/shop, auth method, permission and expiry on lookup | Verified live transport, current authority, concurrent revocation enforcement |
| Worker input validator | Pure IGES shape, filename, canonical base64 and size checks; external-reference rejection | HTTP streaming/type/encoding/MIME layer and complete downstream admission |
| Sandbox limits | Source constants and existing operator executor | Exact future executor qualification, shared controls, cleanup and cost evidence |
| Retention/private adapters | Offline fixtures and closed readiness packets | Durable ownership, lockout, reconciliation and supported disposition evidence |

This adds source/limit regressions and pure payload rejection tests. It does not
implement an enabled upload pipeline. Existing route tests exercise loopback HTTP
with synthetic adapters and zero conversion/body reads. Existing session tests
use synthetic test-only stores; no provider store is contacted or mutated.

## Ordered admission contract for future implementation

Preserve the [upload contract](cad-user-upload-contract.md) and mounted response
precedence. Set no-store first; handle method/CORS rejection; verify credentials
before subscribing to body events. Invalid/expired/revoked or mismatched identity
returns 401 `USER_SESSION_REQUIRED`; unavailable authority returns 503
`USER_AUTH_UNAVAILABLE`; denied CAD permission returns 403 `USER_UPLOAD_FORBIDDEN`;
cookie Origin/CSRF failure returns 403 `ORIGIN_OR_CSRF_REJECTED`. Authenticated
requests currently return 503 `USER_UPLOADS_DISABLED` even for malformed bodies.

1. Read the exact server-owned login session on every request. Require its active
   owner, current user/shop membership, explicit CAD permission, authentication
   method, expiry and upload-session binding. Another active login for the same
   user cannot substitute for the bound login. Logout, revocation, membership
   loss, permission loss, timeout and unavailable authority deny admission. No
   caller profile, operator token, cached positive grant or account row suffices.
2. Reject duplicate credentials and ambiguous cookie/bearer combinations. Cookie
   sessions need an exact HTTPS Origin allowlist and session-bound CSRF digest;
   native bearer transport requires its own reviewed contract. Never fall back
   from a failed bearer to cookies. API CORS is not cookie authorization.
3. Only a separately reviewed server implementation may introduce a default-false
   user gate. Operator capabilities or environment presence confer no user access.
   Recheck current authority at the reservation/dispatch boundary with a reviewed
   transactional fence so revocation during queueing cannot reuse stale permission.
4. Before decoding, reserve atomic cross-instance user/shop concurrency, attempt
   rate and an enforceable all-in cost cap. Proposed initial ceilings: one request
   per user/shop and five attempts per user/minute. No budget is approved here.
   Missing controls return 503 `UPLOAD_CONTROLS_UNAVAILABLE`; exhaustion returns
   429 `UPLOAD_LIMIT_REACHED`. Define bounded lease expiry and idempotent retries.
5. Require uncompressed JSON, streaming 384 KiB cap including chunked requests and
   dishonest Content-Length, then exactly `fileName`, `mimeType`, `contentBase64`.
   Reject arrays, extra fields, empty/unsafe names, paths, unsupported extensions
   or MIME, noncanonical base64 and more than 256 KiB decoded. Enforce encoded
   length before allocation. Generic MIME requires IGES extension/content. Remove
   only validated MIME metadata before invoking `cadWorkerContract.upload`.
   Wrong type/encoding is 415, size is 413, malformed JSON is 400. The current pure
   worker accepts two fields; it does not implement this three-field HTTP layer.
6. Dispatch only after all prior gates with reviewed Sandbox assets/executor:
   1 vCPU, 2048 MB, deny-all network, 60 s lifetime, 45 s request, 10 s command,
   5 s cleanup; 1 MiB output, 16 meshes, 20,000 vertices and 10,000 triangles.
   Propagate cancellation. Unknown dispatch/cleanup outcomes keep reservations
   and block retries until reconciliation; lease expiry alone cannot prove cleanup.
7. Return fixed allowlisted errors without diagnostics, filenames, paths, payloads,
   credentials or provider exceptions. Sentinel tests must cover responses, logs,
   telemetry and receipts, including timeout, aborted and unknown-write branches.
   Capability UI must independently say user uploads unavailable while disabled.

Future acceptance must cover the full synthetic enabled pipeline (including
chunking, parser errors, concurrent revocation, shared quota, cancellation and
unknown cleanup). Pure worker tests and disabled-route tests cannot substitute
for those missing integration tests or real provider qualification.

## Dependencies and rollback gates

Carry forward unresolved evidence from [development execution readiness](cad-live-dev-auth-execution-readiness.md),
[bounded retention](cad-bounded-retention-policy.md), and
[private register adapters](cad-lockout-private-register-adapters.md).
Development Auth evidence or accepted bounded retention does not authorize real
users, uploads or conversion. Session invalidation is not user/account deletion.

Before requesting live action, appoint executor/backup; bind immutable project,
environment, release, command hashes, cohort, time window, fixture scope, maximum
attempts and all-in cost to one reviewed run manifest. Require provider-supported
disposition or separately approved bounded retention, durable register custody,
lockout and reconciliation. Keep private evidence outside the public packet;
record only sanitized opaque references. Any missing, stale, mismatched, expired
or ambiguous evidence closes the gate; a changed commit/destination needs review.

Rollback must be executable and verified before activation approval:

1. Name a compatible disabled release and exact reviewed rollback commands.
2. Close admission first; fence new requests across instances and drain/cancel
   registered work without losing unknown-outcome reservations.
3. Confirm Sandbox termination, account for reservations, revoke affected sessions
   through the approved provider mechanism, and reconcile all unknown writes.
4. Apply only approved retained-state disposition; never infer permission to delete
   accounts, records or lanes. Unresolved cleanup keeps the cohort locked out.
5. Verify exact deployment receipts: no-credential user route 401, syntactic token
   with unavailable store 503, verified session disabled 503, operator route still
   protected, no body decode/dispatch. Verify user capability disabled when added.

Those are future commands/evidence requirements, not instructions to run them now.
Failure, cap exhaustion, expiry, authority loss or uncertain cleanup stops the run.
Resumption requires reconciliation and fresh scope-bound approval.

## Future approval phrases

These templates grant nothing while placeholders remain. The captain must first
assemble concrete reviewed evidence/commands and substitute every placeholder.
Publication, merge/deployment, configuration, Auth testing, upload admission and
conversion remain separate decisions. Existing E/D/T templates in the linked
packets govern row-specific configuration and development Auth tests; this packet
neither replaces nor broadens them.

Publication only (the immediate next decision):

> Approve pushing only commit [full SHA] from codex/cad-live-upload-activation-readiness to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only CAD live user-upload activation readiness packet. No merge, deploy, live tests, env/provider/auth/resource or usage/billing changes, secrets, enrollment, email/SMS, store mutation, CAD upload activation, CAD conversion, private CAD, Sandbox dispatch or lane cleanup.

Future bounded upload admission, only after implementation and all prerequisites:

> Approve CAD user-upload admission only for commit [full SHA], exact deployment [deployment reference], route POST /api/cad/user-import, reviewed cohort [opaque cohort reference], exact-session evidence [reference], UTC window [start/end], and reviewed run manifest [hash] with [attempt ceiling] attempts and enforced all-in cost cap [USD amount]. Execute only the admission and rollback commands [hashes] under [executor/backup references] using synthetic/public fixture [reference]. No conversion or Sandbox dispatch, private CAD, additional users, enrollment, email/SMS, merge/deploy, env/provider/auth/resource or usage/billing changes, secrets, unrelated store mutation or lane cleanup.

Future conversion requires independent authority; admission approval cannot reach
an executor unless this separate gate has also been satisfied:

> Approve only [run count] CAD conversion runs through Sandbox for commit [full SHA], exact deployment [reference], exact-session cohort [reference], public/synthetic fixture [reference], UTC window [start/end], and run manifest [hash], with 1 vCPU, 2048 MB, deny-all network, 60-second lifetime, 45-second request, 10-second command, 5-second cleanup, reviewed output ceilings, and enforced all-in cost cap [USD amount]. Execute only reviewed dispatch/reconciliation/rollback commands [hashes]. No private CAD, expanded upload admission, additional users, enrollment, email/SMS, merge/deploy, env/provider/auth/resource or usage/billing changes, secrets, unrelated store mutation or lane cleanup.

An admission-only implementation must explicitly stop before the executor if the
conversion gate is absent. The current route remains wholly disabled. Rollback
commands above require exact advance approval within the bounded run manifest;
no general rollback template authorizes unrelated configuration or data changes.

## Local validation and handoff

Local validation (September 13, 2026):

```sh
npm ci --offline --ignore-scripts --no-audit --no-fund
node --test scripts/cad-convex-*.test.js scripts/cad-upload-session.test.js scripts/cad-upload-session-store.test.js scripts/cad-user-upload-route.test.js scripts/cad-user-upload-activation-readiness.test.js
npm run typecheck
node scripts/cad-convex-codegen.js --check
node scripts/cad-convex-contract-manifest.js --write
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

The regression run passed 196 tests, including five new checks. TypeScript and all
five local SDK bindings passed. The 94-file source audit found zero leak-pattern
matches and passed runtime isolation checks. Dependencies were restored from the
local cache without lifecycle scripts or lockfile changes. The first test wrapper
used a read-only zsh variable after the tests had passed; a direct rerun confirmed
successful process exit. Manifest regeneration changes local integrity metadata
only. No UI or runtime files change, so browser/viewport QA is not applicable.
Live Auth, real sessions, hosted controls, provider cleanup, upload activation and
conversion remain untested. Next: captain reviews this local source packet and its
publication-only phrase, then selects a bounded missing implementation/evidence
slice. Completing this checklist is not a launch decision.
