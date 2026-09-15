# CAD development Auth/session run closeout

Base: `e4fed4ceadc20f193978ce7255889805f11da954`, after PR #244.
Branch: `codex/cad-dev-auth-session-run-closeout`.
Status: source-only closeout for the completed development Auth/session
qualification run. Expenses: USD 0.

## What Completed

The synthetic development-only Auth/session qualification ran once on Convex
development deployment `majestic-alligator-31` during the accepted UTC window
from `2026-09-15T19:25:00Z` through `2026-09-15T19:40:00Z`.

The sanitized local receipt reports:

- `DEVELOPMENT_AUTH_SESSION_QUALIFICATION_EXECUTED`
- `runCompleted: true`
- `unknownOutcome: false`
- `evidenceWritten: true`
- `automaticRetry: false`
- `secondRun: false`
- `cadUploadAllowed: false`
- `conversionAllowed: false`
- `privateCadUsed: false`
- `productionTouched: false`

The run stayed bound to the accepted immediate rebind evidence:

- projection `66df783b8d32d30689ae604496b83d27667fc88829298d79cf9df1713b579f8e`
- acceptance receipt `872aac5716d79027e1d6b8c7c772a933e67a9a9ef882a104575eb1bf17cda4fe`
- private register digest `9fbce1f0c4909d62abfd207c329171349e7a2692b3a01282528bd658ac5e3538`
- run-key digest `b471ba4b7632d9f454dbcd0234598e47b59147481b06e7807c356f8c8d081ef9`

The sanitized evidence hash is
`7cbb352cdefd3d190e30db67cd22c31a3712f5728addfc5024e37511ba161203`.
The sanitized run receipt hash is
`55f4b45bd74bc051ba8217f2b4946736bc27f5993c064a8e3ca8aa6bcbbd7ee0`.

## Operation Evidence

The reviewed Auth/session bridge completed the bounded synthetic sequence:

- provisioned identities: 2
- sign-ins: 2
- exact session reads: 4
- sign-outs: 1
- revocations: 1
- user IDs observed: 2
- session IDs observed: 2

The run retained synthetic users and accounts, revoked run-owned sessions, and
did not delete users or accounts.

## Binding Disposition

This closeout disables the active source binding. The one-run tuple has been
cleared from `convex/cadDevAuthQualificationBinding.ts`; future runs require a
new reviewed source rebind with a fresh accepted register, projection and UTC
window.

The target, synthetic cohort, maximum operation bounds, retained-account policy
and no-delete policy remain in source for review continuity. Executable run
authority is not present.

## What This Does Not Prove

This closeout proves only that the development Auth/session bridge completed
once with sanitized evidence under the accepted immediate rebind. It does not
prove user-facing CAD upload readiness.

Still separate:

- provider/resource/auth configuration authority
- development or production environment changes
- CAD upload activation
- CAD conversion or Sandbox dispatch
- private CAD handling
- real-user enrollment or notification
- production activation

## Validation

```sh
node --test scripts/cad-dev-auth-session-run-closeout.test.js
node --test scripts/cad-dev-auth-session-qualification-rebind.test.js
node --test scripts/cad-dev-auth-session-qualification-bridge.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
npm run cad:convex:codegen:check
npm run typecheck
git diff --check
```

## Next

After this source-only closeout is merged, deployed and fail-closed-smoked, the
next roadmap phase is the development-only synthetic upload/session flow. That
phase still keeps production upload activation, private CAD and conversion out
of scope.
