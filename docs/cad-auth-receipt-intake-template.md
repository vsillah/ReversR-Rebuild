# CAD Auth value-free restricted receipt intake template

Status: source-only, unbound, non-executable. Parent: PR #401 merge
`098357ec891a5b591bb652d33e9d1c2ce79af6e8`. This packet defines the future
intake checklist. It creates no restricted receipts, opens no receipt references,
and grants no authority to create, collect, install or use restricted values.
Passing its checker means only that this empty source contract matches review.

## Required future slots

The generated JSON inherits the custody and sealed-card rebind requirements.
`preparation.runtimeBindingReceipts` retains each category's evidence fields;
`preparation.intake.slots` maps each intake row to that category contract. Every
row requires paired receipt and provenance refs/digests, origin and creation time,
exact-byte scope, role assignments, review ref/digest/time, retention policy and
immutable-target recheck. All concrete values remain null and acceptance flags
remain false. Category names describe future evidence, never executable actions.

| Category | Required category evidence |
| --- | --- |
| concreteProviderRuntimeBinding | Adapter source digest, installed runtime receipt and provider binding receipt |
| executableCollectorCommand | Reviewed source digest, disabled card digest and command review receipt; no command or executable card is emitted |
| restrictedSyntheticCohortReceipt | Restricted cohort and synthetic ownership receipts |
| custodyReviewerReceipt | Custodian, independent reviewer and restricted store receipts |
| durableConsumedRunLedger | Ledger, atomic consume and stop/unknown consume receipts |
| installedRouteBodyObserver | Installed observer, earliest boundary and platform buffering receipts |
| lateGrantObserver | Installed observer and late grant denial receipts |
| immutableTargetRecheckReceipt | Exact candidate commit, immutable deployment, source digest receipt and recheck time |

## Custody and review preconditions

Future restricted intake requires separate scoped authority and a user-owned
restricted store outside Git. Authority, store, transfer ref/digest, receipt time
and receiving identity slots remain empty. Concrete refs, identities, receipt
bytes and mappings must stay out of Git, logs, public artifacts and PRs.

Assign custodian, preparer, independent reviewer and deletion owner under that
future authority. The reviewer must be distinct from both custodian and preparer;
resolve conflicts with evidence, rather than self-attestation. Match all eight
categories, provenance, custody transfer and access accountability before review.
Missing or unknown evidence blocks acceptance. This source checker does not
perform that review or implement storage, ingestion or a restricted-value parser.

## Retention and disposition

The inherited seven-day retention starts at first separately authorized receipt
creation. Start, expiry, policy, deletion owner and disposition evidence remain
unbound. Expired or rejected evidence cannot be used. Record rejection, quarantine
and expiry review only in a separately authorized restricted workflow. Unresolved
disposition blocks use. Expiry does not authorize deletion: separate deletion
approval and a completion receipt/digest/time are required. No timer, deletion
job, quarantine action or restricted store is installed by this packet.

## Digest and immutable target preconditions

Future independent review must recompute SHA-256 over exact stored receipt bytes,
using 64 lowercase hexadecimal characters, for each category, provenance and
bundle. Document byte scope and verify category, origin and authenticity. Missing
pairs, mismatches, unknown scope or unverifiable provenance block review. Source
hashes are not receipt digests, signatures or proof of installed runtime behavior.
This checker hashes only fixed public repository files, never receipt bytes.

Recheck the exact candidate commit, immutable deployment and source-digest receipt
before a future command-card proposal and again before any separately authorized
run. Record recheck evidence/time; mutable aliases and historical merge commits
cannot serve as future targets. Drift invalidates earlier review. A future fresh
UTC window and schedule/limits digests remain unbound. Historical approval text,
windows and sealed cards cannot be reused. Even reviewed receipts require a new
non-executable proposal, independent review and a separate fresh exact approval.

## Source-only validation

The generator/checker accepts only the exact empty contract and fixed repository
sources. It rejects populated slots, missing or extra fields, changed gates,
parent/source drift, accessors, proxies and cycles without disclosing input.
`--write` regenerates only the public JSON template; no other CLI mode is accepted.
Runtime code must never import the offline module.

```sh
node scripts/cad-auth-receipt-intake-template-checker.js --write
node scripts/cad-auth-receipt-intake-template-checker.js
node --test scripts/cad-auth-receipt-intake-template.test.js scripts/cad-auth-sealed-card-custody-rebind.test.js scripts/cad-auth-receipt-custody-binding.test.js scripts/cad-auth-restricted-receipt-bundle.test.js scripts/cad-auth-command-card-source.test.js
node scripts/cad-convex-source-audit.js
node scripts/cad-convex-contract-manifest.js
git diff --check
```

Next gate: review the empty template. Stop before any restricted-value creation,
collection, installation or use; those need separately scoped authority. No live
Auth/provider tests, provider/env/resource/billing changes, secrets or secret
reads, upload-session issuance, production uploads, request-body admission/read,
conversion, Sandbox dispatch, private CAD, real-user commercialization, external
messages, runtime activation, executable command-card issuance, retry, second run
or commercial-readiness claim is authorized.
