# Ordinary customer commercial source handoff

Date: 2026-10-05. Branch: `codex/subscription-launch-readiness`. Worktree: `/Users/vambahsillah/.codex/worktrees/d93b/ReversR-Rebuild`.

This candidate adds a separate Convex source assembly, SDK customer login, transactional account/credit records, owner-only billing and the account screen integration. It is ready for source review. It has not been pushed, deployed, connected to a provider or qualified for customer rollout.

## Source and installation contract

`commercial-backend/convex.json` selects `commercial-backend/convex`. The existing root `convex` directory is the frozen CAD assembly. Never deploy the commercial assembly over the CAD destination. An approved commercial destination is required before any later installation; this package neither creates nor selects a cloud project.

| Surface | Explicit configuration required |
| --- | --- |
| Express transport | `COMMERCIAL_BACKEND=convex`, `COMMERCIAL_CONVEX_URL=https://<deployment>.convex.cloud`, `COMMERCIAL_CONVEX_ISSUER=https://<deployment>.convex.site` |
| Backend assembly | `COMMERCIAL_ASSEMBLY=ordinary-customers-v1`, `COMMERCIAL_AUTH_ISSUER` equal to that deployment's built-in `CONVEX_SITE_URL` |
| Expo frontend | `EXPO_PUBLIC_COMMERCIAL_BACKEND=convex`, `EXPO_PUBLIC_COMMERCIAL_CONVEX_URL`, `EXPO_PUBLIC_COMMERCIAL_CONVEX_ISSUER` matching the transport |
| Auth installation, later | Convex Auth key/JWKS and site configuration through its reviewed setup procedure; no keys were read or created here |
| Stripe, later | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO_SHOP`, `STRIPE_PRICE_TEAM`, `COMMERCIAL_BILLING_RETURN_URL` (HTTPS) |

The selectors are actual source wiring, with no permanent proof-only false flag. Missing or inconsistent configuration denies access. The transport instantiates a new real `ConvexHttpClient` for each request, forwards its SDK bearer token, and invokes registered functions. It never sends a file-store snapshot. Explicit local mode retains the old synthetic regression path; an unknown selector cannot fall back to it.

## Identity, credits and billing

The backend uses official Convex Auth Password sign-in/sign-up and HTTP auth routes. Every account operation validates the SDK issuer, `getAuthUserId`, `getAuthSessionId`, stored user, matching current session and expiry. Same-email accounts remain separate; email does not attach an existing shop or paid account. Membership and owner checks are independent.

Indexed transactional mutations own memberships, period counters, credit events, checkout intents, subscription bindings and webhook receipts. Debit retries are scoped by shop, period, feature and request key; a changed request hash fails. The ledger is internal. Current catalog prices, limits and feature costs are unchanged. Workflow requests remain denied pending the server-owned journey/reservation/refund/result-replay decision.

Stripe actions use the reviewed Clover API contract. Webhooks verify the real signature before provider reconciliation, reserve a revision before fetching the current subscription, and atomically apply state with a processed receipt. The latest reconciliation wins. A late old-subscription event preserves a pending replacement intent; retired subscriptions cannot reclaim ownership. Team checkout is denied in both backend and UI until seat provisioning exists.

The account screen uses the official auth provider. Tokens reach non-hook callers through a memory-only bridge; the SDK owns its persistence. Provider disposal clears that bridge and closes the client. Logout invalidates the generation immediately; stale refresh/profile/billing responses cannot restore paid state or open checkout. Expiry and failed reads clear the account. A failed profile save cannot show success. Disabled refresh explains that sign-in is required. Mobile billing and credit headers wrap.

The SDK's resolved `signOut()` promise confirms local completion only: it can swallow a remote failure. Server revocation is a distinct backend session-deletion test, not a claim made by this UI. Provider cleanup is covered by its disposal helper test and source review; the browser harness mocks SDK authentication.

## Validation and limits

Run from the worktree with `env -i PATH=/usr/local/bin:/usr/bin:/bin` preceding each Node command:

```sh
node scripts/commercial-credit-gate-smoke.js
node --test scripts/cad-user-upload-route.test.js scripts/commercial-convex-transport.test.js
node node_modules/vitest/vitest.mjs run --config commercial-backend/vitest.config.ts
node scripts/commercial-convex-codegen.js --check
node node_modules/typescript/bin/tsc --noEmit --pretty false
```

Results: 29 original commercial tests, 7 CAD denial tests, 3 real-SDK transport tests and 16 new official `convex-test`/session/catalog tests pass (55 total). Transport tests mock HTTP fetch and forbid outbound sockets. Backend tests deny fetch and replace Stripe provider I/O, retaining real signature verification. No live signup, token minting, payment, provider call, migration, upload or conversion ran. The official local Convex harness verifies registered functions and transaction rollback; it does not prove cloud OCC or host-restart durability.

Offline Expo export passed with the installed local CLI:

```sh
env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=/tmp/reversr-offline-expo.Cv4njl EXPO_HOME=/tmp/reversr-offline-expo.Cv4njl EXPO_OFFLINE=1 EXPO_NO_DOTENV=1 EXPO_NO_TELEMETRY=1 CI=1 node node_modules/expo/bin/cli export --platform web --output-dir /tmp/reversr-offline-expo.Cv4njl/output
```

The empty temporary home isolated user Expo configuration. No CLI login, dotenv load, credential access or deployment occurred. The export checks the actual `_layout`/auth imports; it is not authenticated runtime proof.

New pinned development tools: `convex-test@0.0.60`, `vitest@5.0.3`, `@edge-runtime/vm@5.0.0`. The lockfile includes their dependency tree and npm-hoisted transitive build updates, including lightningcss, postcss, nanoid and sourcemap-codec. Direct application SDK/TypeScript constraints remain unchanged. Node 24 local validation and the offline Expo export passed; CI uses Node 22 (Vitest requires at least 22.12). The existing Vite CommonJS config emits a non-failing future-loader warning.

All ten existing default-closed CAD source checkers pass without `--write`:

```text
cad-auth-production-binding-source-install-checker.js
cad-auth-controlled-upload-digest-drift-repair-checker.js
cad-auth-credential-closure-binding-repair-checker.js
cad-auth-credential-metadata-source-repair-checker.js
cad-auth-live-gate-credential-closure-checker.js
cad-auth-deployed-runtime-supply-path-closure-checker.js
cad-auth-startup-live-gate-source-install-closure-checker.js
cad-auth-production-session-credential-acceptance-repair-checker.js
cad-auth-controlled-internal-upload-activation-implementation-checker.js
cad-auth-controlled-upload-observable-gate-wiring-repair-checker.js
```

Separate pre-existing limitation: `node scripts/cad-convex-codegen.js --check` fails with `Stale generated file: api.d.ts` for existing `cadControlledUpload*` modules. The root generator and entire root `convex` tree are byte-equivalent to baseline `0ac48c95cd23e35ee25fda048985d957b8561bb8`, confirmed by `git diff --exit-code` against that baseline. They were not regenerated. `server/index.js` and `.github/workflows/release-local-ci.yml` are also unchanged. The new commercial generator check passes. Historical CAD packets remain untouched.

## UI review

The local Vite harness at `http://127.0.0.1:5179/` renders the actual AccountScreen, CommercialLogin, CommercialProvider and memory session logic. It mocks auth/provider responses, native bridges and icons. It is not an Expo-router, deployed-login or provider proof. Start it with:

