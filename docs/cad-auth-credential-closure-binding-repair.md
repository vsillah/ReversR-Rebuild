# CAD Auth credential-closure binding repair

Roadmap: 5/6 complete. Step 6 remains the final live-opening gate.

The prior closure compared current metadata against a prior deployment, commit,
command-card digest and installation digest. This repair derives those bindings
from validated server-owned metadata and an explicit reviewed UTC window.
Default production stays closed without the exact private credential supply.

## Bound provenance

- Base: `79f25144225a2cf12052243f08a69109c3f632e7`.
- Stopped post-merge rebind disposition SHA-256:
  `e4a0c272ab7c71c5f3cd31c57b0f383ea454ad589756cbb39c54e371246039de`.
- Parent credential-closure packet SHA-256:
  `49fb61c54ddec577e9d3316cc9cc528789567618ee8a47a272c16d2e66d16027`
  at `7ece1ed0131dbef5a38a70aa508cd07696857e26`.
- Supplied GitHub production deployment: `6771743168`.
- Supplied production target: `https://reversr-irbbqlave-vsillahs-projects.vercel.app`.
- Supplied historical smoke: `401 USER_SESSION_REQUIRED` at `2026-09-30T22:42:27Z`.

This task does not refresh that production smoke or read private disposition
records. The original packet remains available at its source commit.

## Metadata reference policy

Policy: `rrb-ref:cad-auth-credential-closure-current-deployment-metadata-v1`.
The unchanged production entry calls `createCadLiveOpeningGateCredentialClosure()`.
Its default reader accesses only non-secret Vercel system metadata:
`VERCEL_DEPLOYMENT_ID`, `VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL`,
`VERCEL_GIT_COMMIT_SHA`, `VERCEL_GIT_COMMIT_REF`, `VERCEL_GIT_REPO_SLUG`,
`VERCEL_GIT_REPO_OWNER`, and `VERCEL_ENV`.

The closure requires the reader's exact shape, an immutable `dpl_` ID, an
immutable `reversr-<deployment>-vsillahs-projects.vercel.app` target, a full
40-character commit SHA, project target `https://reversr.vercel.app`, and exact
`vsillah/ReversR-Rebuild`, `main`, `production` identity. Extra fields, alias
URLs, request metadata, absent IDs, and numeric GitHub deployment IDs are
rejected. Missing system metadata is a stop, never permission to configure a
provider. No new environment switch, file loader or HTTP activation endpoint
is added.

System metadata identifies the serving deployment; it cannot prove an old
immutable URL is still current production. Existing durable `recheckDeployment`
receipts must confirm that before effects. Installation compares the gate's
commit, target and ID with the same metadata snapshot. Stale gates reject.
The new repair manifest uses clearly synthetic Vercel IDs; it claims no mapping
from those IDs to the supplied GitHub deployment.

## Exact binding and private supply

Command-card SHA-256 covers the literal canonical UTF-8 JSON bytes constructed
in memory from current immutable deployment ID, session, durable evidence and
reviewed window. Parsing and reserialization must preserve that digest. No card
is written or issued for live execution.

Installation SHA-256 covers the ordered projection of schema version, literal
command-card bytes and digest, current deployment ID, bounded session ref,
session ID, durable evidence digest, durable service ref, start and expiry UTC.
The resolver recomputes it. Missing or altered bytes/digests reject installation.
The gate separately compares commit and target with current metadata.

The bounded session remains `rrb-ref:cad-upload-internal-mark-test-session-v1`.
Durable evidence remains
`8d371999f3efa3f090ae84fd6e88e8a912a6e69170c7e79672a96378bc15eaa7`.
Private supply requires the exact ref
`rrb-ref:cad-auth-live-opening-private-session-credential-supply-v1`, bearer
transport, and credential digest
`2165440ab2035b4fa249cf960cc036b449b9eb780776c89ad5cba46b9033e359`.
A private supply receipt SHA-256 is mandatory. Raw credential values and unknown
fields are rejected. Privacy flags must be false, supplied must be true, and
upload-session issuance must remain unauthorized. Receipt presence is a source
precondition, not proof of private supply or live qualification; separate
approval and receipt review remain necessary. Tests use synthetic receipt
records and never read the credential or its preimage.

## Effects and default closure

There is no automatic window extension. A later source-owned reviewed window
must be valid UTC, start-inclusive, expiry-exclusive, and at most 30 minutes.
It changes both digests. The historical default window cannot renew itself.
The existing runtime independently checks expiry before each forward effect
and after every awaited effect, including the final await before body access.
Durable atomic claims enforce one session, one run and one attempt across
instances. Unknown outcomes spend the local attempt. Rollback is armed before
the fence opens; cleanup closes the fence, revokes the session and late grants,
then requires a fail-closed smoke receipt. Cleanup remains possible after
expiry. Failed or unknown rollback/smoke stops without retry.

Default private supply remains `supplied: false`, and the default durable
adapter rejects every effect. Current metadata alone enables neither the
session service nor runtime. Synthetic composition exercises the same factory
with exact private supply controls to prove a non-null gate and installation.
The local production router composition proves `401 USER_SESSION_REQUIRED`
without body reads. These are source proofs, not deployed or live readiness.

## Validation and next gate

Use existing local dependencies only. Focused commands:

```sh
node scripts/cad-auth-credential-closure-binding-repair-checker.js
node scripts/cad-auth-live-gate-credential-closure-checker.js
node scripts/cad-auth-production-binding-source-install-checker.js
node --test scripts/cad-auth-credential-closure-binding-repair.test.js scripts/cad-auth-live-gate-credential-closure.test.js scripts/cad-user-upload-route.test.js scripts/cad-auth-live-opening-execution-architecture-closure.test.js scripts/cad-auth-default-prod-binding-source-closure.test.js
node --test scripts/cad-auth-production-binding-source-install.test.js scripts/cad-auth-production-execution-binding-finalization.test.js scripts/cad-auth-live-opening-execution-gap-closure.test.js scripts/cad-auth-live-opening-executable-runtime-wiring.test.js scripts/cad-auth-final-live-opening-rebind-prep.test.js
```

After draft PR review, merge/deployment requires separate authority. The next
gate is source-only post-merge rebind against actual non-secret metadata, a
fresh reviewed window, exact card/installation digests and fail-closed smoke.
This repair authorizes no runtime activation, private credential supply, live
opening, uploads, conversion, Sandbox work, external messages, retries, or
commercial-readiness claim. Stop on failing checks, unknown outcome, unresolved
metadata/card/installation binding, missing credential requirement, private-data
risk, or need for runtime credentials/provider configuration.
