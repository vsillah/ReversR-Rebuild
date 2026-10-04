# Durable synthetic-local adapter: Phase 7 review packet

This additive source implements a real SQLite protocol in temporary local storage. It is unmounted. It neither calls Google nor qualifies Google custody, independent administration, production admission, a provider budget, or a real upload. All production authorizers and provider constructors deny before inspecting their arguments. The predecessor pilot packet remains byte-identical at SHA-256 `d45658a48eaf882264ca1946103fbe0922d0e470abaaf228dde5130c06bc8a93`.

## Sole-operator testing policy

One human may run these synthetic local tests and hold all four ephemeral TEST keys. Writer, reader, recovery and custodian signatures have distinct keys and protocol roles. They demonstrate role verification and exact bindings, not independent custody. No external administrator is invented or required for these local tests. Operational risk acceptance, an admission exception, spending authority, host qualification, live readiness and body admission all remain false.

The current independent-custody admission gate remains unchanged. Moving beyond this source exercise requires either evidence of a genuinely different effective trust boundary or an explicit reviewed policy exception covering the sole-operator model. This packet supplies neither. Source-only tests do not grant five testers upload access, change commercial entitlements, renew a run, or authorize the proposed $25 pilot. No expenses were incurred.

## Concrete protocol

The Node 24 built-in `node:sqlite` API supplies `DatabaseSync`, `BEGIN IMMEDIATE`, full synchronous commits and a bounded lock timeout. There are no added packages. Official API reference: https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html .

Initialization derives one namespace from domain, pilot, epoch, run and session identity. Changing plans, deployments, roster or keys cannot initialize that identity again. Existing or partially created directories are refused; initialization never resets them. The only file is `state.sqlite` within a mode-0700, current-owner directory under the resolved OS temporary directory, with a fixed prefix and 32 hexadecimal identity suffix. Files must be regular, mode-0600, bounded, singly linked and not symlinks. Schema must match exactly. There is no caller-selected filesystem path or schema migration. The same OS Owner can still replace files; these checks are not an OS sandbox.

The signed envelope stores the complete policy, immutable origin, session, configuration digest, generation, full hash-linked history, reconstructed checkpoint, pilot/run counters, nonce history, command receipts, marker and quarantine state. Every reopen authenticates the envelope and reconstructs the kernel checkpoint. Malformed, altered or incomplete histories and counters reject. The fixed current-state comparison occurs inside the SQLite write transaction; two processes using one readback cannot both win.

A reader signs a fresh request bound to purpose, nonce, generation, head, policy digest, session, participant, command and reservation. The policy digest binds pilot, epoch, run, plan, deployment, origin and roster. A successful read commits its consumed slot before returning a custodian-signed readback. A writer or recovery command signs that exact readback and matching command. Changing purpose or using another role key rejects. Inputs use compact JSON round-trip encoding; duplicate keys, alternative number encodings and unknown properties reject. Readbacks are single-generation capabilities, with a maximum ten-second lifetime. The fixture uses five seconds. There are no trusted caller booleans standing in for signatures.

Reserve processing first atomically commits the exact kernel reservation, permanently spent run, complete counters/history, command receipt, adapter attempt tombstone and quarantine. A second transaction compares that complete state and commits one prospective marker at a new generation, consuming another IO slot. These are two separate transactions, not one multi-step atomic action. The marker is a database record only; there is no body handler or dispatch callback. Crash before the second commit leaves the full charged reservation spent and quarantined, with no marker and no permission to acknowledge, retry or create another marker. Exact unknown-close-revoke recovery remains available. Crash after it leaves exactly one marker. A response lost after commit returns no claim that quarantine was persisted; a later authenticated read can establish the actual state. Tests exercise restrictive recovery at all three crash boundaries.

Unknown outcomes remain restrictive. Once a kernel reservation exists, unknown, close and revoke require its exact participant and reservation, and the correct recovery signature. Close must precede revoke. They may run after forward expiry, but consume retained capacity and never refund or erase counters. A successful acknowledgement never clears the permanently spent run or adapter attempt.

## Accounting and time boundaries

Initialization records a conservative synthetic-local IO encumbrance: 128 protocol requests, 768 operations, 8 MiB metadata and zero provider micro-USD. A reserve must charge at least that allocation to the predecessor pilot/run ledger before its marker. Each successful read, command reservation or marker transition consumes a durable generation slot. Forward reads and commands stop at generation 16; exact restrictive reads/commands may use slots through 24. The tests exhaust ordinary reader traffic, then complete all six unknown-close-revoke read/command steps without refunding counters. Failed marker transactions retain the reservation slot, full kernel charges and encumbrance. Reconciliation reads are also charged.

