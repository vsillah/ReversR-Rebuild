# Authority, continuity and restrictive recovery: source checkpoint

This Phase 7 source checkpoint builds on local commit `23b2c4bf8e404d9f20c86f4f4a39f76c8e82d539`, with local `origin/main` baseline `b4a310f84186697c8cb2d751c21bf79265969cad`. The current roadmap phase remains controlled internal upload activation; this completes only bounded source implementation, not host qualification or activation. The branch is `codex/cad-auth-controlled-upload-durable-host-source-implementation`, worktree `/Users/vambahsillah/.codex/worktrees/c3b7/ReversR-Rebuild`. No remote or production refresh was performed.

`hostQualified=false`, `bodyAdmissionAuthorized=false`, `liveReady=false`, `costs=0`.

## Implemented candidate

The authority contract compares a complete grant binding, exact user/login/membership/upload row identities, generations, approval binding, independent-subject separation, evidence lifetime, and external epoch/sequence/revision/time high-water metadata. The envelope now includes `requestNonceDigest`; the comparator validates its shape, and registration compares it against the captured request nonce before writes. Tests reject a different nonce under unchanged synthetic evidence. Separate canonical principal digests bind the complete approved writer and custodian projections: key, issuer, audience, subject, resource, role, generation, policy, expiry and active state. Recomputing a replacement principal key cannot satisfy unchanged evidence. These digests provide comparison only. Equality returns **metadata match, provenance unavailable**. A self-hash and a consistent restored snapshot cannot establish provenance. Both new independent verifiers always return null without inspecting arguments. The nominal TypeScript capability has no production constructor; its type does not authenticate anything.

Current authority observation uses an explicit allowlist: account ID only; user-authority ID/user/enabled/generation; membership ID/user/shop/active/upload-permission/generation; login ID/user/expiry; upload ID/user/login/shop/session/credential digest/expiry/linked generations/permission/status. Unknown private fields and getters are never projected or hashed. Principal expiry and generation must be safe integers and its resource must match. The authenticated projection candidate requires the writer role; registration requires a grant custodian. Both return before any database access while the verifier is absent.

The unregistered restrictive transaction candidate writes a permanent stop, closes and revokes the attempt, reserves run/session identity, and inserts a receipt in one transaction context. A returned denial permits the stop to commit. A receipt/write failure throws a fixed error so the candidate transaction aborts. Synthetic transaction rollback tests exercise both outcomes; they do not prove provider atomicity.

Restrictions preserve factual `attemptSpent`, `rollbackArmed`, `fenceOpenedOnce`, `consumed`, known generations and the original stop reason. Newly filled missing attempts record those forward-history flags as false. Their zero generation placeholders mean unavailable and can never regrant authority. Only closed/revoked/unknown restrictions are added. An already-open corrupt fence can be closed when grant/scope/attempt identity and forward history are otherwise trustworthy. Ambiguous identity, duplicate rows, unsafe revision, conflicting receipts, or irreconcilable forward history return unresolved or abort without claiming a persisted stop. Those cases need an independent persistent quarantine mechanism.

The stop receipt's existing `evaluatedAtMs` field retains the stored high-water value. It is **not invocation time or evidence of a fresh trusted clock check**. Missing or regressed clock observations never advance it. This candidate cannot create a trusted clock from caller time, a zero value, or an existing timestamp. Cleanup remains restrictive after grant/user expiry or revocation and does not modify any Auth or upload-session row.

The registration candidate atomically inserts grant, scope, attempt, permanent session tombstone and reservation receipt, with fences closed. Registration includes irreversible run reservation; the later old `claimRun` operation therefore rejects that slot. This prevents two initial registrations from reserving the same session before first use. The receipt records `claimRun` reservation as `committed-restrictive`; it is not independent committed-readback evidence. No grant can be installed through the actual source because the registration verifier always returns null.

Existing schema lacks a scope/session index for legacy unspent registrations. To preserve all seven tables and the historical checkpoint, registration conservatively rejects **any existing scope or grant**, using indexed `take(2)` probes. Exact scope/run/grant/session/attempt/tombstone checks also reject collisions, duplicates and corruption. This intentionally prevents a second registration even for unrelated scope metadata. Generalizing that restriction requires a separately reviewed migration/index and continuity proof. An empty database remains insufficient: independent approval and external continuity verification are required before collision checks are reached.

