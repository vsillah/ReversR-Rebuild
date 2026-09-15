# CAD development U/K/E/D/T manifest assembly

Base: `ce89f32080e83e2d496c1736a1b25aecee139a45`, after PR #226.
Branch: `codex/cad-dev-ukedt-manifest-assembly`.
Status: source-only U/K/E/D/T manifest assembly for review; not executable.
Expenses: USD 0.

This packet uses the refreshed Convex development dashboard evidence register to
assemble the next U/K/E/D/T review surface. It does not grant usage or billing
changes, secret generation, environment mutation, provider/auth/resource setup,
deployment, live tests, CAD upload activation, CAD conversion, private CAD use,
Sandbox dispatch, push, merge or cleanup.

## Inputs

- [Convex development dashboard evidence register](cad-convex-dev-dashboard-evidence-register.md)
  from PR #226, merged at `ce89f32080e83e2d496c1736a1b25aecee139a45`
- [Successful bounded development qualification closeout](cad-successful-bounded-dev-qualification-closeout.md)
  from PR #225
- [Historical E/D/T planning packet](cad-live-dev-edt-approval-packet.md)
- [Development Auth configuration gate](cad-live-dev-auth-config-gate.md)

The dashboard evidence register is fresher than the historical planning packet.
Where they conflict, this packet treats the refreshed register as current source
evidence and keeps execution closed.

## Target identity

Target remains:

- Team: `vambah-sillah`; team ID from approval text `405220`
- Project: `reversr-cad-auth-dev`
- Development deployment: `majestic-alligator-31`
- Region: `US East (N. Virginia)`
- Runtime surface: `Convex 1.45.0`
- Cloud URL: `https://majestic-alligator-31.convex.cloud`
- HTTP Actions URL: `https://majestic-alligator-31.convex.site`

The dashboard and CLI did not expose separate immutable project or deployment IDs
during the read-only refresh. That remains an evidence limitation, not something
to paper over with the team ID.

## U/K/E/D/T assembly

| Gate | Assembled evidence | Status |
| --- | --- | --- |
| U | Existing deployment usage limits are active and not triggered; function calls are capped at 100/day with 17 calls at refresh. | Existing evidence only; not a cost cap or usage/billing mutation authority. |
| K | `JWKS`, `JWT_PRIVATE_KEY` and `SITE_URL` row names are present; values were not read. | Row presence only; custody, generator, vault versions, pairing and freshness remain blocked. |
| E | Destination and three row names are verified; platform-owned rows remain excluded. | No env value read or mutation; no rollback manifest yet. |
| D | Development deployment identity, region, runtime and running state are verified. | No deploy command, release ID, rollback source or deployment authority. |
| T | The fresh-window-1030 synthetic durable-adapter run completed once with no retry or second run. | Prior run closed out; no new run, retry or live test authority. |

Diagnostics remain evidence only: Send Logs to Client is `Default (enabled)`,
Dashboard Edit Confirmation is `Default (disabled)`, backup state was `No backup
yet`, and the CLI returned no insights. No diagnostic setting change is included.

## Updated blockers

The refreshed register changes the old planning posture:

- Environment rows are no longer absent; they are present but value/custody state
  is intentionally unknown.
- Usage limits are no longer absent; active daily disable limits exist, but this
  still does not prove an all-in cost cap or authorize limit changes.
- Deployment state is currently running; the `21 hours ago` label is not a durable
  release identifier.
- Auth provider dashboard state still reports no authentication providers.
- The completed synthetic durable-adapter run is useful evidence, but it does not
  authorize a second run or upload/conversion activation.

Before any executable gate, the next private/restricted layer must supply
value-free receipts for rollback, custody, exact source/command binding, and owner
acceptance. This source packet deliberately does not contain values, secret hashes,
raw screenshots, account email, private paths, or live records.

## Preserved authority boundaries

All of the following remain false:

- provider, auth or resource mutation
- environment value read or mutation
- secret generation or storage
- usage or billing changes
- diagnostic setting changes
- deployment, push, merge or cleanup
- live tests, retry or second run
- CAD upload activation
- CAD conversion or Sandbox dispatch
- private CAD handling
- Supabase or other-store mutation
- email, SMS or Slack delivery

## Validation

```sh
node --test scripts/cad-dev-ukedt-manifest-assembly.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

## Future approval phrases

Publication:

> I approve pushing only commit [full reviewed SHA] from codex/cad-dev-ukedt-manifest-assembly to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only CAD development U/K/E/D/T manifest assembly packet. No merge, deployment, live tests, production/development env or provider/auth/resource changes, secrets or secret reads, usage/billing changes, enrollment, email/SMS/Slack, store mutation, CAD upload activation, CAD conversion, private CAD, Sandbox dispatch, retry, second run, or branch/worktree cleanup.

Merge:

> I approve marking PR #[number] ready for review and merging it into main. Allow the normal Vercel production deployment from main. Preserve current production and development environment settings; do not configure provider/auth/resource settings, do not read, generate or store secrets, do not change usage or billing settings, do not enable CAD uploads, do not dispatch CAD conversion, do not run live tests, do not use private CAD, do not dispatch Sandbox work, do not retry any completed or stopped run, do not start a second run, do not send email/SMS/Slack, and do not cleanup the branch/worktree until production verification completes.

Next source-only gate:

> I approve starting the next CAD Import phase for restricted operator-register and rollback-receipt preparation. Scope is source/local planning only: prepare value-free templates and tests for U rollback, K custody references, E row rollback, D source/command/rollback checks, T retained-state/reconciliation receipts, and exact future approval phrases. Do not push, merge, deploy, run live tests, start another live run, retry completed or stopped runs, read or generate secrets, change production or development env vars, configure provider/auth/resource settings, change usage or billing settings, enable CAD uploads, dispatch CAD conversion, use private CAD, mutate stores, dispatch Sandbox work, send email/SMS/Slack, or cleanup branches/worktrees.