These are conservative source protocol units, not a measurement or cap on filesystem syscalls, disk wear, arbitrary repeated rejected requests, OS resource use, or cloud billing. Pre-initialization filesystem setup is a local bootstrap prerequisite, not a prepaid cloud operation. Rejected/rolled-back reads can consume local IO without advancing a durable counter. A shared externally enforced admission/billing boundary is still required to make an all-in provider cost claim; this source does not make one. Unknown or unbounded provider accounting has no dispatch path here. No cloud billing was exercised.

The adapter uses local wall time plus per-call monotonic elapsed time, rejects wall regression against committed state, and rechecks freshness and forward expiry before each forward mutation and immediately before commit. Tests inject clock jumps through their private module loader, never through a runtime API. Local clocks and TEST keys remain under the sole Owner's control. Cross-machine trusted UTC, clock authenticity and a restore-surviving high-water mark remain unqualified.

Restoring an old signed readback against the current database rejects. Restoring the entire database and all relevant local state as the sole Owner can succeed: a regression explicitly demonstrates this boundary. Process-restart durability is not rollback resistance against the Owner. Changing the synthetic identity is another test fixture, not an authorized second operational run. Temporary test cleanup is only fixture disposal, never a production reset API.

## Review and later setup checklist

1. Captain reviews this source, packet hashes, test evidence and the residual local-Owner/IO/time limitations. Keep the existing Phase 7 admission gate closed.
2. Record an explicit sole-operator risk disposition or demonstrate the required effective trust separation. Name the scope and owner of that decision. A source test pass is insufficient.
3. Bind authenticated policy/origin and a restore-surviving fresh checkpoint to actual project resources, principals, issuer keys and resource generations. Reject old epochs and retired namespaces across restores.
4. Establish bounded provider IO and all-in cost accounting before any billed operation, including rejected reads, setup, reconciliation, retention and recovery. Resolve retained obligations after day 30. Approve any spending separately.
5. Qualify trusted time, durable cross-process CAS, independent role authentication, exact session/login/membership bindings and restrictive recovery on the actual host. Use synthetic metadata first; no private files or credentials in evidence.
6. Review a concrete executor and revocation-to-buffering protocol. Demonstrate no redispatch after unknown outcomes, process death or response loss. Only then seek the separately bounded admission decision and human QA.

No commit, push, PR, deployment, Google setup, credential change, service enablement, body admission, actual upload or provider effect is included. Phase 7 remains active. Historical rollback incompatibility (`SCHEMA_FORMAT_UNSUPPORTED`, `fixtureCompatible: false`) is unchanged.

## Validation commands

```
./node_modules/.bin/tsc -p scripts/tsconfig.cad-pilot-local.json
node --test scripts/cad-pilot-local.test.js scripts/cad-pilot-local-source-checker.test.js
node scripts/cad-pilot-local-source-checker.js
```

The adjacent packet pins the adapter, fixture, tests, TypeScript configuration, this document and all predecessor bindings. The read-only source guard uses built-ins only, rejects malformed arguments before filesystem access, pins the packet before following metadata, and never executes a local source module.

Predecessor regression command (110 tests):

```
node --test scripts/cad-pilot-control.test.js scripts/cad-pilot-control-source-checker.test.js scripts/cad-gcp-google-identity.test.js scripts/cad-gcp-google-identity-source-checker.test.js scripts/cad-gcp-custody-source.test.js scripts/cad-gcp-custody-source-checker.test.js scripts/cad-auth-controlled-upload-authority-continuity.test.js scripts/cad-auth-controlled-upload-durable-host-source.test.js scripts/cad-auth-controlled-upload-durable-host-integration-design.test.js scripts/cad-convex-execution-blockers.test.js scripts/cad-convex-rollback-compatibility.test.js
node scripts/cad-pilot-control-source-checker.js
node scripts/cad-gcp-google-identity-source-checker.js
node scripts/cad-gcp-custody-source-checker.js
node scripts/cad-auth-controlled-upload-durable-host-source-checker.js
node scripts/cad-auth-controlled-upload-authority-continuity-checker.js
node scripts/cad-auth-controlled-upload-durable-host-integration-design-checker.js
git diff --exit-code cdca94233bdb724cd9253ee93c14cf339830faa1
git diff --cached --exit-code
```

Local validation: 18 adapter tests plus four source-guard tests; 110 predecessor tests; TypeScript passes; seven source guards pass (six predecessor guards plus the new guard). No tracked-file diff or staged changes. Eight additive files remain uncommitted alongside the nine unchanged predecessor files. No browser/UI or live workflow smoke applies to this unmounted source adapter.
