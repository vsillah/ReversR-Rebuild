# CAD development-readiness autopilot guard

Base: `d2ebbbf44726e3934581b35e85e77b75f4bc9790`, after PR #227.
Branch: `codex/cad-dev-autopilot-readiness`.
Status: source-only autopilot guard; live development execution is still blocked.
Expenses: USD 0.

This packet records the development-readiness autopilot envelope and turns it into
a source-reviewed guardrail. It allows the captain to keep automating source
branches, one-commit PRs, merges, normal Vercel deployments for source-only changes,
production fail-closed smokes and cleanup. It does not make the current repository
live-ready for Auth/session, upload admission, conversion or production CAD.

## Current stop

The current source remains intentionally closed:

- `convex/developmentAuth.ts` has `developmentAuthReviewed=false`.
- `convex/auth.ts` installs `developmentPassword([])`.
- The dashboard evidence shows env row names and usage limits, but no secret
  custody, all-in cost cap, row rollback, or source/deployment rollback receipt.
- The pinned removal review found no reviewed account or user removal helper.
- Bounded retention and retained-terminal lockout packets are source-only and not
  accepted for live use.

Under the approved autopilot envelope, this is a hard stop before any live synthetic
Auth provisioning or Convex store write. Source/PR automation may continue.

## What autopilot can do now

Autopilot may continue these actions without another per-step interruption:

- create dedicated local worktrees and branches
- implement source-only docs, tests, manifests, and guard code
- run local validation
- push one-commit branches and open draft PRs
- mark ready, merge after green checks, and allow normal Vercel production
  deployment for source-only changes
- run the established production fail-closed route smoke
- cleanup merged branches and worktrees

It may also prepare the next source slice for bounded retention, lockout,
private-register receipts, rollback, and cost evidence. That next slice must still
stop before live provisioning, deployment, env mutation, secret handling, upload
activation or conversion.

## What autopilot cannot cross

These are hard stops:

- unknown outcome
- failing production smoke
- missing rollback
- uncertain all-in cost cap
- private CAD
- real users
- production CAD upload activation
- production conversion
- provider/resource changes outside `reversr-cad-auth-dev` / `majestic-alligator-31`
- new paid commitments at or above USD 10
- email, SMS, Slack or external delivery

The source packet also keeps false authority for secret value reads, secret
generation, current env mutation, current provider/resource mutation, development
deployment, live development run, store mutation, retry and second run.

## Condensed remaining roadmap

1. Publish and close out this guard packet.
2. Source-only: implement the retention/lockout/private-register bridge and exact
   rollback/cost command manifests.
3. Source-only: prepare the development Auth source enablement with the two-person
   synthetic cohort and disabled rollback SHA.
4. Development-only: deploy the reviewed source to `majestic-alligator-31` only if
   target identity, usage/cost cap, rollback and env custody are verified.
5. Development-only: run one bounded Auth/session qualification with synthetic
   identities, no delivery, no retry and no second run.
6. Development-only: qualify synthetic upload admission only after Auth/session
   passes and disabled-route checks remain fail-closed.
7. Development-only: qualify synthetic conversion/Sandbox only after upload evidence
   passes.
8. Manual gate: private CAD or any production CAD activation.

The next automated source slice is:

`codex/cad-dev-retention-lockout-autopilot`

Scope: source/local implementation and tests only for bounded retention policy
acceptance, lockout fence readiness, private-register receipt templates, cost and
rollback evidence gates, and exact development deployment/run commands. No live
mutation is authorized by this packet.

## Validation

```sh
node --test scripts/cad-dev-readiness-autopilot.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

## Next publication flow

Autopilot may publish this packet under the approved envelope, then merge, smoke
and cleanup after green checks. If any step fails, it stops and reports the exact
failure.
