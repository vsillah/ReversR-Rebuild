# Subscription launch source handoff — October 5, 2026

The local source fixes pass synthetic regression tests. Commercial launch remains blocked. Existing Free, Pro Shop ($49/month, 100 credits) and Team ($149/month, 500 credits) offers are unchanged. No new product or repricing is proposed.

## Binding and scope

- Task worktree: `/Users/vambahsillah/.codex/worktrees/d93b/ReversR-Rebuild`.
- Branch: `codex/subscription-launch-readiness`.
- Base: `0ac48c95cd23e35ee25fda048985d957b8561bb8` (Captain-supplied current public main; locally verified). The existing branch already pointed here and was attached to this task. No other checkout was edited.
- Production settings, persistence, account data and deployed behavior were not inspected. The defects below were reproduced in source with synthetic accounts; they are not reports of observed production exploitation or data loss.
- No environment files, provider credentials, private CAD inputs, migrations, purchases, uploads, provider calls, messages, push, PR, merge or deployment. No UI/Convex code changed; their editing skills and browser QA were not applicable. The payments skill informed the Stripe work.

## Source changes and evidence

`server/commercialization.js` now separates server-resolved identities from untrusted client/profile fields. An issuer/subject tuple determines a verified user ID and shop. Email grants require `emailVerified: true`; display names never grant access. Guests use a separate free-only namespace. The local resolver is a test seam, not an installed ordinary-customer authentication integration: `server/index.js` supplies none.

All commercial routes, webhooks and known credit-gated workflow features require explicit local file mode and an absolute store path. Production, Vercel (either host flag), Lambda and Cloud Run are denied even with local mode selected. Zero-cost follow-on operations retain their catalog cost but must pass the same gate. Google Play verification stays denied pending ownership/lifecycle integration.

Local operations serialize the whole read/modify/write sequence, use an exclusive file lock across processes, and write through an fsynced temporary file plus atomic rename. Failed writes do not grant work. This protects local restarts and concurrent writes. It does not establish production durability, high availability, database transactions or multi-instance hosting readiness. A crashed process can leave a lock; no automatic lock stealing occurs. The parent directory is not fsynced, so sudden host power-loss durability is unproven.

Credit event keys include shop, feature, credit-period kind/key, access class and caller retry key. Repeated keys charge once; another shop charges independently; changed payloads return 409. Requests without keys represent separate operations. Starter-password grants must reset before any credit-gated workflow operation.

Stripe reconciliation verifies raw-body signatures using the SDK, fetches current subscription state, and commits the entitlement update with the processed event ID. It does not sort snapshots by event timestamps. Cancellation, past-due denial, payment recovery and item-level period-end projection are covered. A canceled customer can re-subscribe through a saved checkout intent whose metadata must match before a replacement subscription binds. Late events for the retired subscription do not restore its plan. Checkout uses provider idempotency and fixed configured redirect URLs; unresolved attempts older than 23 hours stop for reconciliation. Portal access requires an existing authenticated billing customer.

The old smoke command now launches the expanded tests in a clean child environment. The earlier valid grant/reset, invite/replay and file-outbox paths remain covered with verified synthetic identities; caller-name and caller-email authorization assertions were replaced with denial assertions. No test resolver is exported to production or wired into `server/index.js`.

## Validation

Run from this worktree:

```sh
env -i PATH=/usr/local/bin:/usr/bin:/bin NODE_PATH=/Users/vambahsillah/Documents/ReversR-Workspace/ReversR-Rebuild/node_modules /usr/local/bin/node scripts/commercial-credit-gate-smoke.js
node --check server/commercialization.js
node --check scripts/commercial-launch-readiness.test.js
node --check scripts/fixtures/commercial-restart-check.js
env -i PATH=/usr/local/bin:/usr/bin:/bin NODE_PATH=/Users/vambahsillah/Documents/ReversR-Workspace/ReversR-Rebuild/node_modules /usr/local/bin/node --test --test-name-pattern="real commercial accounts" scripts/cad-user-upload-route.test.js
env -i PATH=/usr/local/bin:/usr/bin:/bin NODE_PATH=/Users/vambahsillah/Documents/ReversR-Workspace/ReversR-Rebuild/node_modules /usr/local/bin/node --test scripts/cad-user-upload-route.test.js
node --check scripts/cad-user-upload-route.test.js
git diff --check
```

The dependency path reuses the existing installed Express/Stripe libraries read-only; it does not read the Captain checkout's environment or change its dependencies. The suite creates disposable local files, binds loopback only, blocks other sockets/TLS, mocks provider methods and uses the real Stripe SDK signature checker. Tests exercise registered Express account/billing/admin/invite routes and registered charge-wrapper routes calling the same credit gate used by `server/index.js`. A separate clean process re-registers the account handler and verifies file persistence and missing-Stripe denial.

