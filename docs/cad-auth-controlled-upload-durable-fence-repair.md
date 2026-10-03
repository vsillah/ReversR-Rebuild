# CAD controlled upload durable fence corrective repair

Phase 7: local source safety repair; runtime remains blocked.

Base: `5f5a8e42a09503c02f68fb3880c2c807365b338e`. Branch: `codex/cad-auth-controlled-upload-durable-fence-repair`.
The delegated stop at `2026-10-03T11:03:13Z` occurred before credential read or credentialed upload. Supplied disposition SHA-256: `b7ce7caf8341ed7078cfba8c9b03b95c503d7b8c651bdbbbc500e256131292c8`. This is task-provided provenance; the ignored private disposition was not opened or independently verified.

## Findings and repair

The startup path `server/index.js` → `cadControlledUploadDigestDriftRepair.js` → `cadControlledUploadObservableGateWiringRepair.js` constructed process-local Sets and labeled their mutation receipts durable and atomically expiry-checked. Fence closure left state intact. Post-rollback smoke returned a fixed 401 receipt without executing a request. These were unsafe claims, not durable proof.

The adapter is removed. Its resolver returns null. The startup mount is disabled and returns `CONTROLLED_UPLOAD_REVIEWED_DURABLE_HOST_REQUIRED` for admission, body read and cleanup. It cannot invoke a supplied adapter, metadata reader, ledger or base runtime. The composition layer treats this as a terminal block, including direct body-gate calls, so a legacy gate cannot bypass it. There is no environment switch or caller-provided capability flag to enable this path.

Source review still checks exact deployment, session, cohort, command-card, installation and opening-window bindings. Matching digests cannot open admission. Existing IGES-only validation, request limits, one-attempt/no-retry protocol and sanitized response contracts remain intact. Fake receipts exist only in explicitly synthetic local test fixtures and establish protocol behavior only.

## Required host capability

A later source change must bind an independently reviewed, source-owned host that supplies all of the following:

1. Shared durable transactions across independent workers and restarts. Run/attempt uniqueness and replay tombstones must survive rollback, restart and a changed local clock. A local file, Map or Set is insufficient.
2. Host-side authority and expiry enforcement in the same transaction as every forward mutation, using a trusted host clock with inclusive start and exclusive expiry. Bind session, cohort, deployment, card, installation, principal and route exactly. Expired, revoked or unknown authority must deny before any body read.
3. Atomic consume-before-read, at most one session and attempt, zero retries, rollback armed first, plus durable fence closure and session/late-grant revocation that remain available after expiry. Cleanup must not reopen a spent attempt. A crash between opening and cleanup must leave durable recovery obligations and fail closed.
4. Independent receipt verification tied to committed transaction identity and current authority, rather than accepting self-asserted `durable` or `expiryCheckedAtomically` flags.
5. A real independent verifier that executes and verifies the closed baseline and post-rollback fail-closed smoke, checks durable closure/revocation, and returns sanitized bound evidence. Unknown or failed cleanup/smoke must prevent success headers and stop without retry.

`offline/cad-convex/durableEngineAdapter.js` requires reviewed function references, host `runQuery`, host `runMutation`, and an independent evidence verifier. It contains no configured provider. Its interface alone does not implement or qualify these upload-specific controls. No credentials or provider setup are requested for this repair; source remains closed until separately authorized host work exists.

## Local validation and limits

Synthetic tests cover two independent mounts with separate ledgers, absent dependencies, forged capability/receipt inputs, terminal legacy-gate denial, no body-stream subscription and no observable proof headers on denial, malformed forward receipts, and thrown/forged close, revoke and smoke results. Generic runner tests model protocol behavior; they are not live durability or smoke qualification.

Commands (using the already installed local dependencies through `NODE_PATH`):

```sh
node --test scripts/cad-auth-controlled-internal-upload-activation-implementation.test.js scripts/cad-auth-controlled-internal-upload-activation-decision.test.js scripts/cad-auth-controlled-upload-observable-gate-wiring-repair.test.js scripts/cad-auth-controlled-upload-digest-drift-repair.test.js
node scripts/cad-auth-controlled-internal-upload-activation-implementation-checker.js
node scripts/cad-auth-controlled-upload-observable-gate-wiring-repair-checker.js
node scripts/cad-auth-controlled-upload-digest-drift-repair-checker.js
git diff --check
```

No private evidence/credential reads, provider calls/configuration, production requests, session issuance, activation, conversion, Sandbox, external messages, command-card issuance, retry, public push, PR, merge or deployment are part of this repair. Existing production behavior has not been changed or verified by this local commit. Review source changes next; live runtime qualification remains blocked by the missing host.

