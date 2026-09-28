# Source-only live-opening runtime activation implementation

This gate implements an opt-in server control plane. It performs no live run and issues no command card. Production remains closed: `cadUserUploadRouter.js` retains `BODY_ADMISSION_AUTHORIZED = false`, and the default runtime mount still returns a disabled decision. The later executable-runtime wiring adds a route body-gate hook, but default production bootstrap still denies before request-body validation unless a separately approved exact executable command card and durable adapter are supplied. No provider adapter, credentials, session issuer, request body reader, conversion, or Sandbox dispatch is supplied by this implementation.

`createCadLiveOpeningRuntimeActivation` composes the existing runtime mount. Its returned mount can use the router's existing `liveOpeningRuntimeMount` injection contract. Its `runActivation()` method is the explicit control-plane entry point; requests cannot invoke it or enable it. Omitted `enabled`, missing adapter methods, invalid card bytes, missing evidence, or unbound input stops closed. No production bootstrap imports the controller. A later separately approved wiring gate must supply the reviewed server adapter and explicit inputs; changing `enabled` alone cannot grant body admission.

## Exact inputs and authority

The controller accepts the exact UTF-8 JSON bytes of the reviewed source-only draft, its SHA-256, one session ID, and the durable evidence packet SHA-256 already bound in that draft. Both the byte hash and the existing canonical draft validator must match. Even whitespace changes fail. Data is parsed and snapshotted once; adapter functions are bound once.

The draft is a bounds document, never execution authority. The trusted adapter must independently verify a fresh explicit live approval binding the digest, immutable deployment, cohort, session and exact inclusive-start/exclusive-expiry window. A source-committed deployment reference cannot establish current production state. Deployment is rechecked before baseline validation and again immediately before opening. There is no default adapter and no provider configuration or environment lookup.

## Required adapter contract

All methods receive immutable sanitized bounds and a fresh clock observation. Receipts must repeat operation, digest, deployment, session and the fixed run fence key. The controller rejects missing, false, stale, or unknown receipts and never reflects exception text.

1. `verifyApproval`, `verifyDurableEvidence`, `recheckDeployment`, `verifyClosedBaseline`: independently validate fresh approval, reviewed durable adapter evidence, current immutable deployment and closed baseline. Evidence must attest atomic claims, independent expiry enforcement and durable rollback.
2. `claimRun`: atomically consume the permanent `cad-production-internal-opening-v1` key across all processes and restarts, including changed cards, windows, sessions and deployments. A loser cannot arm or roll back the winning run. Keep consumed claims permanently; rollback cannot release them.
3. `armRollback`: durably schedule closure and revocation at expiry independently of this process. It must cover late completions and grants. A process timer or in-memory ledger is insufficient.
4. `verifySession`, `claimAttempt`: verify the existing bounded session, exact cohort and expiry, exactly one concurrent session, then atomically consume the single attempt. No session is issued here.
5. `recheckDeployment`, `openFence`, `consumeAttempt`: recheck deployment and atomically check the independently enforced window, owner/run/session/attempt state before each mutation. Opening must require the consumed run, armed rollback and claimed attempt. Consumption is single-use and must reject duplicates. No request body is admitted or read by the controller; its returned admission switch remains closed even after these steps.
6. Always attempt `closeFence`, `revokeSessionAndLateGrants`, `postRollbackSmoke` once after rollback is armed, including unknown arm/open/consume outcomes. The adapter must scope cleanup to this claim, close the durable fence, revoke the session and late grants, and establish fail-closed behavior with zero body reads and session grants.

The adapter is a trusted server integration boundary, not an untrusted request object. Receipt flags alone do not prove a provider implementation. The synthetic tests validate orchestration against the protocol; they do not qualify a real durable adapter. Missing independently reviewed adapter evidence blocks live integration. The adapter must enforce atomic expiry and durable rollback even if calls stall, the process crashes, or clocks fail. Local checks cannot replace those storage guarantees.

Clock checks occur before and after each forward operation. Invalid, regressing or expired time stops forward progress. Cleanup observes time independently but remains permitted outside the window and on clock failure, because blocking revocation at expiry would leave authority open. The control plane closes immediately after its bounded attempt; it never waits to prolong the opening window. Failed cleanup or smoke yields an unknown result and forbids completion or retry. Failure before opening still spends the local call, and any durable claim remains consumed.

## Validation and provenance

The implementation manifest binds the unchanged runtime mount, unchanged router, current-deployment rebind packet, controller, this document, checker and offline tests. The durable evidence packet remains byte-identical and pinned by its reviewed SHA-256. The digest checker validates those historical bytes rather than recursively comparing historical router hashes against the new mount. Dependent source manifests and non-executable draft bindings are refreshed for this checker repair; they issue no executable card and confer no live authority. The legacy runner regression now requires the mounted runtime to deny even when its VM flips the old body literal. The historical window and deployment remain preparation-time references and require independent fresh verification at a later live gate. The checker allows only its default read-only check and `--write` for the fixed source manifest. It rejects execution, activation, arbitrary paths and command-card issuance arguments.

Run:

```sh
node scripts/cad-auth-live-opening-runtime-activation-checker.js
node --test scripts/cad-auth-live-opening-runtime-activation.test.js
```

Offline fixtures use a synthetic in-memory ledger only to test duplicate/restart/concurrent controller behavior. They are not durable adapter evidence. Existing runtime mount tests additionally exercise the actual router's fail-closed body-read boundary on loopback.

No live evidence collection, upload-session issuance, production activation, payload admission/read, conversion, Sandbox dispatch, private CAD, provider/env/resource/billing mutation, secret read, external message, retry, second live run, commercialization or commercial-readiness claim is authorized. No UI behavior changed. Next: captain source review and checks, then a separate exact live-opening decision with current deployment, unexpired window and reviewed runtime adapter evidence. Merge, deployment and live smoke remain outside this task.
