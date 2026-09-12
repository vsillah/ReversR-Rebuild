# CAD Convex schema and functions: offline source review

Base: `eecc27c46722bb81d53d2e5782ce3b16dca6f0c0` (PR #175).
Branch: `codex/cad-convex-schema-functions`.
Worktree: `ReversR-Rebuild.worktrees/cad-convex-schema-functions` beside the real repository.
Status: source assembled and locally exercised; SDK compilation and live qualification blocked.

## Source assembly

- `convex/schema.ts` is real source preserving the reviewed Convex Auth candidate's
  library `authTables`, `v.id('users')` and `v.id('authSessions')` relationships. Only
  the three thin CAD authority/capability tables are application-owned. This import
  preserves the reviewed candidate; it does not select, install or configure Auth.
- `convex/cad.ts` registers five internal port operations and one internal policy
  mutation in object form, with argument and return validators. It reuses the
  reviewed `offline/cad-convex/backend.js` and `validators.js` rather than copying
  transaction logic into a second implementation. Those pure helpers import no
  provider, Node service, environment loader or network module.
- `convex/librarySession.ts` always throws sanitized `AUTH_UNAVAILABLE`. It has no
  runtime injection switch. Issue and authorization operations cannot grant through
  this default. Internal revocation can still reduce authority as previously designed.
- `offline/cad-convex/backend.d.ts` describes the existing JS contract with real
  generated context/ID imports and per-operation payload/result types. It is a local
  declaration boundary, not proof that implementation and declaration conform.
- `scripts/helpers/cad-convex-source-loader.js` transpiles actual TS source in a
  test-only VM with explicit registration/validator/schema models. Positive tests
  replace the library reader in that loader only. The default denial is tested too.

No action/HTTP endpoint is added: service authentication and upstream provider checks
are unresolved. Adding a reachable gateway now would invent that authority boundary.
Production server files and selection behavior are unchanged; no runtime imports this
assembly. User CAD uploads remain disabled before parsing or dispatch.

## Function and read mapping

The existing `sessionAdapter.FUNCTIONS` and manifest mapping are exercised against
these exact source exports through `createInternalDispatcher`:

| Internal reference | Kind | Indexed access |
| --- | --- | --- |
| `internal.cad.insertIfAbsent` | mutation | authority/user+shop, digest, sessionId |
| `internal.cad.read` | query | digest, authority/user+shop |
| `internal.cad.revoke` | mutation | digest |
| `internal.cad.resolveAuthorization` | query | authority/user+shop |
| `internal.cad.refreshAuthorization` | query | sessionId, authority/user+shop |
| `internal.cad.changeAuthority` | mutation | authority/user or user+shop |

Exact index names are `by_userId`, `by_userId_and_shopId`, `by_credentialDigest`,
`by_sessionId`, and reserved-for-later-cleanup `by_expiresAt`. Reads use `.unique()`;
there are no unbounded collects, filters, cleanup jobs or table scans. The current
library boundary reads nothing; future library session/owner access must use point IDs
in the same snapshot. Policy mutation is absent from the gateway allowlist.

No `convex/_generated` files are fabricated. A future authorized codegen pass must
supply `server`, `dataModel`, and `api`; the reviewed host must bind exactly the first
five references above. Ordinary browser/HTTP clients cannot call internal functions.

## Dependency and verification boundary

No dependencies were installed or package/lock files changed. Convex SDK and Convex
Auth versions remain unselected and absent. Before this source can compile, review
and pin both packages, accept the Auth lifecycle/beta constraints, and generate real
bindings. Auth setup must add `auth.ts`, `auth.config.ts`, and `http.ts` together in
that separately authorized phase; none exists or is configured here.

The source test requires TypeScript **6.0.3** and asserts that exact version. This is
already the repository's resolved TypeScript version in the existing sibling install;
it is not a silent global dependency. Validation borrowed the existing
`cad-auth-store-migration-adapter/node_modules` read-only via `NODE_PATH`; a temporary
ignored `node_modules` symlink enabled `npx --no-install`, then was removed.

Commands from this worktree (set CAD_TEST_DEPS to that existing sibling's absolute
node_modules path, or use a repository dependency install containing TypeScript 6.0.3):

```sh
NODE_PATH="$CAD_TEST_DEPS" node --test scripts/cad-convex-*.test.js scripts/cad-provider-store-contract.test.js scripts/cad-upload-session*.test.js scripts/cad-user-upload-route.test.js
npx --no-install tsc --noEmit
node scripts/cad-convex-source-audit.js
node scripts/cad-convex-contract-manifest.js
node --check scripts/cad-convex-source.test.js
node --check scripts/helpers/cad-convex-source-loader.js
node --check scripts/cad-convex-source-audit.js
git diff --check
```

Results: **66/66** focused tests passed, including eight new source-registration
checks. Tested generation overflow and disable/deny/regrant non-revival, fresh
revocation, digest/session duplicates, exact-session denial, bounded indexed access,
secret rejection, return projection and default provider failure. Existing loopback
route tests prove uploads-disabled with valid synthetic authority and zero dispatch.

`npx --no-install tsc --noEmit` exited **2**: TS2307 for `convex/server`,
`convex/values`, `@convex-dev/auth/server`, `./_generated/server` and
`./_generated/dataModel`; missing contextual types also produce TS7006, TS7031 and
TS2345 in handlers. No successful SDK typecheck is claimed. No handwritten ambient
module stubs, `ts-ignore`, relaxed tsconfig or placeholder generated IDs hide these
errors. The source test passes TypeScript transpilation/syntax diagnostics, then
executes all six registrations; that does not replace SDK typechecking.

The test validator model checks primitive/object/union shapes; its synthetic string
IDs do not prove Convex ID validation or library authTables correctness. Serialized
snapshot tests do not prove actual OCC, mutation retries, persistence or rollback
against a real deployment. No UI changed; no UI or production smoke is claimed.

## Remaining gates, in order

1. Select exact pinned SDK/Auth versions and membership owner; decide provider and
   beta acceptance. Install only through an explicit reviewed package/lock change.
2. Generate authentic bindings, run full TypeScript and an actual Convex offline
   harness. Qualify duplicate transactions, permission generations and secret-free
   projections with SDK validators; validate JS bundling and declaration conformance.
3. Review service authentication, replay protection, bounded envelope and fixed
   internal references. Prove exact library-session/owner liveness and immediate
   upstream provider revocation. A JWT subject alone is insufficient.
4. Resolve deadline/commit and lost-acknowledgement behavior. Cancellation of waiting
   is not remote rollback. Separate upstream action observations cannot make later
   mutations atomic with provider revocation. Keep default service unwired until the
   existing cancellation-before-commit requirement is met or explicitly revised.
5. Present a named development team/project/deployment, reviewed commit and manifest
   checksum, provider/client, configuration-name manifest and enforceable budget for
   separate live approval. Only then create resources, configure Auth/env vars and
   deploy/test synthetic data. No destinations or config values are assumed here.
6. Qualify durable authority provisioning, retention/restore and generation invalidation.
   Later production wiring and user upload activation need separate approval plus
   admission controls, quota/budget leases, parser/executor and cleanup evidence.

No env writes, resource creation, provider configuration, Convex dev/codegen/push,
Supabase mutation, private CAD, Sandbox dispatch, merge, deployment or expense occurred.

## Captain publication gate

Next safe action: review this source packet and its manifest. A draft PR may record
its explicit compiler blocker; it is not deploy-ready or ready for upload activation.
After reviewing the local commit, use this exact phrase with its full SHA substituted:

> Approve pushing only commit [full reviewed SHA] from codex/cad-convex-schema-functions
> to vsillah/ReversR-Rebuild and opening a draft PR against main for the offline CAD
> Convex schema/function source packet, with SDK/Auth and generated-type compilation
> gates explicitly unresolved. No merge, deployment, resource creation, provider/auth
> configuration, environment change, Supabase mutation, private CAD, Sandbox dispatch
> or user-upload activation.
