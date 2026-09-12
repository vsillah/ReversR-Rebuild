# CAD Convex/Auth source assembly review

Base: `94065b0beb317881f14215fa9f6c6cb84ae6a048`. Local/source-only slice.
Branch: `codex/cad-convex-auth-assembly-review`; sibling worktree:
`ReversR-Rebuild.worktrees/cad-convex-auth-assembly-review`.

The pinned Convex 1.45.0 / Auth 0.0.95 / Auth Core 0.41.3 assembly now includes
`auth.ts`, `auth.config.ts`, and `http.ts`. No packages changed. Auth exports the
library's signIn, signOut, store and isAuthenticated registrations. With no login
providers, the HTTP assembly registers only library discovery/JWKS endpoints.
Those endpoints would require deployment environment configuration if called;
they were not called here. No CAD HTTP endpoint or client integration was added.

The empty JWT issuer configuration is intentional: this is a disabled assembly,
not deployable login readiness. No issuer is inferred from env values. A later
source review must explicitly register the approved issuer with application ID
`convex`, select the provider, and review redirects/lifecycle before deployment.
Even adding env values cannot qualify the default CAD session reader: it still
throws `AUTH_UNAVAILABLE`, and preview live mode still rejects configuration.

## Exact session boundary

Pinned Auth source `src/server/implementation/types.ts` defines `authSessions`
with `userId` and `expirationTime`. It has no login method or upstream-revocation
receipt. A valid JWT or an existing session alone cannot establish that evidence.

`offline/cad-convex/librarySessionHarness.js` is an explicitly opted-in synthetic
candidate. A trusted test hook supplies fresh verified exact user/session/method
facts. The reader point-reads the exact session and owner in the same context,
checks ownership and expiry, and projects only the backend's authority fields.
Malformed/unverified input and outages fail closed with sanitized errors. It does
not decode JWTs, read credentials/env, call providers, or write library tables.
The hook is test evidence, not cryptographic verification. The harness cannot be
selected by runtime configuration and is never imported by the production reader.

Tests execute the actual CAD registrations with this candidate injected only by
the test loader, and separately verify that the unmodified reader still denies.
Existing synthetic preview/route tests prove disabled admission before body access.
Only synthetic metadata is used; no private CAD, conversion or Sandbox dispatch.
Local mocks do not prove provider lifecycle or remote transaction semantics.

## Remaining gates

The next gate is captain review and explicit public push/PR approval for this
branch's reviewed commit. No push, PR, merge, deployment or cleanup is authorized
by this packet. Suggested phrase (replace SHA after local review):

> Approve pushing only commit [reviewed SHA] on codex/cad-convex-auth-assembly-review to origin and opening a review PR against main for the local-only CAD Convex/Auth assembly. No merge, deployment, resource/provider/env changes, upload activation, private CAD, conversion, Sandbox dispatch, other-store mutation or cleanup.

After review, the separate P/E/D/T gates and destination manifests in
[cad-live-convex-auth-setup-packet.md](cad-live-convex-auth-setup-packet.md) still apply.
Existing resource creation does not open these gates. Before E/D, complete provider
selection, issuer source review, trusted service transport and method/revocation
verification, authority provisioning, replay/unknown-commit handling and rollback
manifests. Before upload activation, remote conformance and a separate product/code
approval remain required. No live qualification claim is made by this slice.

## Local validation

Passed: 76/76 focused tests, TypeScript, five local generated bindings, the
40-file integrity manifest, 26-file source/leak audit and whitespace check.
TypeScript initially caught auth.config being treated as a function module by
local codegen; discovery now excludes that config, matching the pinned SDK.
Commands: No Convex CLI deployment or env loader is used.

```sh
node --test scripts/cad-convex-*.test.js scripts/cad-provider-store-contract.test.js scripts/cad-upload-session*.test.js scripts/cad-user-upload-route.test.js
npm run typecheck
npm run cad:convex:codegen:check
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

The source audit/manifest include all new assembly, harness, test and review files.
Dependencies are reused from the existing pinned sibling worktree via an ignored
symlink. No package install, credential access, provider call or expense occurred.
