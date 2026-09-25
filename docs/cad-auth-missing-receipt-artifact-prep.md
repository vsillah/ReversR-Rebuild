# CAD Auth missing restricted receipt artifact preparation

Status: source-only preparation. Parent: PR #408, merge
`db8baa46aeaf8fb2005cc5fe240d51389f86abc5`.
No receipt has been created, supplied, read or accepted by this packet. Passing
its checker proves only that this public plan matches its source contract.

## Eight missing artifacts

Each category requires its own dedicated JSON receipt, named `<category>.json`.
The JSON packet preserves the parent's required public field names and specifies
source system, custodian role, independent reviewer role, allowed evidence
source, creation or supply plan, retention boundary, category stop conditions,
and a category-specific future private-read approval phrase for every category.
Roles are requirements, not verified appointments.

| Category | Future supply requirement |
| --- | --- |
| concreteProviderRuntimeBinding | Existing installation and provider-binding receipts tied to reviewed adapter source; source alone cannot prove installation. |
| executableCollectorCommand | Existing source and disabled-card review records; no executable command card issuance. |
| restrictedSyntheticCohortReceipt | Existing synthetic cohort and ownership attestations. |
| custodyReviewerReceipt | Approved custodian, independent reviewer and restricted-store attestations. |
| durableConsumedRunLedger | Existing atomic consumption and stop/unknown qualification receipts; no new run or consumption. |
| installedRouteBodyObserver | Existing installation, earliest boundary and platform buffering receipts; no request-body read. |
| lateGrantObserver | Existing installation and late-grant denial attestations; no session or live grant exercise. |
| immutableTargetRecheckReceipt | Existing candidate/deployment/source-digest/timestamp provenance; stale or mismatched evidence stops review. |

## Future supply procedure

1. Privately name the source system, custodian, independent reviewer, category,
   allowed evidence source and retention boundary. The retention boundary must
   name duration and deletion owner in an approved ignored restricted store.
2. Obtain separate artifact supply approval using the exact template in
   `futureApprovalGates.artifactSupply.exactPhraseTemplate`, with every field
   resolved. This committed template grants no authority.
3. Under that later approval, assemble a dedicated JSON receipt only from existing
   approved evidence. Review provenance and required fields under a separately
   approved private review. Missing evidence remains missing. If installation,
   collection or a new runtime action is needed, stop and propose a separate gate.
4. Once all eight artifacts are supplied and independently reviewed, request the
   separate private-read gate. Never treat fixtures, role descriptions, this
   packet or its passing tests as installed/runtime evidence.

## Future private-read phrase

Each category now carries its own `futurePrivateReadApprovalPhrase`. The shared
source-set phrase template remains
`futureApprovalGates.privateRead.exactPhraseTemplate` in the JSON packet:

> Approve one CAD Auth restricted source-set private read from <exactSourceFolder> to <exactOutputFile> for run <runId>, bound to <candidateCommit> and preparation packet <packetSha256>, custodian <custodian>, independent reviewer <reviewer>, retained under <retentionBoundary>. Eight approved receipt files only; no discovery, live collection, retry, second run, runtime activation or public projection release.

All phrase fields remain null. Resolve them only in a future private approval
request; keep exact private paths and values out of public commits. Prior
approvals cannot be reused. The checker does not accept approval text or paths,
perform a private read, create private artifacts, or execute the template.
Sanitized projection publication requires a further independent approval naming
its exact private projection path, digest and candidate commit.

## Stop and retention boundaries

Stop on missing/malformed/symlinked receipts, duplicate source digests, missing
fields, unassigned roles, a reviewer acting as custodian, undefined retention,
unapproved evidence, target mismatch, or unresolved placeholders. Stop if supply
needs secrets, provider/env/resource/billing changes, live evidence, runtime or
production upload activation, upload-session issuance, body admission/read,
conversion, Sandbox dispatch, private CAD, external messages, executable cards,
retry, second run or real-user commercialization. No commercial readiness claim
is supported.

Public outputs contain only source plans, public contract field names, tests,
checkers and manifests. They contain no private receipt values, local private
paths, private key listings, provider/runtime values, request bodies, secrets or
live evidence. Private artifacts stay within their separately approved retention
boundary. Digests, byte counts, opaque refs and derived dispositions require the
later private-read and sanitized-projection gates before public release.

## Local source validation

```sh
node scripts/cad-auth-missing-receipt-artifact-prep-checker.js
node --test scripts/cad-auth-missing-receipt-artifact-prep.test.js scripts/cad-auth-restricted-receipt-gap-closure.test.js scripts/cad-auth-restricted-source-set-generator.test.js scripts/cad-auth-restricted-source-set-contract.test.js
node scripts/cad-convex-source-audit.js
node scripts/cad-convex-contract-manifest.js
```

The checker's sole optional argument, `--write`, regenerates only the public
packet from fixed public source files. No private source argument is supported.
