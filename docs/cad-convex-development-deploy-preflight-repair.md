# CAD Convex development deployment preflight repair

Status: source-only and offline. No provider request, deployment, retry, function
run, environment-value read, retained rollback-worktree access, commit or push is
performed by this repair.

Current base binding: `0ba409d5843d4c65cbfcf3abea6f902396d2951f`.
Any later approved repair commit must equal the clean checkout `HEAD` and descend
from that exact base.

## Failure addressed

The consumed October 9 development deployment gate requested Convex-specific
typechecking, but this repository deliberately has no `convex/tsconfig.json`.
The attempt stopped during preparation and was rolled back. Its disposition is
bound by SHA-256
`d56fe330b73e176566d0b75be59b2492dc20fe27b841eac428183ce5938d8705`.

## Repair

`scripts/cad-convex-development-deploy-preflight.js` makes the existing reviewed
validation order executable:

1. Run the root TypeScript check.
2. Verify the checked-in Convex generated bindings against pinned local SDK
   templates.
3. Only under a separate fresh one-use approval, invoke `convex dev --once` with
   `--typecheck disable`, `--codegen disable` and `--tail-logs disable`.

The future provider step accepts no forwarded CLI arguments. It cannot add
`--run`, `--until-success`, `--start`, production `deploy`, log tailing or a
second attempt. It requires exact hashes for a private approval file, target env
file and rollback-readiness receipt. It binds the named development target,
approved source commit and stopped-attempt disposition, requires rollback ready
first, and creates the private consumed-attempt ledger before the provider
process starts. A nonzero or unknown outcome stays consumed and stops without
retry.

The wrapper hashes the approved env file but does not parse or print its values.
It also refuses to start if a root `.env.local` already exists and removes an
incidental `.env.local` created by the CLI without reading it.

## Privacy-safe occupancy classifier

The same wrapper defines a separately gated read-only occupancy classifier for
exactly these seven controlled-upload tables:

- `cadControlledUploadAttempts`
- `cadControlledUploadEvidence`
- `cadControlledUploadGrants`
- `cadControlledUploadHostPrincipals`
- `cadControlledUploadReceipts`
- `cadControlledUploadScopes`
- `cadControlledUploadSessionTombstones`

Each table is queried at most once with the official CLI, a one-row limit and
JSON-array output. Standard output and standard error remain in memory. The
classifier emits only the table name, `EMPTY`, `NONEMPTY` or `UNKNOWN`, and a
fixed sanitized diagnostic category. It never persists or prints row values,
provider errors or paths. It stops on the first `NONEMPTY` or `UNKNOWN` result,
performs no retry and accepts no table or CLI arguments from the caller. The
classifier is not run by offline validation and requires a separate exact
live-read approval.

Convex CLI `1.45.0` represents an empty table with exit code zero, empty stdout
and the exact stderr message `There are no documents in this table.`. The first
approved occupancy read was therefore classified `UNKNOWN` by the predecessor,
which rejected all stderr. The successor accepts only that exact sentinel as
`EMPTY`. Any other stderr remains fail-closed. Executable, argument,
target/auth, process-exit, stderr-presence, response-shape and JSON failures are
reduced to fixed diagnostic names before raw process output is discarded.

## Offline validation

```sh
node --test scripts/cad-convex-development-deploy-preflight.test.js
node scripts/cad-convex-development-deploy-preflight.js --preflight
git diff --check
```

This closes only the offline preflight mismatch. Any successor development
deployment requires a separate fresh approval packet and a new one-use gate. It
must not reuse the consumed October 9 authorization.