Final result: 29 commercial tests and all 7 CAD upload-route tests passed (36 unique tests, zero failures). The focused `real commercial accounts` rerun also passed (1 test, included in the 7). JavaScript syntax and whitespace checks passed. No frontend build/typecheck was needed for these CommonJS-only changes. No complete AI/provider reconstruction, real end-user login, deployed payment flow, browser visual QA or production smoke was run.

## Captain QA follow-up: CAD boundary test compatibility

The commercial patch added `async_hooks`, explicit local storage configuration and verified identity resolution. Captain QA found that the existing VM harness in `scripts/cad-user-upload-route.test.js` had neither those dependencies nor a model of exclusive file locks and atomic rename. Its old tester expectations also trusted caller headers.

The follow-up changes only that test and this handoff. The VM now supplies `structuredClone`, `AsyncLocalStorage`, `app.locals`, an explicit synthetic local store path and an in-memory filesystem that models exclusive creation, temporary writes, rename and lock release. Stripe construction and unlisted dependencies still throw; the harness never imports the configured commercial module or writes its synthetic store to disk.

The actual commercial `/api/me` handler runs against 13 cases: guest headers/body, an ordinary verified account, spoofed tester email/name, unverified email, verified tester email, spoofed/verified invite identity, spoofed/verified password grants, and spoofed/verified super-admin identity. Positive grants must produce the expected tester role/plan; spoofed grants must remain free. Each resulting account and a forged CAD-authority claim must fail session issuance. The mounted CAD request fixture still requires missing credentials to return `USER_SESSION_REQUIRED` and an unavailable synthetic credential to return `USER_AUTH_UNAVAILABLE`, while asserting zero body reads and zero conversions. Five missing/hosted configuration cases additionally prove denial before account creation.

A targeted scripts search found two other fixtures that directly load the commercial source: `scripts/commercial-launch-readiness.test.js` and `scripts/fixtures/commercial-restart-check.js`; both already use the current contract and passed in the commercial rerun. `scripts/cad-readiness.test.js` replaces the commercial dependency with a forbidden-call stub and does not execute it. The remaining search hits were prose assertions, not loaders. No additional fixture changes were needed.

## CI wiring

The separate `.github/workflows/commercial-source-ci.yml` runs on pull requests to `main`, with read-only contents permission and the existing Node 22/`npm ci` conventions. It runs the 29 commercial tests and all 7 CAD upload-route safety tests immediately after dependency installation. Each test command starts with `env -i PATH="$PATH"`; it inherits only the installed Node search path, without secrets, provider settings, `NODE_OPTIONS` or dotenv loading. The commercial launcher also sanitizes its child environment. Failure of either suite fails the workflow step.

The digest-bound `.github/workflows/release-local-ci.yml` exactly matches the original base commit. The earlier local CI addition was removed in a follow-up commit; no CAD packets or runtime wiring were changed. `scripts/local-release-ci.js` remains unchanged and was not executed for this source-only task.

The workflow YAML was parsed locally with the existing `yaml` package, and the parsed step order and exact sanitized commands were checked. Local suite results remain 29 commercial plus 7 CAD guard tests passing; no GitHub-hosted CI run has occurred because the branch has not been pushed.

## Finite prioritized launch-gap checklist

| Priority | Remaining gap and exact next evidence | Owner/decision needed |
|---|---|---|
| P0 — 1 | Ordinary-user login and shop ownership: choose the supported identity provider, wire its verifier into the actual API host and frontend request headers, verify issuer/audience/signature/expiry/revocation and verified-email provenance, and prove two real test users cannot cross accounts. Existing `convex/auth.ts` is a gated CAD development source and does not satisfy this. Decide Team membership/owner-only billing rules. | Captain/Vambah must select the ordinary-user auth owner and approve that bounded integration. Provide the chosen issuer and audience identifiers, not credentials. |
| P0 — 2 | Production persistence and migration: select a transaction-capable durable store and host integration; implement atomic debits/webhook receipts, backup/restore and multi-instance race tests. Review legacy account/shop/usage/customer mappings before any migration. Caller client IDs are no longer authenticated IDs: admin grants must target the `user_…` ID returned by verified `/api/me`, or an explicitly verified email. Name-only grants stop working. | Select the persistence owner and approve a previewable migration plan. No cloud resource, migration or hosted activation has been created. Local mode cannot clear this blocker. |
| P0 — 3 | Journey credit contract: bind each reconstruction and its zero-cost follow-on spec/sketch/BOM/export operations to a server-owned journey and authenticated shop. Define reservation/refund/result-replay behavior when the AI operation fails after the debit. Preserve or explicitly approve changes to existing UTC calendar credit resets (currently separate from Stripe billing-cycle dates). Anonymous free credits still identify a device hint and can be reset by changing it; they are not abuse-resistant identity. | Product/Captain approval of journey ownership, failure-credit and reset policy; then actual route-to-workflow tests. Current tests prove ledger correctness only. |
| P0 — 4 | Payment host qualification: verify the deployed secret/price/webhook/return-URL configuration by names and readiness, align event destination version with pinned `2026-02-25.clover`, then separately authorize a Stripe test-mode checkout/portal/webhook lifecycle proof. Include first purchase, cancel at period end, final cancellation, failure/recovery and re-subscription. Define safe support reconciliation for stale checkout/customer-creation ambiguities; no automatic reset is included. | Payment owner configures `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO_SHOP`, `STRIPE_PRICE_TEAM`, `BILLING_RETURN_URL`, `BILLING_CANCEL_URL` through the approved secret store. Return sanitized readiness evidence, never secret values. Google Play remains unavailable unless separately integrated. |
| P1 — 5 | Frontend and support readiness: connect the ordinary login, make denied/loading/stale-account states actionable, update tester onboarding copy that currently implies entering an email establishes access, and verify desktop/mobile actions. Prove customer support can reconcile stale checkout without issuing duplicate subscriptions or resetting usage. | Captain QA after items 1–4. This patch intentionally makes existing hosted commercial/account/support paths return 503 and protected local paths return 401 without a resolver. It is not safe to describe this source patch as a launch-ready feature release. |
| P1 — 6 | Mark acceptance and controlled rollout: complete the five checks below, record Mark's explicit approval, then agree on the bounded cohort, support owner, monitoring and rollback before customer access. | Mark acceptance and separate controlled-rollout gate. Neither is authorized by these synthetic tests. |

