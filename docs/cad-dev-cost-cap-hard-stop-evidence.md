# CAD development cost-cap hard stop evidence

Base: `bfc32b615517e84db75f0d65af4905d0f7a5ae9e`, after PR #233.
Branch: `codex/cad-dev-cost-cap-hard-stop-evidence`.
Status: read-only usage evidence captured; team dollar cap still blocking.
Expenses: USD 0.

This packet narrows the remaining gate. It records fresh read-only deployment
usage evidence and explains why that evidence is not enough to authorize
development mutation.

## Read-Only Evidence Captured

- Deployment usage limits are active and untriggered.
- Function calls are limited to `100` per day and current usage is `17`.
- Query/mutation compute, action compute, database I/O, search and egress are
  well below their daily disable limits.
- Current monthly function calls are `30`.
- No usage, billing, env, provider, resource, store or deployment setting was
  changed.

## Why This Still Blocks

Convex deployment usage limits cap resource consumption for one deployment.
Convex team spending limits are the dollar cap on the team billing page. Because
the team spending-limit disable threshold is not observed here, the all-in
spend guard is still incomplete.

The standing below-USD-10 authorization is useful only after the run has an
enforceable cap or a verified no-overage path. It is not a substitute for the
missing team-dollar evidence.

## Evidence Needed To Continue

- Read-only dashboard evidence of a team spending-limit disable threshold below
  USD 10, or proof that this team/project has no paid overage path for the run.
- Named backup custodian acceptance for rollback and secret custody.
- Exact development deploy command digest, rollback command digest and disabled
  source rollback SHA.
- One accepted fresh future UTC run window for a single development-only run.

Until those are present, no development env mutation, deployment, live
Auth/session run, store mutation, upload activation, conversion, private CAD,
retry or second run is authorized.

## Official References

- Convex usage limits: `https://docs.convex.dev/production/usage-limits`
- Convex team billing and spending limits:
  `https://docs.convex.dev/dashboard/teams/teams`
- Convex role actions for billing view versus spending-limit update:
  `https://docs.convex.dev/team-management/role-actions`
- Convex deployment CLI usage commands:
  `https://docs.convex.dev/cli/reference/deployment`

## Validation

```sh
node --test scripts/cad-dev-cost-cap-hard-stop-evidence.test.js
node --test scripts/cad-dev-restricted-edt-acceptance-packet.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```
