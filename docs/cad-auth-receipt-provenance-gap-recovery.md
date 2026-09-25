# CAD Auth receipt provenance gap recovery

Status: source-only recovery requirements. All current stop dispositions remain
in force. No private evidence was read, discovered, created, supplied or accepted.

The public receipt contract requires 23 fields across eight categories. Its prior
source record identifies only `concreteProviderRuntimeBinding.adapterSourceSha256`
as present. This packet records that presence without its private value or a claim
of fresh verification. The other 22 fields require evidence provenance. A source
digest alone cannot prove installation, runtime behavior or a complete receipt.

## Bound anchors

| Anchor | Exact value |
| --- | --- |
| Main commit | `cdfe042852eaa5393656aeec87aac630eaf47f47` |
| Eight-artifact supply packet SHA-256 | `6c8078d324286af5560e99c5d0e632616d83867538cee65ca8645975e96cbdac` |
| Stop disposition SHA-256 | `6fbdb713768b16563a6bd0bf6557c79c4fc10217f809330bab49982f95f17157` |
| Supply-attempt disposition SHA-256 | `c3356c5457988de9926b11d663cb77a059104c757dce30c2633d6cb2fe98731d` |
| Artifact-creation-attempt disposition SHA-256 | `3ef1c42261cfbcdc2982bd30fa39273f6e3d037513af8575401fc04717c7d62e` |

The checker verifies the committed supply packet bytes against the supplied hash.
The three disposition hashes are anchors supplied in the implementation brief;
their private bytes were not read or independently rehashed. They preserve the
stop boundary and grant no authority to repeat prior supply or creation attempts.

## Field-by-field source requirements

The [JSON packet](cad-auth-receipt-provenance-gap-recovery.json) lists every field
under `preparation.missingFields`. Each entry names its source system and exact
artifact contract, custodian role, independent reviewer role, retention/deletion
boundary and future approval phrase. Two fields named `installedObserverReceiptRef`
remain distinct: the route-body observer and the late-grant observer require their
own installation provenance.

Artifact descriptions specify what must substantiate a field. They do not assert
that an artifact exists. Exact private record references, source digests, prior
approvals and named assignments remain null. They must be resolved privately under
an appropriate gate before the proposed review can proceed. Public field names
come from the committed contract, never from private key listings.

| Category | Unsupported fields |
| --- | --- |
| concreteProviderRuntimeBinding | installedRuntimeReceiptRef; providerBindingReceiptRef |
| executableCollectorCommand | reviewedCollectorSourceSha256; disabledCardDigest; commandReviewReceiptRef |
| restrictedSyntheticCohortReceipt | restrictedCohortReceiptRef; syntheticOwnershipReceiptRef |
| custodyReviewerReceipt | custodianReceiptRef; independentReviewerReceiptRef; restrictedStoreReceiptRef |
| durableConsumedRunLedger | ledgerReceiptRef; atomicConsumeReceiptRef; stopAndUnknownConsumeReceiptRef |
| installedRouteBodyObserver | installedObserverReceiptRef; earliestBoundaryReceiptRef; platformBufferingReceiptRef |
| lateGrantObserver | installedObserverReceiptRef; lateGrantDenialReceiptRef |
| immutableTargetRecheckReceipt | candidateCommit; immutableDeploymentRef; sourceDigestReceiptRef; recheckedAtUtc |

## Next private evidence-provenance decision

1. Review this source-only PR and its field contracts. Passing source checks leaves
   every evidence and execution gate closed.
2. Have the authorized custodian identify the existing, previously approved,
   secret-free artifact for each of the 22 fields in a private schedule. Each row
   must include the exact artifact reference and digest, prior evidence approval,
   source system, named custodian, distinct independent reviewer, restricted store,
   retention duration, UTC expiry, deletion owner and target/source/time criteria.
   The schedule must cover all 22 fields exactly once. One artifact may support
   several fields only through explicit mappings. If preparing it needs an
   unapproved private read or discovery, stop for a separate bounded proposal.
3. Resolve every placeholder in the exact template at
   `preparation.futureApprovalGate.exactPhraseTemplate`. Bind the complete schedule
   digest, recovery packet digest and reviewed source commit. Keep private values
   and paths out of this public packet and PR. Confirm the reviewers are distinct
   from custodians at both field and bundle level, and the UTC window is current.
4. Present the complete resolved schedule and phrase through the restricted
   approval surface for Vambah's explicit approval. The template itself, generic
   proceed, prior supply approval and prior creation approval are insufficient.
5. Only after that separate approval may the named reviewer perform the one bounded
   provenance review. Stop the whole review on missing, stale, mismatched,
   unapproved or unknown evidence, a failing check, or a need for runtime credentials
   or provider configuration. Record unsupported evidence as missing. Never create
   qualification evidence or substitute source fixtures to close a gap.
6. Keep working copies and all derivatives in the named ignored restricted store.
   Stop at expiry; the assigned deletion owner must delete those copies by the
   approved deadline and record verification privately. Original source records
   follow their separate retention policy. This gate cannot delete them.

This checker implements no approval parser or private reader. It accepts no private
input path or approval text. A future provenance review does not create or supply
receipts, generate a source set, release a public projection or issue a command card.
Those operations retain their separate gates.

## Closed boundaries and validation

No private receipt reads or discovery, provider/env/resource/billing changes,
secrets or secret reads, upload-session issuance, production upload activation,
request-body admission/read, conversion, Sandbox dispatch, private CAD payload
use, live evidence collection, runtime activation, executable command-card
issuance, external messages, retry, second run, real-user commercialization or
commercial-readiness claim is authorized by this packet.

```sh
node scripts/cad-auth-receipt-provenance-gap-recovery-checker.js
node --test scripts/cad-auth-receipt-provenance-gap-recovery.test.js scripts/cad-auth-eight-artifact-supply-gate.test.js scripts/cad-auth-missing-receipt-artifact-prep.test.js scripts/cad-auth-restricted-receipt-gap-closure.test.js scripts/cad-auth-restricted-source-set-generator.test.js scripts/cad-auth-restricted-source-set-contract.test.js
node scripts/cad-convex-source-audit.js
node scripts/cad-convex-contract-manifest.js
git diff --check
```

Optional `--write` regenerates only this public packet from fixed public sources.
Tests cover every required field and leaf, all supplied anchors, source drift,
hostile inputs, sanitized failure output and runtime isolation. No build, live
workflow, customer-data smoke or private provenance review is performed here.
