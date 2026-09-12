# CAD Convex schema/functions: PR #176 review

Branch: `codex/cad-convex-schema-functions`.
Worktree: `ReversR-Rebuild.worktrees/cad-convex-schema-functions` beside the real repo.
Source base: `eecc27c46722bb81d53d2e5782ce3b16dca6f0c0` (PR #175).
Compile follow-up base: `d81db5c157ad0d31c6dd646f5627d409cce2d3d9`.
Status: local SDK compilation passes; provider and live qualification remain gated.
Keep PR #176 draft for captain review.

## Source and runtime boundary

The schema preserves library `authTables`, `v.id('users')`, `v.id('authSessions')`,
and three thin CAD authority/capability tables. No custom login/account tables.
Six internal CAD registrations have object-form args/returns validators and reuse
the pure offline backend/validators. The local declaration imports real generated
contexts/IDs; it is not an independent backend implementation.

`convex/librarySession.ts` still always throws `AUTH_UNAVAILABLE`, with no runtime
injection switch. Tests replace that reader only in an isolated loader. No action,
HTTP gateway, provider, Auth configuration or production wiring is added. Internal
revocation can still reduce authority. User uploads remain disabled before parsing
or dispatch. Production server code and root tsconfig are unchanged.

## Dependencies and local code generation

Exact npm pins: `convex@1.45.0`, `@convex-dev/auth@0.0.95`, and required peer
`@auth/core@0.41.3`. Registry peer metadata accepts these versions and existing React.
The npm lockfile records transitive versions/integrities. Installation command:

```sh
npm install --save-exact --ignore-scripts --no-audit --no-fund convex@1.45.0 @convex-dev/auth@0.0.95 @auth/core@0.41.3
```

No install lifecycle scripts or Auth setup commands ran. npm reported deprecated
Lucia/Oslo dependencies. These build pins do not qualify Auth security/lifecycle for
production; provider choice and beta/lifecycle acceptance remain future decisions.

The official [codegen documentation](https://docs.convex.dev/cli/reference/codegen)
describes generated bindings as committed repo source. Installed SDK inspection
showed `src/cli/codegen.ts` loads deployment credentials and may start a selected
backend. The CLI was therefore not invoked.

`scripts/cad-convex-codegen.js` selects named, verbatim pure declarations from the
pinned SDK's `common.ts`, `dataModel.ts`, `server.ts`, and `api.ts` templates. Existing
lockfile TypeScript 6.0.3 transpiles them in a VM without process, require, filesystem
or network access. The wrapper reads local source and writes only five fixed
`_generated` paths. SDK/compiler versions and expected declarations are asserted.
No CLI modules, server analysis or credentials are loaded. The unused bundler
approach was removed; no extra bundler dependency remains.

The outputs use the SDK's dynamic schema/API type inference, not handwritten ambient
stubs: dataModel derives from schema, server types use DataModel, and api derives
references from actual modules. Standard SDK `anyApi` and generic env exports are
unmodified generator output, not configured env values or an activation mechanism.

Generated whitespace is normalized; SDK declarations and runtime logic are unchanged.
Run `npm run cad:convex:codegen` to regenerate and
`npm run cad:convex:codegen:check` to compare exact output. Generated SDK headers
mention `convex dev`; do not run it in this lane. Nested modules/components cause
this limited local generator to stop for a reviewed discovery upgrade.

## Mapping and indexed reads

| Internal reference | Kind | Indexed access |
| --- | --- | --- |
| `internal.cad.insertIfAbsent` | mutation | user+shop authority, digest, sessionId |
| `internal.cad.read` | query | digest, user+shop authority |
| `internal.cad.revoke` | mutation | digest |
| `internal.cad.resolveAuthorization` | query | user+shop authority |
| `internal.cad.refreshAuthorization` | query | sessionId, user+shop authority |
| `internal.cad.changeAuthority` | mutation | user or user+shop authority |

Only the first five are in the existing gateway dispatcher. Reads use `.unique()`
on `by_userId`, `by_userId_and_shopId`, `by_credentialDigest`, or `by_sessionId`.
`by_expiresAt` remains reserved for later cleanup. No unbounded collect, scan or
cleanup/provisioning workflow is added. Future library access must point-read exact
session and owner in the same snapshot.

## Validation

Run from this worktree with its own installed dependencies:

```sh
npx --no-install tsc --noEmit
LOCAL_RELEASE_CI_EVIDENCE_FILE=/private/tmp/cad-convex-pr176-local-ci.json npm run release:local-ci
node --test scripts/cad-convex-*.test.js scripts/cad-provider-store-contract.test.js scripts/cad-upload-session*.test.js scripts/cad-user-upload-route.test.js
npm run cad:convex:codegen:check
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
node --check scripts/cad-convex-codegen.js
node --check scripts/cad-convex-source.test.js
node --check scripts/helpers/cad-convex-source-loader.js
node --check scripts/cad-convex-source-audit.js
git diff --check
```

TypeScript passes, local release checks pass **16/16**, focused tests pass **66/66**.
Manifest, generated-output comparison, syntax and leak/isolation checks pass. The
previous TS2307/7006/7031/2345 errors are resolved without changing CAD handlers,
relaxing tsconfig, ts-ignore or excluding source. SDK compilation does not turn the
modeled registration/validator/snapshot tests into real OCC, deployment, provider
liveness or durability evidence. No UI change or production smoke is claimed.

CI-generated reports were reviewed, backed up as a temporary patch and restored to
their previously clean versions. The full CI receipt remains at the temporary path
above. Unrelated report timestamps/status churn is excluded from this patch.

## Remaining gates and publication

Next safe action: captain reviews pins/generated files and approves updating draft
PR #176 so existing CI/preview checks rerun. No merge authorization is implied.

Still required: Auth lifecycle acceptance, exact-session/owner and upstream provider
liveness; membership owner/provisioning; service auth/replay/bounded envelope; fixed
internal dispatch; deadline/commit and unknown-ack qualification. Cancelled waiting
is not remote rollback. Then separately approve a named development destination,
reviewed commit/checksum, provider/client, configuration names and enforceable budget
before any resources, Auth/env setup or synthetic live deploy/test. Auth setup must
add auth.ts/auth.config.ts/http.ts together when authorized. Real OCC, durability,
retention/restore, production wiring, admission quotas/budgets, parser/executor
cleanup and eventual upload activation remain future gates.

No Convex resource creation, CLI dev/deploy/push, provider/Auth configuration, env
change, Supabase mutation, private CAD, Sandbox dispatch, merge or expense occurred.

Exact captain phrase with the reviewed full commit substituted:

> Approve pushing only commit [full reviewed SHA] from codex/cad-convex-schema-functions
> to vsillah/ReversR-Rebuild to update draft PR #176 and rerun its existing CI/preview
> checks. Scope: pinned SDK dependencies, local generated bindings, verification and
> review packet. No merge, Convex resource creation/deployment, provider/auth or env
> configuration, Supabase mutation, private CAD, Sandbox dispatch or upload activation.