```sh
env -i PATH=/usr/local/bin:/usr/bin:/bin node node_modules/vite/bin/vite.js --config qa/commercial/vite.config.mts
```

In the integrated browser, use `owner@synthetic.invalid` and `synthetic-password`; `wrong-password` exercises failure. These are fixture strings, not credentials. The toolbar exposes expired/unavailable/loading/save-failure/delayed-refresh states. Reviewed at 390×844, 768×1024 and 1280×900: login failure/retry, synthetic create account, sign-out, delayed refresh followed by logout, expired response/recovery, successful and failed save, both billing buttons and disabled Team. No silent affected action was observed. Screenshots: `qa-evidence/mobile.jpg`, `mobile-plans.jpg`, `tablet.jpg`, `desktop.jpg`. No MP4 was produced for this source-only review.

## Remaining decisions and rollout work

1. Captain source QA, including dependency review and the unchanged root-codegen limitation. Keep this lane open.
2. Decide journey reservation/refund/result-replay rules, then implement server-owned journeys before workflow admission.
3. Select an approved separate commercial deployment destination and later authorize its auth/provider configuration. Do not overwrite CAD.
4. Add verified-email and password-recovery delivery and qualify real auth/session revocation before ordinary-customer rollout.
5. Qualify Stripe checkout/portal/webhook reconciliation in an authorized provider test environment; add Team provisioning before enabling Team checkout.
6. Prepare an explicit legacy-account migration preview mapping source account IDs to verified user/shop IDs with owner approval. No email or client-ID auto-linking, destructive merge or migration has run.
7. Qualify cloud durability/concurrency, native billing and the nonintegrated admin/support paths separately. Run the approved Mark/customer rollout checks only after those applicable gates pass.

