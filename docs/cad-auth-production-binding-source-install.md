# CAD Auth production binding source installation

Roadmap: 5/6 complete. This phase adds source assembly only. Production remains
closed, and the sixth phase still requires a separately approved live opening.

## Installation path

`server/index.js` calls `createCadProductionExecutionBinding()`; its source factory
now resolves `cadProductionExecutionBindingInstallation.js` through
`resolveCadProductionExecutionBindingSource()`. The committed installation is no
longer an empty null slot and no longer uses pending placeholder session/evidence
values: it binds the reviewed PR #450 schema-rebound source record, exact bounded
session, durable evidence digest, production deployment proof, live-gate digest,
and durable adapter method surface. It is still disabled and explicitly not
live-approved, so default production behavior remains fail-closed. Importing or
resolving the installation makes no service calls. There is no environment toggle,
file loader, HTTP endpoint, credential lookup or executable command-card issuer.

A later separately reviewed source installation must provide:

- `enabled: true` plus a schema-version-1 manifest containing exact canonical
  command-card bytes and SHA-256, current immutable deployment reference, bounded
  session reference, exact session ID, durable evidence digest and service reference.
- A live gate with `explicitLiveOpeningApproved: true` and `installationSha256`.
  The digest is SHA-256 of JSON.stringify of the ordered projection in the resolver:
  schemaVersion, commandCardBytes, commandCardSha256, currentDeploymentReference,
  boundedSessionRef, sessionId, durableEvidenceSha256, durableServiceRef, startUtc,
  expiresUtc. Window fields come from the validated card. A matching digest alone
  does not establish human approval; the runtime independently verifies it.
- A durable adapter descriptor whose service reference and evidence digest match
  the manifest, plus all METHODS exported by the existing executable runtime.
  Construction captures bound methods and primitives. It does not qualify an
  adapter or substitute synthetic receipts for durable evidence.

The adapter contract remains the existing runtime receipt contract: exact command
card, deployment, session and run fence on every receipt; independently verified
approval/evidence/deployment/baseline before mutation; atomic durable run and
attempt claims with expiry enforcement; armed durable rollback before opening;
then closeFence, revokeSessionAndLateGrants and postRollbackSmoke. Smoke must
report failClosed, zero bodyReads/sessionGrants and fenceClosed. Cleanup remains
permitted after expiry or an unknown forward outcome. All cleanup effects are
attempted even if another fails; failure stops without retry.

Installation can occur before the window starts, but runtime effects cannot.
Expired or invalid clocks reject installation. The existing adapter wrapper checks
expiry and monotonic time before and after every forward await, including the
final await before admission. Default construction never opens admission.

## Source and live boundaries

This packet contains no live-approved command-card, runtime activation, provider
adapter or durable-service qualification. The installed source object is a
disabled proof surface: its manifest, installation digest and adapter methods
can be consumed by the production resolver only when a later exact source gate
binds current production values and explicitly marks the live gate approved.
Tests use synthetic in-memory service doubles and perform no request-body IO.
The older finalization packet is preserved as historical provenance; its source
hashes are stale after this change and its checker must reject it. The new packet
binds current source hashes without refreshing historical approval evidence.

Current observed base: PR #450 merge commit
5010b7262050126819eaa3caa50abb8a9662654b. GitHub production deployment
6748757459 and fail-closed smoke 401 USER_SESSION_REQUIRED at
2026-09-30T00:45:32Z are bound into this source-only proof. Any later source
installation/deployment changes the binding under review. Never copy an old
target into a new card or treat the stable production alias as immutable proof.
If the resulting deployment cannot be bound exactly, stop. This phase supplies no
provider-specific activation or deployment-ID reservation mechanism.

No provider/env/resource/billing changes, secrets or secret reads, private evidence
reads, upload-session issuance, production upload activation, request-body admission
or reads, conversion, Sandbox dispatch, private CAD, live evidence collection,
runtime activation, live command-card issuance, external messages, retry, second
live run, commercialization or commercial-readiness claim are authorized here.

## Later live-opening gate

An exact actionable phrase cannot be issued from this source-only packet alone:
the post-merge deployment created by this change, current fail-closed smoke,
durable-service live qualification, fresh UTC window, live-approved command-card
bytes/digest and production installation digest remain unresolved. The exact
bounded session ID and durable evidence digest are now source-bound. The following
is a non-actionable template only:

> I approve one bounded internal production upload-admission opening for ReversR
> CAD user-import, bound to source-install packet <packetSha256>, source commit
> <sourceCommit>, immutable production deployment <deploymentReference>, verified
> fail-closed smoke <smokeReference>, durable service <durableServiceRef>, durable
> evidence <durableEvidenceSha256>, bounded session reference
> rrb-ref:cad-upload-internal-mark-test-session-v1, exact session <sessionId>,
> reviewed command-card SHA-256 <commandCardSha256>, installation SHA-256
> <installationSha256>, and UTC window <startUtc> inclusive to <expiresUtc>
> exclusive. Issue and use only that card against https://reversr.vercel.app
> POST /api/cad/user-import for the internal test cohort; one session and one
> attempt; public, synthetic or explicitly authorized internal tester CAD only;
> independent expiry checks before every effect; atomic durable claims;
> rollback-first controls and post-rollback fail-closed smoke. Stop on any mismatch,
> unknown outcome, failed smoke or missing evidence. No upload-session issuance,
> provider/env/resource/billing changes, secrets, private evidence reads, private
> CAD, conversion, Sandbox dispatch, external messages, retry, second run,
> commercialization or commercial-readiness claim.

The captain must resolve and verify every field before returning an exact phrase.
Missing durable adapter evidence or session binding is a stop condition, not a
reason to populate placeholders from test fixtures. This implementation lane stops
at a draft PR; the captain handles permitted integration and production smoke.

## Validation

```sh
node scripts/cad-auth-production-binding-source-install-checker.js
node --test scripts/cad-auth-production-binding-source-install.test.js scripts/cad-auth-production-execution-binding-finalization.test.js scripts/cad-auth-live-opening-execution-gap-closure.test.js scripts/cad-auth-live-opening-executable-runtime-wiring.test.js scripts/cad-auth-final-live-opening-rebind-prep.test.js
git diff --check
```
