# Controlled upload durable host: disabled source candidate

Phase 7 source implementation builds on local design commit `5535c2c4b52a0d9e6c483307e521f65e0a472148`. Production baseline remains `b4a310f84186697c8cb2d751c21bf79265969cad`; no production verification was performed here. Sundiata's branch is `codex/cad-auth-controlled-upload-durable-host-source-implementation` in worktree `c3b7/ReversR-Rebuild`.

`hostQualified=false`, `bodyAdmissionAuthorized=false`, `liveReady=false`, `costs=0`.

## Implemented source

- Seven additive Convex tables, exact design field/index inventory, and explicit internal argument/return validators. Existing table definitions remain intact.
- Pure deterministic binding/key/state validation and transition proposals. Every binding field, including private supply reference, supply receipt digest, session reference, production alias and deployment, participates in the binding digest. Permanent scope/run/session keys exclude rotating window/card/deployment hashes. Result encoding sorts object keys recursively; binding encoding uses the explicit design field order.
- One irreversible run and attempt, rollback duty before fence/consume, consumed/revoked tombstones, restrictive close/revoke/unknown transitions after expiry, safe-integer exhaustion checks, current authority-generation comparisons, strict extra/accessor/cycle rejection and sanitized failure results. A proposal carries no live read permit or durable receipt claim.
- Typed, unregistered store candidate with bounded `take(2)` singleton queries and duplicate rejection. State/tombstone/receipt writes share one mutation context and receipt-write errors throw to abort. Tests simulate that boundary; they do not establish provider transaction behavior. Receipt identity is application-owned. `commitOrdering` remains null; neither database ordering nor UTC expiry is fabricated.
- Five registered **internal-only handlers**, all unconditionally denied before context/input access. No public ingress, env switch, request knob, host credential parser, grant installation, evidence recording or server route wiring is enabled. Authentication, evidence, custody and stream-handoff verifier contracts always deny.

The store reads existing user, login, membership and upload-session rows. Existing login/upload tables lack independently verified generation and restore-continuity evidence. Their projection therefore sets `generationsComplete=false`; the store cannot produce a forward proposal. Model fixtures supply synthetic generations only. No timestamp is relabeled as a verified generation.

## Exact limitations

Independent authenticated transport, approved grant registration, baseline evidence installation, verifier custody, committed receipt readback, real smoke, trusted UTC and immediate revocation-to-stream handoff remain unimplemented/unqualified. A pure model cannot detect restoration of a consistent old snapshot; the custody verifier remains closed. All 25 design acceptance cases remain **live-unexecuted**, as recorded individually in the adjacent packet.

Clock regression and corrupt/duplicate data are denied by the model/store. Automatic durable stop persistence for those denials is not implemented: a failed store transaction aborts, and a pure proposal cannot persist a stop. Explicit `markUnknown` permanently stops an already claimed model run. The unchanged runtime terminal barrier, not these unqualified candidates, currently enforces no admission.

Registration stays deliberately denied. This turn adds its immutable schema/binding validation and fixed internal contract, but does not install a grant or initialize authority from caller assertions. A separately reviewed implementation must integrate independent approval/custody and atomic grant/scope registration before any host use. Recovery requires its own active principal; expired/revoked user authority never regrants an attempt.

The historical rollback baseline remains byte-identical. It had 10 tables (three CAD) before this work, while the starting schema already had 12 (five CAD). Current schema has 19 (twelve CAD). The extraction helper now includes the schema fragment so audits cannot hide the new tables. Current execution-blocker inventory is refreshed with null evidence rows; the historical rollback CLI still fails closed with `fixtureCompatible=false`. No cloud rollback compatibility is claimed. No codegen ran; generated bindings were not changed.

The adjacent inventory test also expected old disabled development-auth literals, although reviewed main already contains the later development qualification. Those stale assertions now pin the exact unchanged `developmentAuth.ts` and `auth.ts` SHA-256 values from `b4a310f`, alongside the production admission-denial assertions and existing route regressions. Neither auth source file nor any server source was changed. Historical packet and rollback baseline remain distinct from the current source inventory.

## Local validation

Use already installed dependencies only:

```sh
node node_modules/typescript/bin/tsc -p scripts/tsconfig.cad-controlled-host.json
node --test scripts/cad-auth-controlled-upload-durable-host-source.test.js
node scripts/cad-auth-controlled-upload-durable-host-source-checker.js
node scripts/cad-auth-controlled-upload-durable-host-integration-design-checker.js
node --test scripts/cad-auth-controlled-upload-durable-host-integration-design.test.js scripts/cad-convex-execution-blockers.test.js scripts/cad-convex-rollback-compatibility.test.js
node --test scripts/cad-auth-controlled-internal-upload-activation-implementation.test.js scripts/cad-auth-controlled-upload-observable-gate-wiring-repair.test.js scripts/cad-auth-controlled-upload-digest-drift-repair.test.js
node scripts/cad-convex-rollback-compatibility.js
git diff --check
```

The rollback CLI's nonzero result is the expected preserved historical-baseline gate, not a waived implementation failure. Tests assert that gate remains closed. The full application build/typecheck is outside this targeted source validation. The acceptance packet identifies synthetic coverage and unimplemented coverage explicitly; no scenario is labeled host-qualified.

Validation result: targeted TypeScript passed; 38 source/design/inventory/rollback tests passed, including 15 new source tests. All ten checker commands and 139 tests in the unchanged `Verify CAD production source installation remains closed` step of `.github/workflows/release-local-ci.yml` passed. The historical rollback command remains blocked with `SCHEMA_FORMAT_UNSUPPORTED`. All server files, both auth source files, generated bindings and the historical rollback baseline have no diff against the design commit. The fixed source reader rejects component symlinks and files over 1 MiB. Invalid CLI arguments and malformed packet metadata are rejected before source reads; filesystem failures produce only fixed diagnostics. Guard tests use synthetic filesystem substitutes.

## Scoped file inventory (18 files)

```text
convex/schema.ts
convex/cadControlledUploadSchema.ts
convex/cadControlledUploadStore.ts
convex/cadControlledUploadHost.ts
offline/cad-convex/controlledUploadHostModel.ts
offline/cad-convex/controlledUploadHostBridge.ts
offline/cad-convex/executionBlockers.json
scripts/helpers/cad-convex-schema-export.js
scripts/helpers/cad-controlled-upload-host-fixture.js
scripts/tsconfig.cad-controlled-host.json
scripts/cad-auth-controlled-upload-durable-host-source-checker.js
scripts/cad-auth-controlled-upload-durable-host-source.test.js
scripts/cad-auth-controlled-upload-durable-host-integration-design-checker.js
scripts/cad-convex-execution-blockers.test.js
scripts/cad-convex-rollback-compatibility.test.js
docs/cad-auth-controlled-upload-durable-host-source.md
docs/cad-auth-controlled-upload-durable-host-source.json
docs/cad-auth-controlled-upload-durable-host-integration-design.json
```

## Next boundary

Review this local source checkpoint and the unresolved controls above. A future bounded source phase should first define independent generation/continuity evidence and persistent denial recovery, then approved grant/baseline installation. Host access, principal configuration, independent provider qualification, costs, smoke, publication and activation require separate authority. Production admission stays hard-closed; no executable card or live-opening phrase is issued.
