# CAD Auth restricted source-set generator

Status: source-only generator contract plus local ignored CLI. This packet adds
a helper that can assemble a sanitized `.local` source-set projection from a
named private receipt folder. It does not create evidence, search for receipt
folders, activate runtime paths or authorize live collection.

## Expected private folder shape

The generator reads only these exact files from the named folder:

- `concreteProviderRuntimeBinding.json`
- `executableCollectorCommand.json`
- `restrictedSyntheticCohortReceipt.json`
- `custodyReviewerReceipt.json`
- `durableConsumedRunLedger.json`
- `installedRouteBodyObserver.json`
- `lateGrantObserver.json`
- `immutableTargetRecheckReceipt.json`

For each file it computes the SHA-256 digest of the exact file bytes, records
the byte count, and records only whether the required field names are present
somewhere in the JSON. Raw values, local paths, top-level key listings, tokens,
headers, cookies, request bodies, private CAD, provider values and exception
text are not written to the projection.

## Local use

```sh
node scripts/cad-auth-restricted-source-set-generator.js \
  --source-dir /path/to/private/receipt-folder \
  --out .local/cad-auth-restricted-source-sets/<run-id>/restricted-source-set.json \
  --run-id <run-id>
```

The output path must be under `.local/cad-auth-restricted-source-sets/` and the
file name must be `restricted-source-set.json`. The generator stops without
writing if any category file is missing, malformed, symlinked, or missing a
required field.

## Boundary

This is a local assembly helper only. A generated projection is still private,
ignored and non-executable. A later gate must separately approve reading the
named generated projection and committing only sanitized opaque refs, digests,
byte counts, coverage and disposition.

## Local validation

Run:

```sh
node scripts/cad-auth-restricted-source-set-generator-checker.js
node --test scripts/cad-auth-restricted-source-set-generator.test.js scripts/cad-auth-restricted-source-set-contract.test.js scripts/cad-auth-restricted-candidate-discovery.test.js
```