Current scope ends at local source review. No expense was incurred.

## Captain UI follow-up

The current account error now takes priority over transient billing/save status. Status clears when auth state, account identity or error changes, and when refresh starts. This fixes the observed billing-denial → expired-session refresh sequence that previously hid the recovery instruction. The message uses an alert role. Sign in is the filled primary action; Create account remains secondary. Login card/input borders and radii match the existing compact sections.

`qa/commercial/recovery-regression.mjs` exports `checkRecoveryMessages(tab)` for the CUA REPL. Pass a signed-in synthetic harness tab at port 5179. It exercises both Manage billing and Start Pro Shop checkout, asserts the initial provider denial, then asserts the session-expired message, absent stale billing message and unavailable credits, followed by clean recovery. Both cases passed against the rendered components. TypeScript and the isolated offline Expo export passed again. The shared IAB viewport was not changed during this follow-up. `qa-evidence/login-hierarchy.jpg` records the revised form; earlier mock screenshots predate this styling adjustment.

The actual offline Expo package is now served at `http://127.0.0.1:5180/account` (session `53810`) from `/tmp/reversr-offline-expo.Cv4njl/output`. Start with:

```sh
env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=/tmp/reversr-offline-expo.Cv4njl EXPO_HOME=/tmp/reversr-offline-expo.Cv4njl node qa/commercial/serve-export.cjs /tmp/reversr-offline-expo.Cv4njl/output 5180
```

This loopback-only static server sets `connect-src 'self'` as an additional external-connection boundary. The build has no public backend configuration. The actual Expo `/account` route rendered default-unavailable through the real `_layout`, AuthProvider, icons and fonts; account, refresh, billing and save remained disabled as appropriate. Browser warning/error logs were empty. No authenticated/cloud behavior was exercised. `qa-evidence/expo-default-unavailable.jpg` is the packaged-route screenshot. The original mock QA server remains at port 5179, session `70815`.

## Deployment-scoped auth custody

The auth storage namespace now encodes the exact deployment URL and issuer tuple as fixed-width hexadecimal characters with a commercial version prefix. This matters because the pinned SDK strips punctuation from namespaces: raw URL concatenation could otherwise collapse distinct hyphenated deployment names. Both access and refresh token keys remain distinct after that escaping. The provider is keyed by the same namespace so changing destinations remounts SDK auth state instead of carrying an old token reference forward. Existing memory-bridge invalidation and client disposal remain intact.

There is no fallback or migration from the old shared namespace. A previously signed-in user must sign in again under the deployment-specific namespace. No real stored credentials or browser storage were inspected, copied or removed. Synthetic tests cover development/production endpoints, punctuation variants, issuer changes and the old namespace. All 17 commercial Convex/session/catalog tests and TypeScript pass after this correction (56 source tests across the full suites, plus the two browser recovery cases).
