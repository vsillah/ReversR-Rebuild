# Offline CAD Convex backend contract

Status: executable local contract and review templates only. Based on PR #173 at
`0eef33fe5d7e6e260f382f697d820285da4d9b7f`, branch
`codex/cad-convex-backend-contract`. No runtime imports this directory.
CAD uploads remain disabled. No live auth provider or Convex backing is qualified.

## Artifacts and trust boundary

- `backend.js`: transaction-scoped issue/read/revoke/resolve/refresh handlers using
  named Convex-style indexes and unique lookups. It does not own a database.
- `validators.js`: strict payload, record, binding and return validation. Unknown
  fields and operations deny; errors are sanitized to `AUTH_UNAVAILABLE`.
- `gateway.js`: executable service-authentication and exact-login verification
  contract with a strict five-operation allowlist and bounded waiting. No HTTP
  endpoint, token verifier, networking, SDK, credentials or environment loader.
- `convex/*.ts.template`: candidate Convex Auth schema and object-form internal
  function registrations, with argument and return validators. These are intentionally
  not compilable/deployable source. The selected SDK, generated bindings, library
  adapter and full auth configuration are not present. This packet does not invent
  generated types or certify Convex Auth beta behavior.
- `manifest.json`: SHA-256 checksums for this packet and its synthetic test/manifest
  scripts. Validate with `node scripts/cad-convex-contract-manifest.js`.

The host must execute each backend operation in one authoritative query/mutation
snapshot, never as independent remote CRUD calls. `readExactLibrarySession(ctx, id)`
must freshly read the exact library session and owner within that snapshot, returning
`{userId, loginSessionId, authMethod, active, expiresAt}` or null. The method must
come from verified login provenance. Disabled/deleted owners must deny, and session
IDs must never be reused. No custom password/account/login-session database is added.
The schema candidate uses library document IDs for users and authSessions; shopId
is an opaque external selector until the shop source is qualified.

Gateway hooks are privileged injected code, never client arguments:

1. `authenticateService(context, {signal, deadlineAt})` must authenticate the Node
   caller independently of end-user login. Only literal true succeeds.
2. `verifyExactLogin(context, {shopId, signal, deadlineAt})` must validate the current
   exact login, including authoritative upstream revocation. Return only the binding
   `{userId, shopId, loginSessionId, authMethod}`. For read/revoke (digest-only payloads),
   resolve shop from trusted request context, never assume an arbitrary default shop.
   Other operations supply shop only as a selector; verify its authority independently.
3. `invokeInternal(operation, payload, principal, {signal})` must use a fixed mapping
   to internal query/mutation references. Do not accept a function name from the
   browser or use an admin/deployment key in app code. The HTTP envelope, credential
   verification, replay controls and strict bounded body parsing still need review.

A future Node request adapter can bind its verified context in a closure around the
existing `call(op, payload, {signal})` store port. Authorization callbacks invoke
resolve/refresh with the same outer service signal and an absolute deadline. The
synthetic service integration test exercises this shape; it does not create that
request adapter in production.

## Security behavior

Issuance checks both credentialDigest and sessionId uniqueness before inserting,
validates current exact login/user/membership/permission, and stamps generations
from authoritative rows. Digest conflicts return false; a conflicting sessionId
under another digest throws. Duplicate indexed rows throw rather than choosing one.
Current login expiry caps upload expiry; the maximum lifetime remains 900000 ms.
False-permission issuance is rejected; no previously denied record can gain access.

Read and refresh independently validate status, expiry, exact binding and both
captured generations. Refresh searches the unique upload sessionId again, so a revoke
between read and refresh denies. Another live login for the same user cannot substitute
for the original. Revocation is irreversible and idempotent and preserves the first
backend timestamp. Backend revocation can reduce authority after permission loss;
the gateway still requires verified service/login context.

`changeAuthority` is an internal-only policy hook, absent from the gateway allowlist.
It increments generation on every permission write, including regrant, and checks
safe-integer overflow before any write. It cannot create, delete or reset authority
rows. Provisioning persistent authority rows and selecting the membership owner
remain a separately reviewed workflow. Every future authority writer must preserve
these rules; bypass writes are not supported. Generation changes invalidate old
uploads without an unbounded session sweep.

