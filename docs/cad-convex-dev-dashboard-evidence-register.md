# CAD Convex development dashboard evidence register

Base: `7e6498de724f57cf3ea725a0f89b8b55f2bc4fb7`, after PR #225.
Branch: `codex/cad-dev-dashboard-evidence-register`.
Status: source-only evidence register for the read-only Convex development
dashboard refresh. Expenses: USD 0.

This packet records nonsecret dashboard and CLI evidence for future U/K/E/D/T
manifest work. It does not grant provider setup, environment mutation, usage or
billing changes, deployments, live tests, CAD upload activation, conversion,
private CAD handling, Sandbox dispatch, store mutation, push, merge or cleanup.

## Identity and deployment evidence

Read-only target:

- Team: `vambah-sillah`; team ID from the approval text: `405220`
- Project: `reversr-cad-auth-dev`
- Deployment: `majestic-alligator-31`
- Type: development cloud deployment
- Region: `US East (N. Virginia)`
- Runtime surface: `Convex 1.45.0`
- State: deployment currently running
- Expiry: `Never`
- Cloud URL: `https://majestic-alligator-31.convex.cloud`
- HTTP Actions URL: `https://majestic-alligator-31.convex.site`

The dashboard and CLI exposed stable slugs and the deployment name. The inspected
surfaces did not expose separate immutable project or deployment IDs. That absence
is recorded as an evidence limitation; it is not replaced with the team ID.

Operator evidence:

- Team members page showed Vambah Sillah as `Admin`.
- Project settings showed Vambah Sillah as `Team Admin` and `Project Admin`.
- The account email was observed in the dashboard but deliberately omitted from
  this source-safe register.

## Environment and Auth evidence

Environment variable row names were verified with both the pinned local Convex CLI
and the dashboard Environment Variables page. Values were not read.

| Row | Presence | Value read |
| --- | --- | --- |
| `JWKS` | present | no |
| `JWT_PRIVATE_KEY` | present | no |
| `SITE_URL` | present | no |

Excluded from this packet: deploy keys, provider OAuth secrets, service
credentials, platform-owned URL rows, raw values, value hashes and screenshots
that expose profile or secret material.

Dashboard Authentication Configuration reported: "This deployment has no
authentication providers yet." The function spec still exposes Convex auth
functions, including `auth.js:isAuthenticated`, `auth.js:signIn`,
`auth.js:signOut` and internal `auth.js:store`. This is evidence of source
surface, not permission to configure providers or enroll users.

## Usage, diagnostics and release evidence

The deployment usage-limit state was read with:

```sh
./node_modules/.bin/convex deployment usage-limits list --deployment majestic-alligator-31
```

Observed active, non-triggered daily disable limits:

| Metric | Limit | Current at refresh |
| --- | --- | --- |
| Function calls | 100 calls | 17 calls |
| Query/Mutation compute | 1 GB-hours | 0 GB-hours |
| Action compute | 1 GB-hours | 0 GB-hours |
| Action compute (Node.js) | 1 GB-hours | 0 GB-hours |
| Action compute (CPU) | 1 GB-hours | 0 GB-hours |
| Database I/O | 1 GB | 0 GB |
| Search queries | 1 Query-GB | 0 Query-GB |
| Data egress | 1 GB | 0 GB |

Usage snapshot at refresh: 17 function calls for the day, 30 for the month, and
zero observed day usage for compute, database I/O, search and data egress. This
is a point-in-time read, not a cost cap, spend authorization or recurring billing
change.

Dashboard settings showed:

- Send Logs to Client: `Default (enabled)`
- Dashboard Edit Confirmation: `Default (disabled)`
- Backup state: `No backup yet`
- Insights from CLI: empty array
- Integrations categories visible: Authentication, Log Stream, PostHog Logs

Last-deployed dashboard text showed `21 hours ago` by Vambah Sillah. This label is
not a durable release ID. Any later deployment decision still needs its own source
SHA, command, destination, rollback and production/development boundary.

## Manifest use

This register can fill future manifests only as nonsecret source-safe evidence:

- U: current deployment usage-limit rows and usage snapshot.
- K: row-name presence only; no custody, values, generation or vault state.
- E: target identity and row presence only; no environment mutation.
- D: development deployment identity, region, runtime and running state only.
- T: source/auth function surface and diagnostic context only; no run authority.

The successful fresh-window-1030 bounded development qualification remains a
separate completed evidence packet. This register does not retry it, start a new
run or broaden its conclusion.

## Preserved authority boundaries

All of the following remain false:

- provider/resource/auth mutation
- environment value read or mutation
- secret generation or storage
- usage or billing changes
- deployment, push, merge or cleanup
- live tests or second runs
- CAD upload activation
- CAD conversion or Sandbox dispatch
- private CAD handling
- production activation
- email, SMS or Slack delivery
- Supabase or other-store mutation

## Validation

```sh
node --test scripts/cad-convex-dev-dashboard-evidence-register.test.js
git diff --check
```

## Future approval phrases

Publication:

> I approve pushing only commit [full reviewed SHA] from codex/cad-dev-dashboard-evidence-register to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only Convex development dashboard evidence register. No merge, deployment, live tests, production/development env or provider/auth/resource changes, secrets, usage/billing changes, enrollment, email/SMS/Slack, store mutation, CAD upload activation, CAD conversion, private CAD, Sandbox dispatch, retry, second run, or branch/worktree cleanup.

Merge:

> I approve marking PR #[number] ready for review and merging it into main. Allow the normal Vercel production deployment from main. Preserve current production and development environment settings; do not configure provider/auth/resource settings, do not generate or store secrets, do not change usage or billing settings, do not enable CAD uploads, do not dispatch CAD conversion, do not run live tests, do not use private CAD, do not dispatch Sandbox work, do not retry any completed or stopped run, do not start a second run, do not send email/SMS/Slack, and do not cleanup the branch/worktree until production verification completes.
