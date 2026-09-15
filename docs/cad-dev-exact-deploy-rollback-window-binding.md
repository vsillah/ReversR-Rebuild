# CAD exact deploy, rollback and window binding

Base: `c30af570b2baede03e1a78739f176beb30f32bfa`, after PR #235.
Branch: `codex/cad-dev-exact-deploy-rollback-window-binding`.
Status: source-only command binding; no env mutation, deployment, live Auth,
store write, upload activation, conversion or private CAD.
Expenses: USD 0.

This packet converts the prior command templates into source-bound command
digests for the development Auth/session path while preserving the deployment
gate. It also records the accepted cost and custody decisions from PR #235:

- Convex team usage spending disable threshold remains `USD 50` per month for
  internal testing, with no billing or setting mutation in this packet.
- Backup custodian is `Amina`; Mark remains a tester-reviewer, not a custodian.
- End-to-end CAD run cost is still a fast-follow ledger item before production
  pricing or broader tester-budget decisions.

## Exact Command Bindings

Candidate source SHA:
`c30af570b2baede03e1a78739f176beb30f32bfa`

Disabled rollback source SHA:
`fa480868ddfd28cc99c2420ab341859f525e83a2`

Deploy command digest:
`f282f86280ae7f2cdd7125320721856dac6954027b3df35f7b8d16bb933ee629`

Disabled rollback command digest:
`43d423116f521c3f0c037e79df7bccbe5ac1b1b3a7d68661eb1798a34b1b3e44`

The command strings are exact, but they are not execution authority. They still
depend on a reviewed ignored env-file custody receipt, row-specific rollback
receipt, explicit development deployment approval and a separately accepted fresh
run window.

## Proposed Fresh Window

Proposed window:
`2026-09-15T19:00:00Z` through `2026-09-15T19:15:00Z`

This is a proposal only. It does not authorize a live run, retry or second run.

## Remaining Gates

- Value-free env-file custody receipt and row-specific rollback receipt.
- Separate development deployment approval before any Convex deploy.
- Separate fresh UTC window acceptance before any development Auth/session run.
- Fast-follow end-to-end CAD run cost ledger before production pricing or broader
  tester-budget decisions.

## Preserved Authority Boundaries

All of the following remain false:

- production upload activation
- production conversion
- private CAD handling
- real-user enrollment
- email, SMS or Slack delivery
- secret value read or generation
- development env mutation
- provider, auth or resource mutation
- development deployment
- live Auth/session run
- store mutation, retry or second run
- billing mutation

## Next Safe Action

The next branch is:

`codex/cad-dev-env-custody-rollback-receipts`

Scope: source-local value-free env custody and rollback receipt projection for
`JWKS`, `JWT_PRIVATE_KEY` and `SITE_URL` using the bound commands and `Amina`
backup custodian. It must stop before secret value reads, env mutation, provider
or resource changes, development deployment, live Auth/session runs, upload
activation or conversion.

## Validation

```sh
node --test scripts/cad-dev-exact-deploy-rollback-window-binding.test.js
node --test scripts/cad-dev-cost-custody-rollback-window-evidence.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```
