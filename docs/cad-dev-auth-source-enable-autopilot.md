# CAD development Auth source enablement

Base: `b25016abe07f5351191b87af14e4786227c6e1e5`, after PR #229.
Branch: `codex/cad-dev-auth-source-enable-autopilot`.
Status: source-only, disabled by default. No development deployment, live run or
store mutation.
Expenses: USD 0.

This slice prepares the exact two-slot synthetic Password cohort in source while
keeping the runtime gate closed. `developmentAuthReviewed` remains `false`; the
new cohort helper returns an empty array until that reviewed source gate changes.
That means Convex Auth remains inert in current source unless every later evidence
and deployment gate is satisfied.

Prepared synthetic cohort:

- `cad-test-alpha-20260915@auth-test.invalid`
- `cad-test-beta-20260915@auth-test.invalid`

These are reserved test identifiers only. They are not enrolled users, not real
users, not email delivery targets and not authority to provision accounts.

## Current stop

The following remain false:

- bounded retention policy accepted
- lockout fence accepted
- private register receipt accepted
- cost-cap evidence accepted
- rollback evidence accepted
- development env custody accepted
- development deployment authorized
- live development run authorized

No live Auth/session provisioning is authorized by this packet. No env mutation,
secret read, secret generation, deployment, store mutation, upload activation,
conversion, private CAD, email/SMS/Slack or retry is authorized.

## Required next packet

The next source-only slice is:

`codex/cad-dev-auth-acceptance-manifest`

It should assemble the accepted retention, lockout, private-register, cost and
rollback evidence into one development E/D/T approval packet. It must still stop
before deployment and live run unless those gates are explicitly satisfied.

## Validation

```sh
node --test scripts/cad-dev-auth-source-enable-autopilot.test.js
node --test scripts/cad-dev-readiness-autopilot.test.js scripts/cad-dev-retention-lockout-autopilot.test.js
npm run typecheck
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```
