# CAD Auth restricted receipt candidate discovery

Status: source-only, sanitized and non-executable. This packet records a bounded
candidate-discovery read across ignored local CAD Auth receipt/register files.
It commits only opaque candidate refs, SHA-256 digests, byte counts and category
coverage status.

## Result

The discovery inspected 78 JSON candidates under the approved local ignored CAD
Auth evidence areas. No local filesystem paths, top-level key listings, private
payload values, secret values or provider/runtime values are committed.

The candidate union is incomplete:

- covered category: `concreteProviderRuntimeBinding`;
- covered candidates: `rrb-local:cad-auth-candidate-discovery-019` and
  `rrb-local:cad-auth-candidate-discovery-027`;
- missing categories: `executableCollectorCommand`,
  `restrictedSyntheticCohortReceipt`, `custodyReviewerReceipt`,
  `durableConsumedRunLedger`, `installedRouteBodyObserver`,
  `lateGrantObserver` and `immutableTargetRecheckReceipt`.

The two covered candidates each provide only partial single-field coverage for
the provider/runtime binding category. They are not accepted as a complete
category receipt and cannot advance the sealed-card gate.

## Still blocked

This packet does not authorize or prepare a non-executable sealed card. It
leaves live collection, runtime activation, upload-session issuance,
request-body admission/read, conversion, Sandbox dispatch, retry, second run and
any commercial-readiness claim disabled.

The next gate requires a coherent private source set that contains all eight CAD
Auth restricted receipt categories with opaque refs and exact SHA-256 digests.

## Local validation

Run:

```sh
node scripts/cad-auth-restricted-candidate-discovery-checker.js
node --test scripts/cad-auth-restricted-candidate-discovery.test.js scripts/cad-auth-restricted-source-intake.test.js scripts/cad-auth-restricted-receipt-review.test.js scripts/cad-auth-live-collector-binding.test.js scripts/cad-auth-command-card-source.test.js
```

Passing validation means only that the public sanitized discovery packet is
internally consistent and cannot be promoted into runtime execution.
