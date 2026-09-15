# CAD development cost, custody, rollback and window evidence

Base: `fa480868ddfd28cc99c2420ab341859f525e83a2`, after PR #234.
Branch: `codex/cad-dev-cost-custody-rollback-window-evidence`.
Status: source-only evidence update; no billing, env, provider, deployment, store,
upload or conversion change.
Expenses: USD 0.

This packet records the two decisions that were missing after the cost-cap hard
stop packet:

- The existing Convex team usage spending disable threshold remains `USD 50` per
  month for internal testing. It was observed read-only and was not changed.
- Backup custodian for rollback and value-free secret custody is `Amina`.

## Interpretation

The `USD 50` threshold is an internal testing cushion for the Convex team usage
spending disable threshold. It is intentionally higher than the standing
sub-`USD 10` small-expense default because Mark's testing should not be brittle
or fail simply because a low-volume evaluation hits a tiny hard cap.

That does not make `USD 50` a run price, a target spend or an end-to-end CAD cost
model. It also does not cover Vercel, Sandbox, conversion compute, storage,
egress, retained evidence, failed-run cleanup, taxes, fees or currency effects.

## Fast Follow

The cost work that should follow, but does not block the immediate Auth/session
source path, is an end-to-end CAD run cost ledger. It should break down:

- Convex function calls, compute, database IO, storage and egress
- Vercel app/function costs
- Vercel Sandbox active CPU and provisioned memory
- CAD conversion or rendering compute
- upload/result transfer and artifact storage
- retained evidence and cleanup overhead
- stopped or failed run overhead
- taxes, fees and currency effects

The expected output is a cost per successful CAD run, cost per stopped or failed
run, expected Mark testing budget, internal cap per test window and recommended
production fee per CAD run.

## Command Binding

This packet includes template digests for the development deploy and disabled
rollback commands. They are not executable authority yet because the exact source
SHA, disabled rollback SHA, env-file custody receipt and future UTC window still
need to be bound.

Deploy template digest:
`5f97744682053df701e8e3c17b407ad0cc591d7c07dcf3e97d1eaaf1d225deeb`

Rollback template digest:
`5d59af398764917b610af27019efc000ec4ceda5c5c19220fe47d09f575e666f`

## Remaining Gates

- Exact deploy and rollback command binding to reviewed source.
- One fresh future UTC run window.
- Future per-CAD-run cost ledger before production pricing or broader tester
  budget decisions.

The next source-only slice can bind exact deployment and rollback command
manifests and propose one future UTC window. It must still stop before env
mutation, development deployment, live run, upload activation or conversion.

## Preserved Authority Boundaries

All of the following remain false:

- billing mutation
- provider, auth or resource mutation
- environment value read or mutation
- secret generation or storage
- deployment
- live tests, retry or second run
- CAD upload activation
- CAD conversion or Sandbox dispatch
- private CAD handling
- Supabase or other-store mutation
- email, SMS or Slack delivery
- production CAD readiness

## Validation

```sh
node --test scripts/cad-dev-cost-custody-rollback-window-evidence.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```
