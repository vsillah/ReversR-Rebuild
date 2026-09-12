# CAD Convex gateway/session adapter review

Local review slice based on merged PR #174, commit
`4022000ae2212af9341a9453c3f655cf0ff79522`.
Branch: `codex/cad-convex-gateway-schema`.
Worktree: `/Users/vambahsillah/Documents/ReversR-Workspace/ReversR-Rebuild.worktrees/cad-convex-gateway-schema`.

## Implemented delta

PR #174 already supplied the backend transaction contract, schema/function templates,
strict validators and generation behavior. This slice reuses those artifacts.

- `offline/cad-convex/sessionAdapter.js` binds one privileged request context and shop
  to the existing digest-only store and session service. Every operation runs service
  authentication and exact-login verification anew. Issuance accepts only a shop
  selector; caller identity fields deny. Refresh independently checks the upload
  binding, and a verified context for another shop cannot substitute. Context is
  opaque and never serialized, stored or logged by this adapter. The host owns its
  immutable per-request lifecycle; sharing mutable contexts between requests is unsafe.
- The same module supplies a fixed five-operation query/mutation dispatcher. Only
  reviewed injected references are usable; policy mutation is absent. Args/results
  pass strict contract validators; cancellation and errors remain fail-closed.
- Manifest v2 records the function name/kind mapping, schema template, internal-only
  policy function and checksums for the complete packet. These are candidate names,
  not deployed functions or generated SDK references.
- `offline/cad-convex/admissionHarness.js` is a separate, explicit test-only Express
  route candidate. It shares the real verifier, accepts injected synthetic controls,
  validator and dispatcher, and checks disabled/control gates before body reads.
  It caps streamed JSON, rejects unsupported encodings/types, rechecks authority
  before synthetic dispatch and retains a reservation after uncertain dispatch.
- The existing serialized snapshot fixture moved to `scripts/helpers` for reuse.
  No backend semantics were changed by that extraction.

The default service, production user router, operator router, capabilities, package
files and environment selection are unchanged. Neither new module is imported by
production code. Both adapter and admission harness require literal `testOnly: true`;
only the separate harness accepts literal `uploadsEnabled: true`. These markers are
explicit injection safeguards, not authentication or a future production gate.

## Evidence boundaries

Actual `/api/cad/user-import` loopback tests use the new adapter and existing router:
missing credentials, expired uploads, expired/missing library sessions and revoked
uploads deny before any request body access. Valid authority returns
`USER_UPLOADS_DISABLED` before parsing. Sentinel body getters/listeners fail a test
if touched. The unchanged operator tests verify isolation and zero conversion calls.

The enabled-only harness validates a tiny synthetic fixture marker. It processes no
CAD file or private material and calls only a synthetic acknowledgement function.
It tests control availability/denial, malformed/oversized JSON, unsupported MIME,
validation rejection, pre-dispatch revocation, success and unknown dispatch outcome.
This is admission-order evidence, not complete IGES MIME/name/base64 validation,
real quota/budget enforcement, cancellation qualification or executor cleanup proof.
Cleanup callback failures are suppressed without diagnostic egress; production must
add durable reconciliation before any future activation. CORS/preflight remain
covered on the real disabled router, not implemented by this candidate harness.

Generation and race tests remain serialized simulation evidence: concurrent duplicate
insertion, logout before issuance, revoke between read/refresh, deny/regrant, duplicate
indexes and deadline rollback. They do not prove Convex OCC or live persistence.
A fresh pre-dispatch lookup still has a race with external revocation after that lookup.

## Validation

Run at the worktree root, reusing the sibling's existing dependencies read-only:

```sh
NODE_PATH=/Users/vambahsillah/Documents/ReversR-Workspace/ReversR-Rebuild.worktrees/cad-auth-store-migration-adapter/node_modules node --test scripts/cad-convex-*.test.js scripts/cad-provider-store-contract.test.js scripts/cad-upload-session*.test.js scripts/cad-user-upload-route.test.js
node scripts/cad-convex-contract-manifest.js
node --check offline/cad-convex/sessionAdapter.js
node --check offline/cad-convex/admissionHarness.js
node --check scripts/helpers/cad-convex-fixture.js
node --check scripts/cad-convex-gateway-schema.test.js
node --check scripts/cad-convex-backend-contract.test.js
node --check scripts/cad-convex-contract-manifest.js
git diff --check
```

Validation result: **58/58 focused tests passed** on 2026-09-12.

No dependencies were installed. No TypeScript source or generated bindings were added;
no Convex compile, push, typecheck, UI walkthrough or live production proof is claimed.
The schema remains a review template pending provider decisions. A changed-file
scan checks credential/private-CAD patterns without printing matched content; tests
also reject secret-bearing returns and prove raw generated credentials never enter
the gateway payloads or stored rows.

## Remaining gates and captain handoff

Select pinned Convex SDK/Auth versions and beta acceptance, exact provider and library
session liveness, service authentication/replay/body envelope, membership owner,
retention and restoration policy. Then assemble actual functions and generated types
and run a real offline Convex harness. Live OCC, upstream revoke timing, acknowledgement
and deadline/commit semantics still need qualification. Abort is not remote rollback.
The existing service's cancellation-before-commit condition remains unresolved.

No resources, auth settings, provider configuration, environment changes, deploys,
Supabase operations, CAD conversion, private inputs or costs are part of this phase.
Uploads remain disabled. Captain reviews this packet next; publication is a separate
approval, followed by later provider/deployment/activation gates.

Before publication, captain fills the local commit SHA and verifies the manifest:

“Approve pushing only commit [full reviewed SHA] from codex/cad-convex-gateway-schema
 to vsillah/ReversR-Rebuild and opening a draft PR against main for the offline CAD
 Convex gateway/session adapter and synthetic admission packet. No merge, deployment,
 provider or auth configuration, environment change, Supabase mutation, private CAD,
 conversion or user-upload activation.”
