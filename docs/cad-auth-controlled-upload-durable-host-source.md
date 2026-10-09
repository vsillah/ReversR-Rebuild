# Controlled upload durable host: internal-only source implementation

This bounded source implementation is based on merged main `f6394e563b30aaa678eae7bde3b4e0a329b00141`. The branch is `codex/igs-controlled-upload-durable-host`. No production verification was performed.

`hostQualified=false`, `bodyAdmissionAuthorized=false`, `liveReady=false`, `costs=0`.

## Implemented source

- Seven additive Convex tables, exact design field/index inventory, and explicit internal argument/return validators. Existing table definitions remain intact.
- Pure deterministic binding/key/state validation and transition proposals. Every binding field, including private supply reference, supply receipt digest, session reference, production alias and deployment, participates in the binding digest. Permanent scope/run/session keys exclude rotating window/card/deployment hashes. Result encoding sorts object keys recursively; binding encoding uses the explicit design field order.
- One irreversible run and attempt, rollback duty before fence/consume, consumed/revoked tombstones, restrictive close/revoke/unknown transitions after expiry, safe-integer exhaustion checks, current authority-generation comparisons, strict extra/accessor/cycle rejection and sanitized failure results. A proposal carries no live read permit or durable receipt claim.
- Typed store and continuity operations reached through seven registered **internal-only** handlers. All reads use IDs or declared indexes with bounded `take(2)` singleton checks. State/tombstone/receipt writes share one mutation context and receipt-write errors throw to abort. Tests simulate that boundary; they do not establish provider transaction behavior. Receipt identity is application-owned. `commitOrdering` remains null; neither database ordering nor UTC expiry is fabricated.
- Registration, authority projection, receipt verification and smoke verification remain denied by fixed independent-verifier contracts. Forward transactions remain denied because login/upload generation proof is unavailable. Restrictive recovery may only close, revoke and permanently stop an existing slot. No public host function, env switch, request knob, host credential parser, qualified grant installation, evidence recording or server route wiring is enabled.
- A source-only server adapter binds exact internal function references, performs zero automatic retries, strips non-allowlisted result fields and stops after an unknown mutation outcome. It is not imported by startup or any public route.

The store reads existing user, login, membership and upload-session rows. Existing login/upload tables lack independently verified generation and restore-continuity evidence. Their projection therefore sets `generationsComplete=false`; the store cannot produce a forward proposal. Model fixtures supply synthetic generations only. No timestamp is relabeled as a verified generation.

## Exact limitations

Independent authenticated transport, approved grant registration, baseline evidence installation, verifier custody, committed receipt readback, real smoke, trusted UTC and immediate revocation-to-stream handoff remain unimplemented/unqualified. A pure model cannot detect restoration of a consistent old snapshot; the custody verifier remains closed. All 25 design acceptance cases remain **live-unexecuted**, as recorded individually in the adjacent packet.

Clock regression and corrupt/duplicate data are denied by the model/store. Automatic durable stop persistence for those denials is not implemented: a failed store transaction aborts, and a pure proposal cannot persist a stop. Explicit `markUnknown` permanently stops an already claimed model run. The unchanged runtime terminal barrier, not these unqualified candidates, currently enforces no admission.

Registration stays deliberately denied. This turn adds its immutable schema/binding validation and fixed internal contract, but does not install a grant or initialize authority from caller assertions. A separately reviewed implementation must integrate independent approval/custody and atomic grant/scope registration before any host use. Recovery requires its own active principal; expired/revoked user authority never regrants an attempt.

The historical rollback baseline remains byte-identical. It had 10 tables (three CAD) before this work, while the starting schema already had 12 (five CAD). Current schema has 19 (twelve CAD). The extraction helper includes the schema fragment so audits cannot hide the controlled tables. No cloud rollback compatibility is claimed. The repository's offline-only code generator refreshed `convex/_generated/api.d.ts`; no provider or deployment command ran. The generated declaration now types the controlled-upload modules and the pre-existing `cadUploadSessionGateway` module. The gateway action and HTTP route already existed at the baseline, and no gateway, HTTP, runtime or application source changed.

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

Validation requires the offline codegen check, both focused Convex TypeScript configurations, full application typecheck, focused implementation tests, the existing CAD closure suite, `git diff --check`, and a privacy/credential-pattern scan. Live host, provider, upload, conversion and production smoke remain excluded.

## Scoped implementation additions

```text
convex/_generated/api.d.ts
convex/cadControlledUploadSchema.ts
convex/cadControlledUploadStore.ts
convex/cadControlledUploadContinuityStore.ts
convex/cadControlledUploadHost.ts
scripts/helpers/cad-controlled-upload-host-fixture.js
scripts/cad-auth-controlled-upload-durable-host-source.test.js
scripts/cad-auth-controlled-upload-durable-host-implementation.test.js
server/cadControlledUploadDurableHostAdapter.js
```

## Next boundary

Review this local source checkpoint and the unresolved controls above. A future bounded source phase should first define independent generation/continuity evidence and persistent denial recovery, then approved grant/baseline installation. Host access, principal configuration, independent provider qualification, costs, smoke, publication and activation require separate authority. Production admission stays hard-closed; no executable card or live-opening phrase is issued.
