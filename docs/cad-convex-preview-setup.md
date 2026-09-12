# CAD preview configuration and auth boundary

Base: PR #176, `7c31623d420e55a61c1167e88fb747cb6cad884b`.
Branch: `codex/cad-convex-live-auth-wiring`.
Worktree: `ReversR-Rebuild.worktrees/cad-convex-live-auth-wiring` beside the repo.
Status: synthetic local composition only. Live Auth readiness is false.

## Inventory and phase delta

The merged sequence supplies metadata-only Import UX (#164), the user-session
blocker and verifier (#165–166), issuer/store contracts (#167), permanently disabled
user route (#168), rejected commercial-auth/store boundary coverage (#169), verified
originating-login contracts and provider decision/design packets, then the preferred
Convex port (#173), offline backend (#174), gateway/session adapter (#175), and
compiled internal schema/functions with pinned bindings (#176). Historical provider
alternatives remain documented; this phase does not reactivate them.

The new `offline/cad-convex/previewRuntime.js` composes the existing request adapter.
Its declaration file records the host/configuration boundary. No production runtime
imports it. No SDK or library-session implementation is replaced. The real
`convex/librarySession.ts` still throws `AUTH_UNAVAILABLE`.

`inspectPreviewConfig` reports only a stable code and booleans. Missing/invalid
configuration denies. Live mode reports `LIVE_AUTH_UNQUALIFIED`; production targets
and real endpoints deny. Even valid synthetic configuration reports
`liveAuthReady: false` and `uploadsEnabled: false`.

## Local operator walkthrough

1. Open this named worktree in the terminal. Use its existing pinned dependencies
   or install the reviewed lockfile with lifecycle scripts disabled. This lane reused
   the sibling schema-functions dependency directory read-only via a local symlink.
2. Run `node --test scripts/cad-convex-preview-runtime.test.js`. Expect five passing
   tests. The test creates its own in-memory fixture and ephemeral loopback server;
   it needs no env file, account, secret or hosted endpoint.
3. For an explicit synthetic host, provide this object directly to the factory;
   these are reserved synthetic addresses and are never contacted:

   ```js
   { mode: 'synthetic', target: 'preview',
     deploymentUrl: 'https://deployment.invalid',
     issuerUrl: 'https://issuer.invalid', appOrigin: 'https://app.invalid',
     applicationId: 'convex' }
   ```

   `target: 'preview'` labels the synthetic test context; it does not launch or certify
   a hosted preview. No environment names or automatic environment selection exist.
4. Supply literal `testOnly: true` plus trusted `verifyConfiguration`,
   `authenticateService`, `verifyExactLogin`, `invokeInternal`, and optional clock
   hooks. Use `scripts/cad-convex-preview-runtime.test.js` as the executable example.
   Verification must return literal true on every operation for this exact frozen
   configuration snapshot. Missing, failed or timed-out verification denies before
   backend access. Never derive approval or verified status from browser claims or
   an env boolean. Hooks are privileged code and must themselves remain synthetic;
   the marker is not a sandbox or an authentication protocol.
5. Create a fresh frozen opaque context per request with `forRequest`. Freeze is
   shallow; the host owns nested context immutability and lifecycle. Never share
   mutable auth state across requests. Supply only the shop selector to issuance.
   Store only the credential digest; never log the returned credential.
6. Confirm valid authority receives `USER_UPLOADS_DISABLED` on the actual user
   router before any body access. Revocation must produce `USER_SESSION_REQUIRED`.
   Return test counts and sanitized failure codes to the captain, never tokens.

## Future live setup packet: prepare, then stop for separate gates

The current build pins are Convex 1.45.0 / Convex Auth 0.0.95 / Auth Core 0.41.3.
Compilation does not accept Auth lifecycle/beta risk. Before live wiring, captain
must fill and review: owner, team/project, exact development deployment ID and region,
provider/client, callback URLs, configuration-name manifest, source commit and
function manifest checksum, current plan and enforceable budget. Unknown values
remain pending. Existing guidance is in `cad-convex-store-review.md`.

The next implementation review must cover the complete auth.ts/auth.config.ts/http.ts
assembly, exact authSessions owner/liveness and upstream revocation, independently
verified service caller, replay and bounded body envelope, fixed internal references,
membership owner/provisioning, remote deadline/unknown-commit semantics, and retention
and restore. The preview configuration guard proves none of those live properties.

Present each fully populated phrase separately before its action:

- Resource only: “Approve creating only development Convex project [project] in
  [team/region], owned by [owner], on [verified plan and enforceable total budget],
  for synthetic authority tests. No deployment, auth/env setup, production change,
  private CAD, conversion, Supabase mutation or upload activation.”
- Auth/configuration only: “Approve configuring only [provider/development client]
  with callbacks [URLs] and configuration-name manifest [checksum] on [exact
  development destinations]. No resource creation, deployment, production change,
  private CAD, conversion, Supabase mutation or upload activation.”
- Deploy/test only: “Approve deploying only commit [full SHA], function manifest
  [checksum], to [exact development deployment] and running [reviewed synthetic test
  command manifest] within [enforceable budget]. No auth/env change, production
  deployment, private CAD, conversion, Supabase mutation or upload activation.”

After an applicable approval, open the named project/provider in the in-app Browser,
compare the displayed destination and plan to the approved packet, and perform only
that action. Enter secrets directly into its approved secret editor. Confirm success
with sanitized destination IDs, timestamps, checksums and pass/fail receipts. Stop
on any destination/budget mismatch. Production wiring, user-upload activation and
CAD execution each need their own later reviewed scope and approval.

## Validation and limitations

Commands from the worktree root:

```sh
node --test scripts/cad-convex-*.test.js scripts/cad-provider-store-contract.test.js scripts/cad-upload-session*.test.js scripts/cad-user-upload-route.test.js
npm run typecheck
npm run cad:convex:codegen:check
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
node --check offline/cad-convex/previewRuntime.js
node --check scripts/cad-convex-preview-runtime.test.js
git diff --check
LOCAL_RELEASE_CI_EVIDENCE_FILE=/private/tmp/cad-preview-local-ci.json npm run release:local-ci
```

Validation receipt: 71/71 focused tests pass; TypeScript, generated bindings,
manifest, syntax and leak/isolation checks pass. Full local release CI passes 16/16
with loopback server binding permitted through the approved shell escalation.
The task sandbox could not initialize because its configured writable root was a
symlink; canonical worktree commands ran through the reviewed escalation path.
CI-generated report churn was saved to a temporary patch and removed from this
otherwise clean dedicated worktree. The CI receipt is at the temporary path above.
The first test run exposed two incorrect null assertions for existing thrown
AUTH_UNAVAILABLE outcomes; corrected assertions now verify the intended failures. No UI changed; no browser walkthrough,
provider login, live Convex persistence/OCC, real upstream revocation or production
smoke is claimed. Tests use synthetic serialized transactions and a loopback listener.
The default application/server, capabilities and upload disable gate remain unchanged.
No resources, env files, deployment, private CAD, Sandbox, Supabase or expense involved.
PR #176 cleanup remains outside this lane.

Publication phrase, after substituting the reviewed local commit:

> Approve pushing only commit [full reviewed SHA] from codex/cad-convex-live-auth-wiring
> to vsillah/ReversR-Rebuild and opening a draft PR against main for the offline
> synthetic CAD preview configuration/session boundary and operator packet. No merge,
> deployment, resource creation, provider/auth or env configuration, Supabase mutation,
> private CAD, conversion, Sandbox dispatch or user-upload activation.

Completed phase: guarded synthetic composition. Next: captain review and exact commit
publication decision; then qualified provider/auth design and separately approved live
setup. Live auth and user uploads remain blocked by the listed qualification gates.