Only the synthetic test loader substitutes the missing verifier module. Production has no injectable verifier, enabling switch, cast-based constructor, caller `verified` flag, public handler or new ingress. The five predecessor registered handlers and all predecessor bridge functions remain byte-identical and unconditionally disabled.

## Exact scope: eight new files

```text
offline/cad-convex/controlledUploadAuthorityContinuity.ts
convex/cadControlledUploadContinuityStore.ts
scripts/tsconfig.cad-controlled-continuity.json
scripts/helpers/cad-controlled-continuity-fixture.js
scripts/cad-auth-controlled-upload-authority-continuity.test.js
scripts/cad-auth-controlled-upload-authority-continuity-checker.js
docs/cad-auth-controlled-upload-authority-continuity.md
docs/cad-auth-controlled-upload-authority-continuity.json
```

All previously tracked files are preserved. The predecessor packet remains pinned to SHA-256 `7e3d60ad3d1160fdc7fe1a02eb8271c3f5c7197ebbea0f1dd767f69946e3ad4a`; the new checker compares its immutable source bindings against a literal fixed inventory. It imports no local source modules and never executes the predecessor checker. No schema, generated binding, populated Auth table, package, workflow, env example, server/API route or historical rollback baseline changes are needed.

## Validation commands

```sh
node node_modules/typescript/bin/tsc -p scripts/tsconfig.cad-controlled-continuity.json
node node_modules/typescript/bin/tsc -p scripts/tsconfig.cad-controlled-host.json
node --test scripts/cad-auth-controlled-upload-authority-continuity.test.js
node scripts/cad-auth-controlled-upload-authority-continuity-checker.js
node scripts/cad-auth-controlled-upload-durable-host-source-checker.js
node scripts/cad-auth-controlled-upload-durable-host-integration-design-checker.js
node --test scripts/cad-auth-controlled-upload-durable-host-source.test.js scripts/cad-auth-controlled-upload-durable-host-integration-design.test.js scripts/cad-convex-execution-blockers.test.js scripts/cad-convex-rollback-compatibility.test.js
node scripts/cad-convex-rollback-compatibility.js
git diff --check
git diff 23b2c4bf8e404d9f20c86f4f4a39f76c8e82d539 --stat
git diff b4a310f84186697c8cb2d751c21bf79265969cad -- server api convex/auth.ts convex/developmentAuth.ts convex/http.ts convex/auth.config.ts convex/_generated package.json package-lock.json vercel.json .github/workflows offline/cad-convex/rollbackBaseline.json
```

Also execute every literal `node` command in the unchanged workflow step `Verify CAD production source installation remains closed` in `.github/workflows/release-local-ci.yml`: ten source checkers and 139 tests. This is the requested CAD source-installation CI-equivalent step, not the full app build or provider workflow. The historical rollback CLI must remain nonzero with `SCHEMA_FORMAT_UNSUPPORTED`, `fixtureCompatible=false` and `liveReady=false`; its negative assertions remain tested.

Validation results: both targeted TypeScript configurations passed. Eighteen new tests, 38 predecessor source/design/inventory/rollback tests, and 139 CAD closure regression tests passed (195 total). The new checker, both predecessor checkers, and all ten workflow closure checkers passed. All previously tracked files have no diff against the predecessor checkpoint. Protected paths also have no diff against the required main baseline. The expected historical rollback denial remains unchanged. No full application build, live host validation or production smoke was performed.

## Remaining boundary

All 25 live host acceptance cases remain unexecuted. Independent authenticated transport/custody, non-rollbackable external anchors, actual login/upload generations, trusted time, immediate revocation handoff, baseline smoke, independent receipt readback, retention/recovery scheduling, provider/OCC/crash behavior and historical rollback compatibility remain unqualified. There is no automatic runtime stop hook: these are unregistered source candidates. Ambiguous corruption or database failure still needs an independently persisted quarantine/stop mechanism before any host use.

This checkpoint completes the safely testable local contracts, restrictive persistence, and closed registration candidate. Next is captain source review of these limits. It authorizes no private evidence access, credentials, sessions, real grant, provider calls, activation, body reads, conversion, Sandbox, publication, deployment or smoke.
