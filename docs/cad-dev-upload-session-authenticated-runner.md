# CAD development upload-session authenticated runner

Branch: `codex/cad-dev-upload-session-authenticated-runner`.
Status: source-only repair for the development upload-session qualification path.
No live run is authorized by this packet.

## Reason

The PR #249 upload-session bridge deployed successfully, but the accepted private
upload-session register contains source-safe synthetic identity placeholders and no
current `authSessions` ID. The deployed bridge correctly requires real Convex
`users` and `authSessions` IDs before it writes a `cadUploadSessions` row.

Read-only development inventory confirmed the retained synthetic Password cohort
has one `users` row and one `authAccounts` row per slot, but zero active
`authSessions` rows after the completed Auth/session qualification cleanup. A live
upload-session mutation with placeholder IDs would fail argument validation or
write unreviewed state, so the run must stop until the exact authenticated session
is sourced through a reviewed path.

## Source Repair

This packet adds:

- `convex/cadDevUploadSessionQualificationSession.ts`
  - a public authenticated query for the current development session;
  - bound to the accepted upload-session digest tuple and UTC window;
  - reads only the server-verified Convex Auth session via
    `getAuthSessionId(ctx)` and `readExactLibrarySession`;
  - rejects stale windows, mismatched digests and unsafe deadlines.
- `scripts/cad-dev-upload-session-qualification-live-runner.js`
  - an inert local operator runner;
  - validates ignored private registers with mode `600`;
  - derives the accepted projection and receipt digests from the adjacent
    mode-locked local artifact files instead of mutating the private register;
  - signs in one fixed synthetic Password cohort identity;
  - reads the exact authenticated session through the new query;
  - calls the reviewed
    `cadDevUploadSessionQualification:issueReadRevokeWithSyntheticAuthority`
    wrapper once;
  - lets that wrapper provision only the run-owned synthetic
    `cadUserAuthority` and `cadMemberships` rows needed for the transactional
    insert path;
  - revokes those synthetic authority rows in a `finally` path without deletion;
  - signs out;
  - writes sanitized local evidence and a local receipt.

The runner does not contain raw passwords, raw run keys, upload credentials,
private CAD, production URLs or provider secrets.

The accepted upload-session private register intentionally does not duplicate
`acceptedProjectionSha256` or `acceptanceReceiptSha256`; those are custody fields
for `source-safe-rebind-projection.json` and
`rebind-acceptance-receipt.json`. The runner preserves the register digest by
hashing those adjacent accepted files at execution time.

## Boundaries

- CAD uploads remain disabled.
- Body admission remains disabled.
- Conversion remains disabled.
- No private CAD is used.
- No production Convex deployment is touched.
- No real users are enrolled.
- No provider/resource/env/billing mutation is authorized by this packet.
- No retry or second run is authorized by this packet.

## 2026-09-15T21:30Z Attempt Closeout

The first approved upload-session qualification attempt stopped fail-closed at
`AUTH_UNAVAILABLE` from `internal.cad.insertIfAbsent`. Source inspection showed
the signed-in synthetic Password user had an exact Auth session, but the CAD store
authority path requires existing `cadUserAuthority` and `cadMemberships` rows for
the same user/shop before an upload session can be inserted. No sanitized
evidence file was written by the failed runner, and no retry is authorized by
that attempt.

This repair keeps the public bridge digest-bound and disabled from body
admission, while adding an explicit development-only authority wrapper for the
next reviewed run window.

## Validation

```sh
node --test scripts/cad-dev-upload-session-qualification-live-runner.test.js scripts/cad-dev-upload-session-qualification-bridge.test.js scripts/cad-dev-upload-session-qualification-rebind.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
npm run cad:convex:codegen:check
npm run typecheck
git diff --check
```

## Next

After this source repair merges and production fail-closed smoke passes, the
autopilot should prepare a fresh accepted upload-session qualification window and
source rebind. Only then may a single development-only upload-session
qualification run execute against `majestic-alligator-31`.
