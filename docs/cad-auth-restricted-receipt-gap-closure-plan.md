# CAD Auth restricted receipt gap-closure plan

Status: source-only requirements; no private receipts read or produced.

The sanitized captain handoff reports **0/8 complete categories**. Only
`concreteProviderRuntimeBinding.adapterSourceSha256` had partial coverage.
This baseline is supplied context, not a fresh inspection, receipt acceptance,
or evidence that the missing artifacts exist. The generator cannot manufacture
missing receipts. Field presence alone cannot establish semantic correctness.

## Missing artifacts and public field names

| Category | Required field names | Missing-artifact contract |
| --- | --- | --- |
| concreteProviderRuntimeBinding | adapterSourceSha256, installedRuntimeReceiptRef, providerBindingReceiptRef | Reviewed adapter source and installed/runtime provider receipts bound to one immutable target. Partial source digest coverage is insufficient. |
| executableCollectorCommand | reviewedCollectorSourceSha256, disabledCardDigest, commandReviewReceiptRef | Independent collector source review tied to a disabled card; no executable card or command bytes. |
| restrictedSyntheticCohortReceipt | restrictedCohortReceiptRef, syntheticOwnershipReceiptRef | Restricted synthetic membership and ownership receipts, with no private CAD or real-user cohort. |
| custodyReviewerReceipt | custodianReceiptRef, independentReviewerReceiptRef, restrictedStoreReceiptRef | Distinct custody/reviewer receipts and restricted-store retention/deletion disposition. |
| durableConsumedRunLedger | ledgerReceiptRef, atomicConsumeReceiptRef, stopAndUnknownConsumeReceiptRef | Durable atomic consumption evidence, including stop and unknown outcomes. |
| installedRouteBodyObserver | installedObserverReceiptRef, earliestBoundaryReceiptRef, platformBufferingReceiptRef | Installed earliest-boundary observer and buffering proof establishing zero pre-admission body reads. |
| lateGrantObserver | installedObserverReceiptRef, lateGrantDenialReceiptRef | Installed observer and denial-after-grant-change evidence for the same target. |
| immutableTargetRecheckReceipt | candidateCommit, immutableDeploymentRef, sourceDigestReceiptRef, recheckedAtUtc | Fresh immutable target and exact source-digest recheck shared across all receipts. |

All eight complete artifacts remain missing for planning purposes. The packet
records field names with null values; these are requirements, never receipt
placeholders that can be promoted to evidence. Each future receipt must carry
an opaque ref, exact-byte SHA-256, positive byte count and field-presence status.
The existing source-set contract supplies the coherence requirements.

## Provenance and future gates

Only tracked public contracts and the sanitized handoff inform this packet.
Private receipt values, local private paths, top-level key listings, secrets,
provider values, request bodies, private CAD and exception text stay outside
this source packet. A later approved public projection is limited to opaque
refs, digests, byte counts, field presence and disposition.

The JSON `futureGates` section defines exact required gate field names. All
values remain null and all approvals remain false. These definitions are not
an approval phrase, action dispatcher or authorization evaluator.

1. **receiptProvenance:** identify the category scope, reviewed producer,
   artifact provenance, restricted destination, distinct custodian/reviewer,
   retention/deletion disposition and exact allowed/forbidden actions. A human
   must separately approve the named artifact production or retrieval scope.
   If proving an artifact requires installation, a provider change or live
   observation, stop and propose that separate scope before doing any work.
2. **privateAssembly:** after the complete inventory exists, obtain separate
   approval for one named coherent source set, reviewed generator digest,
   output policy and one-attempt limit. This plan does not run the generator.
3. **sanitizedReview:** separately approve one named projection and digest,
   independent review and public output allowlist. Assembly does not authorize
   a private read by a later gate or publication of any private values.
4. **liveProposal:** only after accepted receipts, separately propose the
   disabled-card digest, durable ledger, fresh target, bounded window,
   enforceable cost cap, stop/rollback plan, single-run limit and no retry.
   This remains a proposal prerequisite; executable-card issuance and each
   live action require fresh, explicit scope approval outside this packet.

Every gate additionally requires an approval receipt, approver, exact scope,
candidate commit, immutable deployment and expiry. Previous windows cannot be
reused. Source-only review approval cannot stand in for any of these gates.

## Stop conditions

Stop on incomplete or partial-only coverage, malformed or symlinked sources,
duplicate categories, path-like refs, digest/source drift, stale or mixed
targets, same-person custody/review, missing retention/deletion disposition,
missing durable consumption, missing boundary/buffering or late-grant proof,
private disclosure, ambiguous/expired approval, scope expansion, stop or an
unknown outcome. Stop means no attempt, retry, second run or automatic promotion.

Provider/env/resource/billing changes, secret reads, upload-session issuance,
production upload activation, request-body admission/read, conversion, Sandbox
dispatch, private CAD, external messages, runtime activation, executable cards,
live collection and real-user commercialization remain unauthorized. Passing
this checker makes no commercial-readiness claim.

## Local validation

```sh
node scripts/cad-auth-restricted-receipt-gap-closure-plan-checker.js
node --test scripts/cad-auth-restricted-receipt-gap-closure-plan.test.js
node scripts/cad-convex-source-audit.js
node scripts/cad-convex-contract-manifest.js
```

The checker accepts only no arguments or `--write`, which regenerates this
public JSON packet from fixed tracked sources. It accepts no private path,
receipt input, live mode or approval argument. Validation proves source-plan
integrity only. Next: captain review of this source-only PR, followed by a
separate receipt-provenance decision. No receipt gap is closed by this PR.
