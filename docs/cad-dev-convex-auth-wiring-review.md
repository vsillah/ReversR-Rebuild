# Development auth wiring contract review

Base/disabled rollback: `312c9f5ddc81e92e9278aa9bd43108e46acc5592`.
Branch: `codex/cad-dev-convex-auth-wiring-impl`.
Worktree: `ReversR-Rebuild.worktrees/cad-dev-convex-auth-wiring-impl`.

## Implemented

An executable offline qualification contract and strict nonsecret manifest now pin
majestic-alligator-31, development, team vambah-sillah (405220), cloud/site origins,
Password existing-account signIn, a bounded synthetic cohort, environment name/scope
allowlist, and the reviewed disabled base. Unknown fields and secret-bearing values
fail closed. No environment values are accepted or read.

The host-injected bearer fixture contract snapshots the cohort and requires an exact
session/owner/method record for every attempt. It consumes nonces before awaiting,
limits runs to eight operations, one concurrent operation, five minutes and a
60-second session TTL. Replay, clock rollback, unknown commit/outcome, expired
session, mismatch and fixture errors halt the instance with sanitized output.
Stopping is irreversible within that instance. No token is minted or returned.
The manifest describes fixture provisioning only; it cannot create an account.

Runtime source remains unchanged: empty providers/issuers, unavailable session
reader, internal-only CAD functions and disabled upload admission. The runtime
reference audit now forbids devWiring references alongside prior offline packets.

## Boundaries and remaining blockers

This implements deterministic local contracts, not live service authentication.
Trusted hooks can invent fixture records; they must never be exposed to a request.
The nonce ledger is instance-local, so it is not durable cross-process replay
protection. Restart is a new offline run, never permission to retry an uncertain
live transaction. No write transport exists, and unknown outcomes remain denied.
The limits bound admission and fixture timestamps; a hanging hook has no transport
cancellation guarantee. A live transport needs cancellation and durable accounting.

SITE_URL is unused by this offline bearer contract. Its live requirement is still
unresolved. No new application env names are invented without consuming runtime
code. Project/deployment immutable IDs, exact app/API origins, human rollback owner,
real env inventory, usage cap and live expiry still need verified manifests.
Live Password provisioning, exact-session method provenance, service authentication,
durable replay/unknown-commit reconciliation and session revocation qualification
remain implementation blockers. Cookie CSRF/origin behavior is not implemented.

The only rollback here is stopping the local harness. The pinned SHA identifies
source whose runtime is disabled; it is not a deployed rollback receipt. Future
E/D/T approval must separately cover scoped development configuration, deployment,
synthetic provisioning/testing and cleanup. Live approval is not actionable yet.

## Validation and handoff

Run focused CAD/Convex tests, local codegen check, manifest and source audits, and
git diff --check. No UI changed; browser/viewport QA is N/A. No live requests,
deployments, private CAD, provider configuration, store writes or expenses occurred.

Next safe action: captain reviews this implementation and its validation receipt.
Publication requires the exact final SHA, substituted into this phrase:

> Approve pushing only commit [full reviewed SHA] from codex/cad-dev-convex-auth-wiring-impl to vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only development Convex/Auth wiring contract. No merge, deployment, resource creation, live tests, provider/auth or env configuration, real-user enrollment, email/SMS delivery, Supabase/other-store mutation, private CAD, conversion, Sandbox dispatch or CAD upload activation.

Keep the task, branch and worktree open for captain review. No push is authorized.

Validation receipt (2026-09-12):

- `node --test scripts/cad-convex-*.test.js scripts/cad-provider-store-contract.test.js scripts/cad-upload-session*.test.js scripts/cad-user-upload-route.test.js`: 90 passed, zero failures.
- `npm run typecheck`: passed.
- `npm run cad:convex:codegen:check`: five local bindings verified, no deployment access.
- `node scripts/cad-convex-contract-manifest.js`: 53 files verified.
- `node scripts/cad-convex-source-audit.js`: 39 files, zero leak-pattern matches.
- `git diff --check`: passed.

Dependencies reuse the existing schema-functions worktree through an ignored
node_modules symlink; no install or dependency changes. Runtime files were not
modified. Existing route tests use loopback; no live auth was exercised.
