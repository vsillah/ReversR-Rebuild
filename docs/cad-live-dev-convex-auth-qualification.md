# Development Convex/Auth configuration qualification

Prepared from main `cc8a45d2a7c2830e3b5ee1ecd96dbcdcb27357c8` on branch
`codex/cad-live-dev-convex-auth-qualification`. This phase adds an executable
configuration-evidence contract and a pending worksheet. It performs no live
configuration or qualification. Runtime source is unchanged.

## What this adds

[Configuration worksheet](../offline/cad-convex/configurationQualification.json)
and [inspector](../offline/cad-convex/configurationQualification.js) extend the
[development wiring contract](cad-dev-convex-auth-wiring-review.md). The inspector
requires all twelve checks exactly once, correct scope, and separate synthetic
receipts bound to check ID, source SHA and development deployment. Evidence must
be less than five minutes old according to the caller's explicit fixture clock.
A receipt from another check, commit or deployment cannot fill a missing row.
Unknown fields, secret-bearing values, future/stale evidence and wrong scopes deny.
Missing receipts remain pending; a failed receipt prevents synthetic completion.

The committed worksheet contains **no receipts**: all twelve checks are pending.
Only tests fabricate passing receipts. Even full synthetic completion returns
`liveAuthReady: false`, `configurationAuthorized: false`, `uploadsEnabled: false`.
These host-supplied assertions are not signed attestations, provider observations,
key verification, credential validation or a live evidence acceptance path.
There is no env loader, SDK client, provider callback, persistence or transport.
Do not reuse this inspector to authorize a future E/D/T gate.

## Exact destination and env/provider plan

Reuse the existing development target recorded in the
[live wiring packet](cad-convex-live-wiring-packet.md): team `vambah-sillah`
(`405220`), project `reversr-cad-auth-dev`, development `majestic-alligator-31`.
Client origin: `https://majestic-alligator-31.convex.cloud`.
HTTP Actions / issuer origin: `https://majestic-alligator-31.convex.site`.
These are inherited source-register values, not fresh dashboard observations.
Project/deployment immutable IDs, operator access, current release and subscription
usage limits still require verification. Remote Git main was verified at the base
SHA; no provider endpoint was contacted.

| Check / setting | Planned source and consumer | Required future evidence |
| --- | --- | --- |
| destination | Existing development tuple above | Operator role, immutable IDs, independent endpoint observations, current release |
| JWT_PRIVATE_KEY | Approved secret-store reference → this development deployment only; pinned Auth token signer imports PKCS8 RS256 | Presence, accepted formatting, prior version/absence; no value or secret hash in receipt |
| JWKS | Matching public key set → same development deployment; pinned Auth exposes verification set | Presence, schema/algorithm and deployment match |
| keyPair | Future isolated signing/verification check | Matching signing and verification key, with no emitted private material; presence alone fails |
| CONVEX_SITE_URL | Platform-owned HTTP Actions origin | Exact issuer origin; inspect, never overwrite or derive by string replacement |
| SITE_URL | Flow-specific decision for reviewed web/native harness | Exact allowed app origin if consumed, or documented N/A with source evidence; currently unresolved for live use |
| providerAssembly | Future reviewed Password-only source | Synthetic existing-account sign-in restrictions, no sign-up/reset/verification delivery; provider list remains empty now |
| issuerAssembly | Future auth.config.ts source | Exact issuer and literal applicationID `convex`; trusted issuer list remains empty now |
| exactSession | Future library session reader and method provenance | Owner, originating session, expiry/logout/revocation in authority snapshot; current reader throws AUTH_UNAVAILABLE |
| serviceCaller | Future server transport | Scoped caller authentication, audience and no admin/deploy key as runtime auth; no consumer exists yet |
| boundedReplay | Future transport/admission design | Durable replay ledger, cancellation, transaction accounting and unknown-outcome reconciliation; local nonce fixture is insufficient |
| rollback | Stop fixture now; separate approved live recovery later | Named operator, exact prior configuration versions/absence and authorized disabled-source restore |

No application environment rows are installed or introduced. `CONVEX_DEPLOYMENT`
remains a future dedicated tooling selector, to be obtained from pinned tooling
without automatic setup. Proposed `CONVEX_URL` and `EXPO_PUBLIC_CONVEX_URL` have no
CAD live consumer yet; do not set them as an activation shortcut. No public signing
key secret, all-branches scope, production deploy key or upload-enable flag belongs
in this packet. No OAuth client, callback, email or SMS provider is required by the
synthetic Password contract. This is not evidence that Password is enabled live.