No cleanup is scheduled. Keep tombstones and authority IDs through the approved
retention horizon; the proposed expiry-plus-24-hours retention is still a decision.
Restore must happen with issuance disabled, invalidate restored generations and
qualify provider-session invalidation before any reopening.

## Deadline and unknown-commit behavior

The gateway caps the caller deadline at 800 ms and includes authentication, login
verification and dispatch in that wait. Backend operations check deadline before
reads/writes and on return; a thrown mutation requires transaction rollback. The
simulator tests rollback when its clock crosses deadline during a write.

A late or lost acknowledgement yields `AUTH_UNAVAILABLE`, no credential and no retry.
A possibly committed row may remain until expiry. Abort stops waiting and signals
upstream work; it cannot prove cancellation of a remote commit. Real Convex retry
clock behavior and the commit-after-final-check window are unresolved. This packet
therefore cannot satisfy the existing service's cancellation-before-commit requirement
or authorize default-service wiring. An action's upstream liveness observation and
its later mutation are separate transactions; no observation freshness claim here
eliminates that race. Resolve this through provider qualification or a separately
reviewed admission/finalization protocol.

Convex references: [internal functions](https://docs.convex.dev/functions/internal-functions),
[transaction semantics](https://docs.convex.dev/database/advanced/occ),
[indexes](https://docs.convex.dev/database/reading-data/indexes/).

## Validation receipt

The new Node test suite uses a deterministic serialized snapshot/rollback simulator
and synthetic library-session records. It checks index names, duplicate detection,
exact session isolation, expiry/logout/disable, permission deny/regrant non-revival,
read/revoke/refresh ordering, malformed inputs, secret-free projections, deadline
rollback, hung authentication, and uncertain acknowledgement with no returned token.
It is not convex-test, a live backend, durability evidence or an OCC race test.

Commands (run at this worktree root):

```sh
node --test scripts/cad-convex-backend-contract.test.js
node --test scripts/cad-convex-backend-contract.test.js scripts/cad-convex-store.test.js scripts/cad-provider-store-contract.test.js scripts/cad-upload-session-store.test.js scripts/cad-upload-session.test.js scripts/cad-user-upload-route.test.js
node scripts/cad-convex-contract-manifest.js
node --check offline/cad-convex/backend.js
node --check offline/cad-convex/gateway.js
node --check offline/cad-convex/validators.js
node --check scripts/cad-convex-backend-contract.test.js
node --check scripts/cad-convex-contract-manifest.js
git diff --check
```

The combined run passed 53/53 tests, including six real loopback route tests proving
that default auth is unavailable and verified sessions still get uploads-disabled.
This worktree has no node_modules; the combined run used NODE_PATH pointing to an
existing sibling dependency installation, read-only. No dependencies were installed.
The first new-suite run had one test fixture incorrectly using the first login's
principal for a second-login issue; correcting the fixture produced 14/14 passes.
No remaining application assertion failures. Syntax and manifest checks passed.
No TypeScript compile, generated-type validation, live Convex test, production smoke
or UI walkthrough is claimed. No UI changed.

## Roadmap and next gate

Completed: offline transaction rules, gateway shape, strict validators, candidate
schema/internal-function templates and synthetic regression evidence. Production
service/router/configuration are unchanged. No resource creation, env write, deploy,
CAD conversion, private data, Supabase action or expense occurred. The deleted
Supabase project must not be used or recreated.

Next: captain reviews this exact packet and commits before the next adapter phase.
Select and review pinned Convex SDK/Auth versions and beta acceptance, membership
owner, service authentication, exact library/upstream session-revocation behavior,
and the deadline/commit strategy. After selection, assemble and offline-typecheck
real functions, auth.config.ts/auth.ts/http.ts with library authTables, generated
types and an actual Convex offline test harness. None is certified by these templates.
No new approval is required merely to review these offline artifacts.

Human gate before live work: captain presents the exact reviewed commit and manifest
checksum, named development team/project/deployment, provider/client, configuration
name manifest and budget. Vambah approves resource creation, synthetic development
deployment and auth configuration separately, using the scoped packets in
`docs/cad-convex-store-review.md`. Unknown destination/version/budget values must be
filled from evidence before seeking approval. Production wiring, upload activation
and CAD dispatch remain separate future gates.