## Validation result and affected files

139 synthetic/local regression tests passed across all test commands in the existing CI section “Verify CAD production source installation remains closed”. All ten checkers in that section passed after refreshing the affected source bindings; the execution-gap checker also passed. Initial failures were missing local dependencies and stale packet hashes; no failing test was waived. JavaScript syntax and diff-whitespace checks passed. Full app build/typecheck and live workflow/customer-data smoke were not run for this server-only repair.

Additional exact regression commands run:

```sh
node scripts/cad-auth-credential-closure-binding-repair-checker.js
node scripts/cad-auth-credential-metadata-source-repair-checker.js
node scripts/cad-auth-live-gate-credential-closure-checker.js
node scripts/cad-auth-deployed-runtime-supply-path-closure-checker.js
node scripts/cad-auth-startup-live-gate-source-install-closure-checker.js
node scripts/cad-auth-production-session-credential-acceptance-repair-checker.js
node scripts/cad-auth-controlled-internal-upload-activation-implementation-checker.js
node scripts/cad-auth-controlled-upload-observable-gate-wiring-repair-checker.js
node scripts/cad-auth-controlled-upload-digest-drift-repair-checker.js
node --test scripts/cad-auth-credential-metadata-source-repair.test.js scripts/cad-auth-credential-closure-binding-repair.test.js scripts/cad-auth-live-gate-credential-closure.test.js
node --test scripts/cad-auth-deployed-runtime-supply-path-closure.test.js scripts/cad-auth-startup-live-gate-source-install-closure.test.js
node --test scripts/cad-auth-production-session-credential-acceptance-repair.test.js scripts/cad-upload-session.test.js
node --test scripts/cad-auth-controlled-internal-upload-activation-implementation.test.js scripts/cad-auth-controlled-internal-upload-activation-decision.test.js
node --test scripts/cad-auth-controlled-upload-observable-gate-wiring-repair.test.js
node --test scripts/cad-auth-controlled-upload-digest-drift-repair.test.js
node scripts/cad-auth-production-binding-source-install-checker.js
node --test scripts/cad-auth-production-binding-source-install.test.js scripts/cad-auth-production-execution-binding-finalization.test.js scripts/cad-auth-live-opening-execution-gap-closure.test.js scripts/cad-auth-live-opening-executable-runtime-wiring.test.js scripts/cad-auth-final-live-opening-rebind-prep.test.js
```

The dependency lookup used `NODE_PATH=/Users/vambahsillah/Documents/ReversR-Workspace/ReversR-Rebuild/node_modules`; no dependency installation or provider configuration was performed.

- `docs/cad-auth-controlled-internal-upload-activation-implementation.json`
- `docs/cad-auth-controlled-upload-digest-drift-repair.json`
- `docs/cad-auth-controlled-upload-digest-drift-repair.md`
- `docs/cad-auth-controlled-upload-durable-fence-repair.md`
- `docs/cad-auth-controlled-upload-observable-gate-wiring-repair.json`
- `docs/cad-auth-controlled-upload-observable-gate-wiring-repair.md`
- `docs/cad-auth-credential-closure-binding-repair.json`
- `docs/cad-auth-credential-metadata-source-repair.json`
- `docs/cad-auth-live-gate-credential-closure.json`
- `docs/cad-auth-live-opening-execution-gap-closure.json`
- `docs/cad-auth-production-binding-source-install.json`
- `docs/cad-auth-startup-live-gate-source-install-closure.json`
- `scripts/cad-auth-controlled-internal-upload-activation-implementation.test.js`
- `scripts/cad-auth-controlled-upload-digest-drift-repair-checker.js`
- `scripts/cad-auth-controlled-upload-digest-drift-repair.test.js`
- `scripts/cad-auth-controlled-upload-observable-gate-wiring-repair-checker.js`
- `scripts/cad-auth-controlled-upload-observable-gate-wiring-repair.test.js`
- `scripts/cad-auth-credential-closure-binding-repair-checker.js`
- `scripts/cad-auth-credential-metadata-source-repair-checker.js`
- `scripts/cad-auth-live-gate-credential-closure-checker.js`
- `scripts/cad-auth-live-opening-execution-gap-closure-checker.js`
- `scripts/cad-auth-production-binding-source-install-checker.js`
- `scripts/cad-auth-startup-live-gate-source-install-closure-checker.js`
- `server/cadControlledUploadDigestDriftRepair.js`
- `server/cadControlledUploadObservableGateWiringRepair.js`
- `server/cadProductionExecutableRuntimeMountCompletion.js`
