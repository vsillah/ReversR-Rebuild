# CAD reviewed source deploy binding

Base: `ce00edb676b3209b96c01c90dd057eed44d81113`, after PR #238.
Branch: `codex/cad-dev-reviewed-source-deploy-binding`.
Status: source-only exact command rebinding; no development deployment, live
Auth/session run, upload activation, conversion, private CAD, real users,
provider/resource mutation or external messages.
Expenses: USD 0.

This packet binds the reviewed development Auth source gate to exact future
Convex development deploy and disabled rollback command digests.

## Runtime Source State

Candidate source SHA:
`ce00edb676b3209b96c01c90dd057eed44d81113`

Disabled rollback source SHA:
`fa480868ddfd28cc99c2420ab341859f525e83a2`

The candidate source has `developmentAuthReviewed: true` and installs only the
two reviewed synthetic users:

- `cad-test-alpha-20260915@auth-test.invalid`
- `cad-test-beta-20260915@auth-test.invalid`

CAD uploads and conversion remain disabled. Private CAD and real users remain
unauthorized.

## Exact Command Bindings

Deploy command digest:
`d56b4779e479529d429cb2937d9a753f73dd0c5d5a7f2ef5fe367c307d8d6f58`

Disabled rollback command digest:
`43d423116f521c3f0c037e79df7bccbe5ac1b1b3a7d68661eb1798a34b1b3e44`

The command strings are exact, but they are not execution authority in this
packet. They still depend on a bounded development deployment execution gate,
release/deployment evidence capture, rollback-readiness confirmation and a
separate fresh run-window acceptance.

## Proposed Fresh Window

Proposed window:
`2026-09-15T20:00:00Z` through `2026-09-15T20:15:00Z`

This is a proposal only. It does not authorize a live Auth/session run, retry or
second run.

## Custody

- Primary custodian: Vambah Sillah
- Backup custodian: Amina
- Mark role: tester-reviewer, not custodian

## Preserved Authority Boundaries

All of the following remain false:

- production upload activation
- production conversion
- private CAD handling
- real-user enrollment
- email, SMS or Slack delivery
- secret value read or generation
- provider, auth or resource mutation
- development deployment executed by this packet
- live Auth/session run
- store mutation, retry or second run
- billing mutation
- Sandbox dispatch

## Next Safe Action

After merge and production fail-closed smoke, the next bounded step is executing
one Convex development deployment using the exact reviewed deploy command,
capturing the development release/deployment evidence, and performing read-only
function/env verification. It must stop before any live Auth/session run, upload
activation, conversion, private CAD, real users, external messages or production
mutation.

## Validation

```sh
node --test scripts/cad-dev-reviewed-source-deploy-binding.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```
