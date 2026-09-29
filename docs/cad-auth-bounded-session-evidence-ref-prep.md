# Bounded-session and evidence reference preparation

Roadmap: 5/6 complete. Step 6 source preparation is complete for this bounded inspection; live-opening readiness remains blocked.

The parent rejection packet matches approved SHA-256 `0c36065f91fe722f5079052a10155dec3462449ea3bd1214d105599daff1bcc6` at PR #447 merge `07c45369b6c95f594995bb85875636cc8c51f383`. The captain supplied deployment `dpl_EMhat5M6tCGRrbsK81oS7FHDMxix`, target https://reversr-i0ypw7nkp-vsillahs-projects.vercel.app, and 401 USER_SESSION_REQUIRED smoke observed 2026-09-29T19:41:22Z. This lane made no live request and does not independently attest freshness.

## Findings and boundary

The companion JSON records deterministic candidates using tracked file paths, exact byte hashes, JSON pointers and values. The existing bounded-session reference is an opaque designation. The source installation manifest uses an explicitly pending session ID. Historical source records contain three different evidence digests and do not establish which corresponds to an exact existing session under this approved target. They remain candidates; no runtime evidence was read or collected.

The unchanged adapter schema requires earlier deployment `dpl_9mMogp9HjVEtdvH8Eoc3hVMrj4St` and source commit `c9bdc2929f3d6b67439db42fb1a7511f9b42f641`. That is a binding mismatch, not proof that the captain's supplied deployment is stale. This preparation does not silently rebind the schema. The parent packet, runtime code and installation stay unchanged.

The approved non-secret attestation is unresolved. This manifest's own hash identifies these findings; it cannot serve as proof of live evidence or become the approved source-record digest by self-reference. `resolvedBinding` and `nextApprovalPhrase` remain null. No later supply/review approval phrase is issued.

All prohibited effects remain unauthorized: private evidence/secret reads; provider, environment, resource or billing changes; session issuance; upload activation; body admission/read; conversion; Sandbox dispatch; private CAD; live evidence collection; runtime installation/activation; executable command cards; external messages; live retry; second run; commercialization or readiness claims.

## Safe handoff

1. Captain reviews the companion manifest's candidate pointers and the old/new deployment mismatch.
2. If an already approved non-secret source record exists, designate its repository path and source approval provenance. It must attest the exact existing session ID, durable-evidence digest, immutable deployment and required provenance fields listed in the manifest. Do not create a session, open private evidence or query a provider to fill this gap within this gate.
3. A separately scoped source review must resolve authenticity and the schema rebind. If no approved record exists, leave the runtime boundary unresolved and report that disposition; repeating a generic approval cannot supply missing facts.
4. Only after those inputs are resolved may a later gate formulate a fully bound approval phrase. Production freshness/smoke belongs to the captain's separately authorized gate.

Local validation uses Node built-ins. The checker reads only its fixed tracked-source allowlist, pins upstream bytes, and checks exact manifest equality. `--write` generates this source manifest only. Success means the stopped reference preparation is internally consistent, not that runtime inputs are resolved.

```
node --test scripts/cad-auth-bounded-session-evidence-ref-prep.test.js scripts/cad-auth-durable-adapter-rejection-prep.test.js
node scripts/cad-auth-bounded-session-evidence-ref-prep-checker.js
node scripts/cad-auth-durable-adapter-rejection-prep-checker.js
node scripts/cad-auth-production-binding-source-install-checker.js
git diff --check
```

Traceability: task `01a0eeb4-c566-7702-bef6-9e1c343da498`; branch `codex/cad-auth-bounded-session-evidence-ref-prep`. Only this document, its JSON manifest, checker and tests belong to the change. No live smoke or deployment was performed by this lane.