## Mark acceptance card (pending the blockers above)

1. **Login:** open the exact Captain-provided account URL, sign in with an ordinary approved test identity, and confirm the displayed shop belongs to that identity. Sign out and use a second test identity; confirm isolation. A saved profile form alone is not login.
2. **Selected subscription and credits:** on `/account` (“Repair shop plan and credits”), select the existing approved plan through the authorized payment test flow. Confirm its price, plan name, credit count and reset rule. Retry/reload once and confirm no duplicate subscription or extra debit. Source: `app/account.tsx`, `hooks/useCommercialization.tsx`, `utils/commercialUsage.ts`, `PLAN_CATALOG`.
3. **Useful workflow:** use the public FarmBot fixture (`public/inventory/farmbot-genesis-v1.8.json`, `/api/mock-tour/farmbot-genesis-v1.8`) or another explicitly approved synthetic input. Complete one intended reconstruction, inspect the spec/BOM/review output, and export the intended supported artifact. Confirm one journey debit and no extra charge for its follow-on work. Record what is demonstrated versus unavailable. This source task did not execute that workflow and does not open CAD upload/conversion.
4. **Persistence:** reload, sign out, and start a new browser session; confirm the same account, subscription, remaining credits and intended history are present. Include a separately controlled API restart/host redeploy check once durable storage exists. Local JSON restart proof does not satisfy this hosted check.
5. **Cancellation, support and limitations:** use “Billing Portal” to exercise the approved test cancellation/recovery path and inspect the resulting access state. Open `/support`, verify a useful recovery path, and confirm the limitations (native billing status, CAD gates and supported export scope) before approving rollout. Record pass/fail and artifact links for each check.

## Recovery and compatibility notes

- Existing client/profile headers cannot recover a legacy paid account. Preserve the old store untouched for the reviewed identity-to-shop migration; never auto-link billing by an email typed into the UI.
- Local admin access through the existing server admin check remains available only in explicit local mode. Verified local super-admin grants and tester password reset/invite paths have positive tests. Guest support submission and invite lookup are now denied.
- To recover a local abandoned lock, stop every process using that exact store, back up the store and lock, verify the file parses and has the expected account/usage data, then remove only that store's `.lock` and restart. Do not remove a lock while its owner might be running. This is local operator recovery, not a hosted-storage recommendation.
- A stale checkout returns 409 and requires payment-owner reconciliation; changing its intent blindly can duplicate a subscription. Existing active/past-due subscriptions use the portal instead of new Checkout. Trialing remains an allowed status as in the original source; failure-credit and grace-period product policy is still item 3/4.

## Primary Stripe sources consulted

- [Webhook delivery, signatures, duplicates and unordered events](https://docs.stripe.com/webhooks).
- [Subscription lifecycle webhook guidance](https://docs.stripe.com/billing/subscriptions/webhooks).
- [Basil: subscription period dates moved to subscription items](https://docs.stripe.com/changelog/basil/2025-03-31/deprecate-subscription-current-period-start-and-end), applicable to the pinned Clover API.
- [Idempotent requests and the minimum 24-hour retention window](https://docs.stripe.com/api/idempotent_requests).

Next gate: Captain source QA of this local branch and its intentional denial behavior. Keep this task and worktree open. Publication, deployment, auth/storage setup, Mark review and customer rollout remain separate from this completed source patch.
