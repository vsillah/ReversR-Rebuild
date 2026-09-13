# CAD live development auth readiness

Base: `c5473e6f1c1427e802268cc853aa21c6361bb0fa` (PR #181).
Branch: `codex/cad-convex-live-auth-readiness`; worktree suffix:
`ReversR-Rebuild.worktrees/cad-convex-live-auth-readiness`.
Source review only. No live qualification or publication authority is implied.

The nonsecret [worksheet](../offline/cad-convex/liveReadiness.json) pins the
captain-supplied development tuple and Password method. Dashboard facts remain
unverified in this lane. It contains names and scopes only, never env values.
`node scripts/cad-convex-live-readiness.js` checks it locally. Exit zero means the
source packet is internally consistent; its result always says live auth and
uploads are disabled. This is not an execution or approval mechanism.

The validator rejects production/other destinations, exchanged cloud/site origins,
unknown fields (including secret values), public/private-key names, duplicate env
rows, all-branch scopes, open gates and unsafe return URLs. Origins can remain null
or describe an offline `.invalid` fixture or an explicit loopback port. A real
preview origin requires a later reviewed source change; passing a local-origin
check never authorizes starting a live test. No env file is read or written.

## Wiring inventory and unresolved decisions

| Name or source field | Destination and requirement |
| --- | --- |
| `JWT_PRIVATE_KEY` | Future development deployment secret only; no app/browser copy. Generation and installation need E approval. |
| `JWKS` | Same deployment; prove correspondence to the signing key without logging private material. |
| `CONVEX_SITE_URL` | Platform-owned issuer origin; verify exact `.convex.site` development origin. Do not overwrite it as an ordinary user env row. |
| `SITE_URL` | Requirement unresolved until the chosen Password transport and return handling are implemented; record required or N/A before E. |
| `applicationID` | Future source literal `convex`; current trusted-issuer array remains empty. |
| Gateway/service/app client env names | No consuming runtime implementation exists. Names and scopes must be chosen with that implementation, rather than inventing actionable env variables here. This blocks E. |
| `API_CORS_ORIGINS` | Existing API setting; future isolated host needs an exact origin list. No mutation authorized. |
| `CAD_SANDBOX_ACCESS_TOKEN` | Existing operator-only credential; never a user upload session or auth-wiring input. No change authorized. |

The root `.env.example` remains unchanged. It is not a Convex activation template.
Password has no external OAuth callback/client/logout console. App return and logout
routes are null because no live auth UI/transport is implemented. Before E, record
exact app and API origins (including local host/port if used), return path and logout
path; reject wildcards, external redirects, credentials, query tokens and arbitrary
request `redirectTo`. Cookie transport also requires exact allowed origin and
`X-Upload-CSRF`; bearer and cookie flows need separate qualified tests. A signed-out
screen is not revocation evidence.

## Blocking implementation contracts

Carry forward the [Password findings](cad-convex-password-auth-boundary.md) and
[environment/deployment/test gates](cad-convex-live-wiring-packet.md):

- Prove method provenance for the exact originating session, or a reviewed isolated
  Password-only session history. An email, user ID, JWT or authAccounts row is insufficient.
- Bind trusted service transport to verified request identity, with safe error
  projection, replay prevention and unknown-commit reconciliation. No blind retry.
- Provision only a host-owned cohort of 1–8 unique `cad-test-*` addresses under
  `auth-test.invalid`. The offline policy allows existing-account signIn only;
  signup/reset/verification/delivery stay denied. Account provisioning is absent.
- Enforce rate, session TTL, cohort and transaction limits. Read the exact session
  and owner in the same authority snapshot on every operation. Preserve membership
  and permission generation invalidation, logout deletion and no positive cache.
- Qualify stale JWT denial, replacement-login isolation, immediate revoke, outages,
  two-client races and cookie CSRF/origin failures using synthetic identities only.
- Resolve project/deployment IDs, operator/rollback ownership, exact env/command
  manifests, enforceable usage cap and expiry, and a reviewed disabled rollback SHA.

All six CAD registrations remain internal. Runtime providers and issuers remain
empty; the runtime session reader throws `AUTH_UNAVAILABLE`. No live switch is added.
The runtime-reference audit now includes API, component, hook, utility, constant and
plugin directories as well as Convex/server/app/src, and rejects references to the
Password policy or readiness packet. This textual guard supports source review;
it does not claim to resolve arbitrary computed module paths.

## Disable and rollback procedure for a future approved run

1. Before E/D/T, capture names/presence/version of only the scoped development rows,
   disabled source SHA, synthetic cohort identifiers, cleanup owner and expiry.
2. On mismatch, replay, unknown commit, outage or failed revocation, stop the harness
   and deny issuance. Never use cached authority or commercial-profile fallback.
3. Under separately approved rollback actions, invalidate only test sessions and
   restore/remove changed development env rows. Reinstall the reviewed disabled
   release only if deployment rollback was expressly approved. Do not delete the
   resource or restore data by assumption.
4. Verify empty provider/issuer configuration, unavailable runtime session reader,
   user-session/operator-token separation, disabled valid-user admission, zero body
   reads and zero conversion dispatch. Record sanitized receipts and usage.

No rollback was executed here because no live state changed.

## Review and validation

Run locally with existing pinned dependencies, without installing or loading env:

```sh
node scripts/cad-convex-live-readiness.js
node --test scripts/cad-convex-*.test.js scripts/cad-provider-store-contract.test.js scripts/cad-upload-session*.test.js scripts/cad-user-upload-route.test.js
npm run typecheck
npm run cad:convex:codegen:check
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

New tests exercise unsafe worksheet inputs and the actual runtime reader with
absent/populated synthetic env and zero database access. Existing route tests prove
missing or invalid user sessions deny, valid sessions remain uploads-disabled, user
sessions cannot authorize operator import, and the operator token cannot substitute
for a user session. Test HTTP requests use loopback only; no Convex requests occur.
No UI changed, so browser/viewport QA is N/A. Live auth, concurrency, deployment and
production behavior remain unverified. Expenses: $0.

Next safe action: captain reviews this source packet and validation receipt. Next
human decision is publication only, using the final commit SHA reported by the lane:

> Approve pushing only commit [full reviewed SHA] from codex/cad-convex-live-auth-readiness to vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only synthetic Convex/Auth readiness packet. No merge, deployment, resource creation, live tests, provider/auth or env configuration, real-user enrollment, email/SMS delivery, Supabase/other-store mutation, private CAD, conversion, Sandbox dispatch or CAD upload activation.

This template must be populated with the reviewed SHA; it is not current authority.
E/D/T are still blocked by implementation and manifest gaps, so no live approval
phrase is actionable yet. Keep the branch, worktree and task open for captain review.

Validation receipt (2026-09-12): 83/83 focused tests passed, TypeScript passed,
five generated bindings verified, 49-file manifest verified, 35-file source audit
passed with zero leak-pattern matches, and `git diff --check` passed. The initial
dependency path was empty; an ignored symlink to the existing schema-functions lane's
node_modules resolved the tooling failures. No install or package change occurred.
