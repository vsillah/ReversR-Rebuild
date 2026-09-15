# CAD development env custody and rollback receipts

Base: `a5b98e4e72563b48061efeece679e816e8e068d9`, after PR #236.
Branch: `codex/cad-dev-env-custody-rollback-receipts`.
Status: source-local value-free receipt projection; no secret value read, env
mutation, deployment, live Auth, store write, upload activation, conversion or
private CAD.
Expenses: USD 0.

This packet records an ignored local receipt for development Auth environment
custody and rollback planning. The receipt is value-free: it includes row names,
opaque custody refs, opaque rollback refs and command digests only.

Ignored local receipt digest:
`9ae02fe3dcbdbf7c45cdf8efb21fa1c1cf5706b067db54eef02a20e4b651de6a`

The receipt is ignored by Git, directory mode `700`, file mode `600`, and its
source-safe projection records no secret values, value hashes, private paths,
private CAD or real users.

## Rows Covered

- `JWKS`
- `JWT_PRIVATE_KEY`
- `SITE_URL`

Each row has a value-free prior-version-or-absence ref and rollback-action ref.
No row add, edit, delete or overwrite is authorized by this packet.

## Custody

- Primary custodian: Vambah Sillah
- Backup custodian: Amina
- Mark role: tester-reviewer, not custodian

## Bound Commands

Deploy command digest:
`f282f86280ae7f2cdd7125320721856dac6954027b3df35f7b8d16bb933ee629`

Disabled rollback command digest:
`43d423116f521c3f0c037e79df7bccbe5ac1b1b3a7d68661eb1798a34b1b3e44`

These command digests remain source-bound only. They are not execution authority.

## Remaining Gates

- Reviewed development Auth source gate.
- Separate development deployment approval and durable release capture.
- Separate fresh UTC run-window acceptance before any development-only
  Auth/session qualification attempt.
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

`codex/cad-dev-auth-reviewed-source-gate`

Scope: local source-only implementation and tests for the reviewed development
Auth source gate using the existing two-slot cohort, accepted custody, bound
rollback, and disabled upload/conversion preservation. It must stop before
development env mutation, provider/resource changes, development deployment, live
Auth/session runs, upload activation or conversion.

## Validation

```sh
node --test scripts/cad-dev-env-custody-rollback-receipts.test.js
node --test scripts/cad-dev-exact-deploy-rollback-window-binding.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```
