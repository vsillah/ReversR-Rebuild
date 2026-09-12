# Convex store adapter review packet

Status: local-only review slice; no push, PR, merge, deployment or external writes.
Worktree: `/Users/vambahsillah/Documents/ReversR-Workspace/ReversR-Rebuild.worktrees/cad-convex-store-adapter`.
Branch: `codex/cad-convex-store-adapter`; base: `7c37ba0ea8befdcd16b359ef553372c898810b90`.

## Changes

- `server/convexUploadSessionStore.js`: explicit injected transport port, digest-only
  payloads, validated v2 projection, 800 ms bounded waiting, strict acknowledgements,
  safe errors and no automatic retry/cache. Not a durable backend implementation.
- `scripts/cad-convex-store.test.js`: offline port and service integration tests.
- `docs/cad-convex-store-design.md`: preferred Convex architecture, library auth
  evaluation, generation-based revocation, transaction/index contract and gaps.
- `docs/cad-provider-decision-packet.md`, `docs/cad-provider-setup-checklist.md`,
  `docs/cad-provider-store-design.md`: prominently marked historical alternatives.
- `docs/cad-upload-session-foundation.md`: current Convex follow-up pointer.
- This review packet: validation and separate future resource/configuration gates.

No package additions or network installs are needed for this dependency-free port.
No deployable `convex/` files were added; see the design's rationale. The existing
service/router and SQL remain unchanged. The Supabase migration branch was not
modified or merged. Existing installed dependencies from that worktree were used
read-only through NODE_PATH for Express/CORS route tests; none of its code is loaded.

## Validation receipt

Validated 2026-09-12: **39/39 targeted tests passed** across the commands below.
The first command passed 33 non-route tests; six route tests initially failed solely
with sandbox `listen EPERM 127.0.0.1`. The second command reran those six with approved
loopback access and passed 6/6. No application assertion failed.

```sh
NODE_PATH=/Users/vambahsillah/Documents/ReversR-Workspace/ReversR-Rebuild.worktrees/cad-auth-store-migration-adapter/node_modules node --test scripts/cad-convex-store.test.js scripts/cad-provider-store-contract.test.js scripts/cad-upload-session-store.test.js scripts/cad-upload-session.test.js scripts/cad-user-upload-route.test.js
NODE_PATH=/Users/vambahsillah/Documents/ReversR-Workspace/ReversR-Rebuild.worktrees/cad-auth-store-migration-adapter/node_modules node --test scripts/cad-user-upload-route.test.js
node --check server/convexUploadSessionStore.js
node --check scripts/cad-convex-store.test.js
git diff --check
```

Both syntax checks and diff check passed. Confirmed no diff in the existing service,
verifier, router, package.json or package-lock.json. No TypeScript/Convex source changed;
no Convex compile/push or full application build is claimed. In a freshly installed
checkout, `node --test` needs no NODE_PATH override. The new port tests themselves
use only Node built-ins and the repository's existing dependency-free store module.

## Remaining implementation/qualification

This slice is PR-ready for the **unwired port and replacement design**, not auth/store
activation. The following remain necessary: Convex Auth beta/version decision or
qualified JWT provider; exact provider-session revocation; schema/internal functions;
authenticated gateway and callbacks; generated types and SDK pinning; offline Convex
backend tests; live two-client race/deadline/restart/restore evidence. Cancellation
before remote commit remains unresolved and blocks default-service wiring.

No UI changed, so no browser walkthrough is claimed. No private CAD, conversion,
provider validation, external resource, SQL, env write, deployment or upload enablement
was performed. No expense incurred by this lane. The earlier Supabase project remains
untouched; its reported $10/month cost is delegation context, not freshly verified
billing or a claim that deletion has stopped charges.

## Exact next approval packets

No approval is needed merely to continue local implementation under the original
scope. Before any external action, captain must fill the bracketed destination,
commit, plan and variable manifest from reviewed evidence and present the complete
phrase to Vambah. Unknown values are not approval and must not be guessed.

1. Resource creation only: “Approve creation of the isolated ReversR CAD Convex
   development project [project name] in [team/region], owned by [owner], on [verified
   plan] with [enforceable total cap and recurring-cost terms], for synthetic authority
   testing only. No function deployment, auth/env configuration, production changes,
   Supabase mutation, CAD input, conversion or upload activation.”
2. Development deployment only, after implementation review: “Approve deploying
   commit [full SHA] from codex/cad-convex-store-adapter to Convex development deployment
   [exact deployment ID] in [team/project], including only the reviewed schema and
   function manifest [checksum]. Synthetic authority conformance only; no environment
   changes, production deployment, private CAD, conversion or upload activation.”
3. Development auth/configuration only: “Approve configuring [exact auth provider and
   development client] and setting only [reviewed variable-name manifest/checksum] in
   [exact Convex development deployment and development Node environment], with callback
   URLs [exact URLs]. No production environment, Supabase mutation, CAD input,
   conversion, deployment or upload activation.”

After the applicable approval: open the named Convex team/project in the in-app
Browser; confirm destination and current plan before submitting resource creation.
For deployment, verify Git SHA and reviewed function/schema manifest before the
approved CLI command. For configuration, enter secrets directly in the approved
secret editor, never chat/screenshots. Return sanitized team/project/deployment IDs,
SHA, manifest checksum and pass/fail receipts. If any destination/value differs,
stop that action and return the discrepancy. Production and CAD execution require
separate concrete approval packets.

## Supabase cleanup is separate and destructive

First captain should verify project identity, ownership, data/backup requirements,
dependencies and current billing read-only. If the resource is confirmed disposable,
present this exact phrase; none of the Convex approvals above authorizes it:

“Approve permanently deleting only Supabase development project jydipbkofvvpvaylxwbb
(reversr-cad-auth-dev, us-east-1), after verifying it contains no needed data and no
active dependencies, to stop its project compute charges. Do not delete the Supabase
organization, change its subscription, or mutate any other project. Verify deletion
and remaining billing afterward; report any residual charges.”

After this explicit approval, use the in-app Browser → Supabase → verified organization
→ project reversr-cad-auth-dev → project settings → deletion control (recheck current
labels). Compare the displayed project reference before the final destructive action.
Success requires project deletion confirmation plus billing review; do not promise
an immediate refund or that organization subscription charges disappear. Return only
sanitized confirmation, time and remaining charges. This lane did not perform cleanup.

## Roadmap handoff

Completed: preferred-store decision reflected in docs and tested local transport seam.
Plan changed: Convex library auth plus transactional authority replaces new Postgres
migration/setup as the default. Next: exact-session decision and offline backend/gateway
implementation. Gates: unresolved remote cancellation, provider revocation and live
conformance; then separately resource/config/deploy approval, followed eventually by
upload activation and CAD-run authority. Captain owns review, any later push/PR and
integration; this lane stops here.
