# CAD development Auth reviewed source gate

Base: `389cadad0fee8a1abe8c334933a956f9845129cb`, after PR #237.
Branch: `codex/cad-dev-auth-reviewed-source-gate`.
Status: reviewed development Auth source gate enabled in source only; no
development env mutation, provider/resource configuration, deployment, live
Auth/session run, upload activation, conversion or private CAD.
Expenses: USD 0.

This packet flips the reviewed source gate in `convex/developmentAuth.ts` from
planning-only to source-enabled:

`developmentAuthReviewed: boolean = true`

The gate remains constrained to the reviewed development target:

- Project: `reversr-cad-auth-dev`
- Deployment: `majestic-alligator-31`
- Issuer: `https://majestic-alligator-31.convex.site`
- Local harness origin: `http://localhost:5001`
- Synthetic cohort:
  - `cad-test-alpha-20260915@auth-test.invalid`
  - `cad-test-beta-20260915@auth-test.invalid`

The source accepts only sign-in for the two synthetic addresses. Sign-up,
password reset, extra parameters, unknown users, non-local redirects and missing
or mismatched environment row names remain fail-closed.

## Custody

- Primary custodian: Vambah Sillah
- Backup custodian: Amina
- Mark role: tester-reviewer, not custodian

## Command Binding Effect

The prior exact command digests remain useful as reviewed inputs, but they are no
longer sufficient for deployment because this packet changes source.

Deploy command digest previously reviewed:
`f282f86280ae7f2cdd7125320721856dac6954027b3df35f7b8d16bb933ee629`

Disabled rollback command digest previously reviewed:
`43d423116f521c3f0c037e79df7bccbe5ac1b1b3a7d68661eb1798a34b1b3e44`

A new source-only binding packet must rebind exact development deploy and
rollback command digests to the merged source-gate commit before any Convex
development deployment can run.

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
- Sandbox dispatch

## Next Safe Action

The next branch is:

`codex/cad-dev-reviewed-source-deploy-binding`

Scope: source-only command binding refresh to the merged reviewed source-gate
commit and one fresh development qualification window proposal. It must stop
before development deployment, env/provider/resource mutation, live Auth/session
runs, upload activation, conversion, private CAD or external messages.

## Validation

```sh
node --test scripts/cad-dev-auth-reviewed-source-gate.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
npm run typecheck
git diff --check
```
