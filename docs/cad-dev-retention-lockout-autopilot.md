# CAD retention and lockout autopilot bridge

Base: `1113cb5d24b2b2f816886508719b8c01b161d488`, after PR #228.
Branch: `codex/cad-dev-retention-lockout-autopilot`.
Status: source-only retention/lockout bridge; no live provisioning, deployment or store mutation.
Expenses: USD 0.

This packet turns the prior bounded-retention and retained-state lockout planning
into the next autopilot guardrail. The blanket autopilot may keep moving source
branches through tests, PR, merge, production fail-closed smoke and cleanup. It
still cannot create synthetic Auth rows, change development configuration, deploy
Convex source, or run live development qualification until the retention, lockout,
cost and rollback evidence below is accepted.

## Current source stop

The live path remains closed:

- `offline/cad-convex/boundedRetentionPolicy.json` has `approved=false`.
- `offline/cad-convex/lockoutReadiness.json` has `enabled=false` and `liveReady=false`.
- `offline/cad-convex/removalRetentionReview.json` keeps provisioning blocked.
- `convex/developmentAuth.ts` keeps `developmentAuthReviewed=false`.
- `convex/auth.ts` installs the reviewed cohort helper, which still returns `[]`
  while `developmentAuthReviewed=false`.

That combination blocks live synthetic Auth provisioning, development deployment,
store writes, retry, second run, upload activation and conversion.

## Acceptance bridge

Before any live development Auth/session run, the following evidence must exist
as reviewed local artifacts and source-safe projections:

- bounded two-identity retention policy with a maximum 24-hour window
- exact terminal retained-row caps: four to six rows total, never cleanupVerified
- no automatic deletion at expiry; expiry means block and escalate
- concrete private custodian, review-before-expiry appointment and disposition plan
- server-side lockout/fence evidence that denies admission before revocation
- direct Auth, stale JWT, protected reader, concurrency, provider-failure and
  rollback-release denial evidence
- ignored local private register receipts with mode `600`
- source-safe projection digests that reveal no raw IDs, emails, passwords, tokens,
  credential hashes, session tokens or private file paths
- all-in cost ceiling evidence and usage-limit evidence
- rollback receipts for source, deployment and env rows

## Autopilot boundary

Autopilot can continue preparing source-only packets and tests. It can also
publish this packet through PR, merge, Vercel deployment, fail-closed production
smoke and cleanup under the approved envelope.

No live provisioning is authorized by this packet.
No development deployment is authorized by this packet.
No development env mutation is authorized by this packet.
No CAD upload or conversion path is authorized by this packet.

## Next source slice

The next automated source branch is:

`codex/cad-dev-auth-source-enable-autopilot`

It may prepare disabled-by-default development Auth enablement wiring, exact
two-slot synthetic cohort binding, rollback SHA checks, private-register receipt
loading and command manifests. It must remain source-only unless every retention,
lockout, private-register, cost and rollback precondition is accepted and then a
separate bounded development deployment/run gate is satisfied.

## Validation

```sh
node --test scripts/cad-dev-retention-lockout-autopilot.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

## Roadmap

1. Publish and close out this retention/lockout bridge.
2. Source-only: prepare disabled-by-default development Auth source enablement.
3. Source-only or restricted-local: accept concrete private register, cost and
   rollback receipts.
4. Development-only: deploy reviewed source to `majestic-alligator-31` only after
   rollback, usage/cost, target identity and env custody are verified.
5. Development-only: run one bounded Auth/session qualification with two synthetic
   identities, no email/SMS/Slack, no retry and no second run.
6. Development-only: qualify synthetic upload admission only after Auth/session
   evidence passes.
7. Development-only: qualify synthetic conversion only after upload evidence passes.
8. Manual gate: private CAD or production CAD activation.