Pinned source reviewed locally: Convex 1.45.0, Auth 0.0.95, Auth Core 0.41.3.
Auth `src/server/implementation/tokens.ts` imports `JWT_PRIVATE_KEY` with RS256 and
sets the issuer from `CONVEX_SITE_URL`; `implementation/index.ts` serves `JWKS`.
Auth CLI can configure keys and SITE_URL; it was inspected, not executed. Its native
SITE_URL exception does not resolve the unchosen live web harness origin.
No SDK upgrade, initialization, code push or provider probe is part of this phase.
The Convex skill's deploy verification step is excluded by the explicit lane scope.

## Synthetic qualification and fail-closed gates

1. Run the committed pending worksheet through the inspector with an explicit
   fixture clock: expect twelve pending checks and no live authority.
2. Fabricate receipts in tests only: all checks passing permits synthetic completion
   but never configuration authorization. Null/fail each prerequisite independently.
3. Exercise wrong deployment, swapped endpoints, stale/future timestamp, wrong SHA,
   duplicated/missing check, receipt reuse, secret-bearing fields and unknown outcome.
   Expect a sanitized failure; neither receipt content nor secrets leave the inspector.
4. Execute the inspector in a VM with forbidden environment/network/provider access.
   Expect zero forbidden calls. Source audit also forbids importing this module into
   application, server or Convex runtime trees.
5. Run actual existing source and upload-route tests. Empty providers/issuers and the
   unavailable library reader must deny before authority reads/writes. Default user
   import requires a session; syntactic credentials get USER_AUTH_UNAVAILABLE. Valid
   injected test sessions get USER_UPLOADS_DISABLED before body access. Assert zero
   conversion dispatch and body reads. Those route checks are loopback fixtures.

Later live T must separately cover remote two-client races, expiry/logout/revocation,
permission disable/regrant, key rotation if approved, outages/timeouts and unknown
commits. This phase does not claim any of those live results or grant store writes.

## Rollback packet and operator gate

Current rollback: stop the local test process. No live state was changed, no sessions
were created, and nothing in the cloud needs restoring. The worksheet retains the
predecessor's disabled source baseline `312c9f5ddc81e92e9278aa9bd43108e46acc5592`;
it is not a verified deployed rollback release. The current inspected main SHA is
recorded separately for configuration receipts. Removing this added packet has no
runtime effect. Do not revert unrelated work or delete the existing resource.

Before any later E/D/T request:

1. In the in-app Browser, open Convex dashboard → team `vambah-sillah` → existing
   `reversr-cad-auth-dev` → development `majestic-alligator-31`. Verify access role,
   IDs and both displayed origins. Stop on mismatch; record nonsecret evidence only.
2. Inspect the current release and deployment Settings → Environment Variables.
   Record names, scopes and previous version/absence without copying secret values.
   Do not save changes. Supply opaque private-register references to the captain.
3. Resolve app origin/return/logout policy, reviewed implementation SHA, secret-store
   references, human rollback owner, enforceable usage bound and test retention.
4. Prepare E rollback row by row: restore prior version or remove only newly added
   approved row. D rollback requires an explicitly authorized disabled release and
   destination. T requires enumerated synthetic record/session cleanup. No resource
   deletion, billing change, unrelated restore or blind retry is implicit.
5. Return the sanitized register and exact manifests. Captain then substitutes all
   verified values into the separate E/D/T phrases in the live wiring packet. No
   actionable live approval phrase exists while these fields and code remain missing.

## Validation receipt and captain handoff

Validation completed locally on 2026-09-12: 96 tests passed, zero failures;
typecheck passed; five local SDK bindings verified without deployment access;
57 integrity-manifest files verified; 43 source-audit files passed with zero leak
pattern matches; whitespace validation passed. Exact commands:

```sh
node --test scripts/cad-convex-*.test.js scripts/cad-provider-store-contract.test.js scripts/cad-upload-session*.test.js scripts/cad-user-upload-route.test.js
npm run typecheck
npm run cad:convex:codegen:check
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

The local integrity manifest includes the four new artifacts and audit changes.
No UI changed; browser viewport QA is N/A. No live auth, cloud stores, provider
configuration, production smoke or deployment was tested. Cost incurred: $0.

Completed: configuration evidence shape, per-check binding/freshness, missing/failure
projection, negative tests, wiring plan and rollback worksheet. Next: captain source
review and scoped publication approval. Live assembly and verified operator inputs
remain blockers for E/D/T; uploads and conversion remain closed.

Publication phrase (replace SHA with the completed local commit):

> Approve pushing only commit [full reviewed SHA] from codex/cad-live-dev-convex-auth-qualification to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the offline development Convex/Auth configuration qualification packet. No merge, deployment, provider/resource creation or mutation, env changes, live tests, real-user enrollment, email/SMS, Supabase/other-store mutation, private CAD, conversion, Sandbox dispatch, CAD upload activation or branch/worktree cleanup.
