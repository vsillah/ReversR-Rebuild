# Controlled-upload development qualification runner

Status: source-only and closed. This implementation does not authorize or run a
live function, admit request bodies, dispatch conversion, write CAD objects,
change provider configuration, or alter production behavior.

## Fixed binding

The internal qualification path is bound to:

- base source commit `6aa57afc24aac6769bad12aa06a7ed6855a83739`;
- stop receipt SHA-256
  `f1696dfb1bc24bef2bf41aaff1f5894527bd8bd89966d215301e1d4b261b8872`;
- development deployment `majestic-alligator-31` in project
  `reversr-cad-auth-dev` for team `vambah-sillah`;
- the public synthetic cube fixture
  `occt-import-js:testfiles/cube-10x10mm/Cube 10x10.igs`, SHA-256
  `5bc09d9b7a163ed8052af1fffebf953e000dc0d48cd7d700c064dacce1f2e7b3`;
- one run, one session, one attempt, zero retries, and a maximum fifteen-minute
  window.

The checked-in binding intentionally leaves the qualification commit, approval
digest, exact retained synthetic user/session ids, and UTC window null. A later
reviewed source rebind must install every value. There is no environment,
request, CLI, or caller-controlled enabling flag.

## Terminal transaction

`cadControlledUploadDevQualification:qualifyOnce` is an internal mutation with
an empty argument object. It verifies the automatic Convex cloud URL against the
fixed development URL, verifies the exact source binding, resolves only the
source-bound synthetic ids, and requires the bound login session to remain valid
strictly beyond the approval-window end. In one database transaction it creates:

1. one inactive qualification custodian;
2. one synthetic upload-session record already revoked and with CAD upload
   permission false;
3. one grant and scope permanently stopped as revoked;
4. one spent attempt with rollback armed, the admission fence never opened,
   no consumption, and terminal closed/revoked state;
5. one tombstone and one restrictive receipt.

Any collision stops before writes. A receipt-write failure aborts the whole
transaction. Replay, restart, and concurrent invocation converge on the same
durable spent scope and cannot create a second session or attempt.

The existing production verifier remains unchanged and permanently returns
`null`. The public upload route remains closed behind
`BODY_ADMISSION_AUTHORIZED = false`.

## One-use local runner

The runner accepts no CLI arguments. It reads only the fixed mode-`0600`
approval path, verifies its digest and exact target/source/fixture/window/limits,
checks the local qualification commit and ancestry, rejects staged or unstaged
tracked changes, and creates a local consumed attempt ledger before one fixed
Convex mutation invocation. Ignored `.local` approval and ledger artifacts do
not make the tracked source dirty. The ledger uses exclusive creation, complete
writes, file fsync, checked close, and parent-directory fsync. It is never
deleted or overwritten, including after partial or unknown outcomes. The
deployment and function references are constants.

If the mutation result is unknown, the runner performs exactly one fixed
read-only reconciliation query. It never retries the mutation. Both successful
and reconciliation CLI calls have the same fixed fifteen-second timeout. Both
successful and unknown results are reduced to a sanitized allowlist that excludes user ids,
login-session ids, credentials, body bytes, provider errors, and raw approval
content.

## Offline validation

```sh
node --test scripts/cad-controlled-upload-development-qualification.test.js
npx --no-install tsc -p scripts/tsconfig.cad-controlled-host.json --pretty false
npm run typecheck -- --pretty false
npm run cad:convex:codegen:check
```

The future approval/rebind, deployment, function invocation, and any later
admission or conversion work remain separate gates.
