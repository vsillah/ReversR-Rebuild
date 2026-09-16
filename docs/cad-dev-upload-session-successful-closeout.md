# CAD development upload-session qualification closeout

Base: `8b5cb3e0db84a0df6b37f8557da8c32303e82024`, after PR #256.
Branch: `codex/cad-upload-session-successful-closeout`.
Status: source-only closeout for the completed development upload-session qualification run.
Expenses: USD 0.

## What completed

The `cad-dev-upload-session-0100z` synthetic upload-session development
qualification ran once on Convex development deployment `majestic-alligator-31`
during the accepted UTC window from `2026-09-16T01:00:00Z` through
`2026-09-16T01:15:00Z`.

The sanitized local receipt reports:

- `DEVELOPMENT_UPLOAD_SESSION_QUALIFICATION_EXECUTED`
- `retry: false`
- `secondRun: false`
- `cadUploadsDisabled: true`
- `bodyAdmissionAuthorized: false`
- `conversionAllowed: false`
- `privateCadUsed: false`
- `productionTouched: false`

The run stayed bound to the accepted `0100Z` upload-session evidence:

- projection `3f405f0eafa4e3834b99d9ee69547402a0690e79e705dacd13a764b8e4b7e640`
- acceptance receipt `d6a09751cece8326d6a242686ca310fa9b4a3abace455dcbd23e739b9223f930`
- private restricted register digest `a491d8ac48374942ecb2662b88e148cf4d42e45bac048cfdc92e50c3eb262dce`
- run key digest `de725ce29a1fd499836d47717c015517cfd36855b0b6622dc2e751ee2448d644`

The sanitized evidence hash is
`e5c7113e47d9d7bda63ea95cbf69577a9bedbc70d8f87d075b31353d8dbb4866`.
The sanitized run receipt hash is
`ff03025c824c928f962e88a67487aefd86c608d094032972f739064a0e5bb825`.

## Operation evidence

The reviewed upload-session runner executed the bounded development-only graph:

- `signIns`: 1
- `exactSessionReads`: 1
- `syntheticAuthorityProvisions`: 1
- `bridgeActions`: 1
- `uploadSessionInserts`: 1
- `uploadSessionReads`: 2
- `uploadSessionRevocations`: 1
- `syntheticAuthorityRevocations`: 1
- `signOuts`: 1

The bridge reported retained no-delete state while preserving disabled upload and
conversion gates:

- retained upload session: true
- synthetic authority provisioned: true
- synthetic authority revoked: true
- authority rows retained: true
- pre-revoke read accepted: true
- post-revoke raw read rejected: true
- Convex `users` ID observed: true
- Convex `authSessions` ID observed: true
- raw credential recorded: false
- raw password recorded: false

The local evidence and receipt are ignored by Git, directory mode is `700`, file
mode is `600`, and no obvious private path or secret-like pattern was observed
in the sanitized artifacts.

## Scheduler note

The original one-shot scheduler did not fire during the first post-window grace
check. To avoid a late duplicate execution, it was deleted before the manual
single-run fallback executed at `2026-09-16T01:02:32Z`.

No retry or second run was performed.

## What this does not prove

This closeout proves the reviewed development-only synthetic upload-session path
can sign in with a disposable synthetic session, observe real Convex `users` and
`authSessions` IDs, insert/read/revoke one synthetic upload session, revoke the
synthetic authority, retain no-delete evidence, and write sanitized evidence.

It does not prove user-facing CAD upload readiness.

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
node --test scripts/cad-dev-upload-session-successful-closeout.test.js
node scripts/cad-convex-source-audit.js
node scripts/cad-convex-contract-manifest.js
git diff --check
```

## Future approval phrases

Publication:

> I approve pushing only commit [full reviewed SHA] from codex/cad-upload-session-successful-closeout to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-only CAD development upload-session qualification closeout packet. No merge, deployment, live tests, production/development env or provider/auth/resource changes, secrets outside reviewed ignored restricted evidence artifacts, usage/billing changes, enrollment, email/SMS/Slack, store mutation, CAD upload activation, CAD conversion, private CAD, Sandbox dispatch, retry, second run, or branch/worktree cleanup.

Merge:

> I approve marking PR #[number] ready for review and merging it into main. Allow the normal Vercel production deployment from main. Preserve current production and development environment settings; do not configure provider/auth/resource settings, do not generate or store secrets, do not change usage or billing settings, do not enable CAD uploads, do not dispatch CAD conversion, do not run live tests, do not use private CAD, do not dispatch Sandbox work, do not retry the completed run, do not start a second run, do not send email/SMS/Slack, and do not cleanup the branch/worktree until production verification completes.
