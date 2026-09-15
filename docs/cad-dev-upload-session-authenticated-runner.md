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
  - signs in one fixed synthetic Password cohort identity;
  - reads the exact authenticated session through the new query;
  - calls the existing `cadDevUploadSessionQualification:issueReadRevoke`
    bridge once;
  - signs out;
  - writes sanitized local evidence and a local receipt.

The runner does not contain raw passwords, raw run keys, upload credentials,
private CAD, production URLs or provider secrets.

## Boundaries

- CAD uploads remain disabled.
- Body admission remains disabled.
- Conversion remains disabled.
- No private CAD is used.
- No production Convex deployment is touched.
- No real users are enrolled.
- No provider/resource/env/billing mutation is authorized by this packet.
- No retry or second run is authorized by this packet.

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
