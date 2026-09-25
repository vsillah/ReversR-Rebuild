# CAD Auth restricted receipt gap-closure plan

Status: source-only plan. This packet records why the restricted source-set
generator cannot yet produce a coherent eight-category receipt projection and
defines the exact artifacts needed before any later private read, live evidence
collection, upload-session issuance, or production activation can be considered.

## Observed gap

The approved local gap-disposition read scanned only the approved ignored
candidate roots. It parsed 98 JSON files and found zero full matches for the
eight restricted source-set categories. One category had partial coverage:
`concreteProviderRuntimeBinding` had candidates containing
`adapterSourceSha256`, but no candidate contained
`installedRuntimeReceiptRef` and `providerBindingReceiptRef`.

No files were copied, no source-set projection was written, and no runtime,
provider, upload, request-body, conversion, Sandbox, private CAD, or live
evidence action occurred.

## Required receipt artifacts

Each future private source-set folder must contain these exact dedicated JSON
receipt files:

- `concreteProviderRuntimeBinding.json`
- `executableCollectorCommand.json`
- `restrictedSyntheticCohortReceipt.json`
- `custodyReviewerReceipt.json`
- `durableConsumedRunLedger.json`
- `installedRouteBodyObserver.json`
- `lateGrantObserver.json`
- `immutableTargetRecheckReceipt.json`

Each file must contain the required public field names for its category. The
future generator may record only field presence, SHA-256 digest, byte count and
opaque local receipt refs after a separately approved private read.

## Source boundary

Public commits may contain only docs, tests, checkers, manifests, public field
names, stop conditions and future gate definitions. They must not contain
private receipt values, local private paths, top-level key listings, provider or
runtime values, request bodies, private CAD payloads, secrets, executable
command cards, or live evidence.

## Stop conditions

Any later source-set generation must stop if a category receipt is missing,
malformed, symlinked, duplicated by source digest, missing a required field, or
requires provider credentials, runtime activation, request-body reads, private
value disclosure, live collection, upload-session issuance, conversion, Sandbox
dispatch, or a second run.

## Future gates

The next gate is not a live run. It must first create or supply the missing
receipt artifacts under a named ignored private folder. After that, a separate
private source-set generation gate must name the exact source folder, output
file and run id. A later sanitized projection review gate must name the exact
projection path, projection SHA-256 and candidate commit before committing any
opaque refs, digests, byte counts or disposition derived from the private
projection.

Live evidence collection, executable command-card issuance, upload-session
issuance or production activation require a separate future gate naming a sealed
command-card digest, UTC execution window, limits digest and rollback controls.

## Local validation

Run:

```sh
node scripts/cad-auth-restricted-receipt-gap-closure-checker.js
node --test scripts/cad-auth-restricted-receipt-gap-closure.test.js scripts/cad-auth-restricted-source-set-generator.test.js scripts/cad-auth-restricted-source-set-contract.test.js
```
