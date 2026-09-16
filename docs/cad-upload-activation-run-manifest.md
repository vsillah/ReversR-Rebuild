# CAD upload activation run manifest

Status: source-only command manifest and rollback reference packet. Uploads remain
disabled and execution is unapproved. Base: PR #259 merge
`90b66c68021e9003e5e723c0bb6ae4e81625611c`. Branch:
`codex/cad-upload-activation-run-manifest`. Expenses: USD 0.

This packet records the non-secret operator, backup, fail-closed route smoke,
command-template and rollback references needed before any future bounded
user-upload admission decision. It does not enable upload admission, CAD
conversion, Sandbox dispatch, private CAD, real users, provider configuration,
environment mutation, usage or billing changes, deployment, merge, email, SMS or
Slack.

## Source inputs

- [Upload activation readiness](cad-live-upload-activation-readiness.md)
- [User upload contract](cad-user-upload-contract.md)
- [Upload-session successful closeout](cad-dev-upload-session-successful-closeout.md)
- [Shared controls](cad-upload-shared-controls.md)

The current production disabled release is
`90b66c68021e9003e5e723c0bb6ae4e81625611c`. The production smoke for that commit
returned:

| Route | Expected closed result |
| --- | --- |
| `GET /?qa=90b66c6` | `200`, title `ReversR Rebuild` |
| `GET /api/cad/capabilities?qa=90b66c6` | `200` |
| `POST /api/cad/user-import?qa=90b66c6 {}` | `401 USER_SESSION_REQUIRED` |
| `POST /api/cad/import?qa=90b66c6 {}` | `401 UNAUTHORIZED` |
| `GET /api/cad/import-source-record?qa=90b66c6` | `404` |

Those results prove the currently deployed route remains fail-closed. They do not
authorize opening the route.

## Operators and custody

- Primary custodian: Vambah Sillah
- Backup custodian: Amina
- Tester reviewer: Mark

Mark remains the internal tester/reviewer and is not named as rollback custodian.
The backup name records accountability only; no secrets are read, generated,
stored or delivered by this packet.

## Command manifest

The companion JSON records deterministic SHA-256 digests for four future command
templates:

- disabled-release verification
- post-rollback fail-closed smoke
- close-admission-first rollback order
- bounded reconciliation of unknown run-owned selectors

The templates are not executable as-is and do not deploy anything. A future live
gate must bind exact source SHA, deployment reference, UTC window, cohort,
fixture, env custody receipt and exact commands before execution.

## Preserved boundaries

Every activation authority remains false:

- upload activation
- CAD conversion
- Sandbox dispatch
- private CAD
- real users
- production or development store mutation
- environment, provider, auth or resource changes
- usage or billing changes
- email, SMS or Slack

The route remains `USER_UPLOADS_DISABLED` for verified sessions and
`USER_SESSION_REQUIRED` without a valid upload session. No browser QA is required
because this packet changes docs, manifest and tests only.

## Future approval phrases

Publication:

> I approve pushing only commit [full reviewed SHA] from codex/cad-upload-activation-run-manifest to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only CAD upload activation run manifest and rollback reference packet. No merge, deployment, live tests, production/development env or provider/auth/resource changes, secrets or secret reads, usage/billing changes, enrollment, email/SMS/Slack, store mutation, CAD upload activation, CAD conversion, private CAD, Sandbox dispatch, retry, second run, or branch/worktree cleanup.

Future bounded admission only:

> I approve exactly one bounded CAD user-upload admission qualification run for commit [full SHA], exact deployment [deployment reference], route POST /api/cad/user-import, reviewed cohort [opaque cohort reference], synthetic/public fixture [reference], UTC window [start/end], reviewed run manifest [hash], and enforced all-in planning cap USD 50. Execute only reviewed admission, reconciliation and rollback commands [hashes]. Stop before conversion and Sandbox dispatch. No private CAD, real users, enrollment, email/SMS/Slack, production conversion, provider/auth/resource changes, usage/billing changes, secrets, unrelated store mutation, deployment, merge or cleanup.

## Validation

```sh
node --test scripts/cad-upload-activation-run-manifest.test.js scripts/cad-user-upload-activation-readiness.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```

Next safe source slice: implement a disabled admission adapter skeleton that
consumes these refs but keeps `BODY_ADMISSION_AUTHORIZED = false`, so the code
path remains reviewable without opening uploads.
