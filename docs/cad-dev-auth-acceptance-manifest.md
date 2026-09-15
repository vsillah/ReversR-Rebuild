# CAD development Auth E/D/T acceptance manifest

Base: `c29e09c8c8c1046071e5f620f17041c082f5bf81`, after PR #230.
Branch: `codex/cad-dev-auth-acceptance-manifest`.
Status: source-only E/D/T acceptance map; no live Auth, env mutation, deployment
or store write.
Expenses: USD 0.

This packet assembles the current development Auth/session readiness evidence into
one stop/go map. It keeps autopilot moving on source and restricted evidence work,
but it blocks live development Auth because the U/K/E/D/T evidence is incomplete.

## What is ready

- The two synthetic identifiers are prepared in source.
- `developmentAuthReviewed` remains `false`, so the runtime cohort remains empty.
- The target development deployment is still `reversr-cad-auth-dev` /
  `majestic-alligator-31`.
- Prior successful fresh-window qualification evidence is recorded and not marked
  unknown.
- Production fail-closed route smoke remains the only production activity allowed
  by source PR closeout.

## What blocks live Auth now

- Team spending limit and all-in cost cap are not accepted.
- Secret custody, backup custodian and generator checksum are not accepted.
- Environment prior-version/absence and rollback receipts are not accepted.
- Durable development release ID and rollback deployment command are not accepted.
- Bounded retention policy is not accepted.
- Lockout fence evidence is not accepted.
- Private register receipt is not accepted.
- A fresh run window is not accepted.

No live development Auth/session run is authorized by this packet. No development
deployment, env mutation, secret read, store mutation, upload activation,
conversion, retry or second run is authorized.

## Next automated source slice

The next source/restricted-local branch is:

`codex/cad-dev-restricted-edt-evidence-prep`

It should prepare value-free secret custody, env rollback receipts, cost-cap proof,
deployment rollback command evidence, accepted retention/lockout digests and one
fresh development-only Auth/session run window. It must stay out of live mutation
until the complete bundle is accepted and the deployment/run gate is satisfied.

## Validation

```sh
node --test scripts/cad-dev-auth-acceptance-manifest.test.js
node --test scripts/cad-dev-auth-source-enable-autopilot.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```
