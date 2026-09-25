# CAD Auth coherent restricted source-set contract

Status: source-only, sanitized and non-executable. This packet defines the
acceptance shape for a future private CAD Auth restricted receipt bundle. It
does not load a private source, ingest receipt values, prepare a sealed card or
authorize live collection.

## Why this exists

The latest candidate-discovery packet inspected the approved ignored local
candidate areas and found no coherent eight-category source set. The next gate
needs a stricter contract so the next private read can be evaluated once, with
clear pass/fail rules, instead of iterating on ambiguous partial receipts.

## Required private-source shape

A future source must be either one private bundle or a declared coherent source
set containing exactly one receipt for each CAD Auth category:

- concrete provider runtime binding;
- executable collector command review;
- restricted synthetic cohort receipt;
- custody/reviewer receipt;
- durable consumed-run ledger;
- installed route/body observer;
- late-grant observer; and
- immutable target recheck receipt.

For each category, the public repository may contain only an opaque ref,
SHA-256 digest, byte count, field-presence status and disposition. Raw receipt
values, local paths, top-level key listings, tokens, headers, cookies, provider
values, private CAD, request bodies and exception text must remain outside Git.

## Coherence rules

The future private source must reject duplicate categories, path-like refs,
digest substitution, stale candidate/deployment targets, same-person
custodian/reviewer references, missing durable-ledger receipts, missing
route/body-ordering observer receipts, missing late-grant denial receipts and
missing retention/deletion disposition.

This packet is not itself evidence. It only describes the gate a later named
private source must pass before a non-executable sealed card can be proposed.
If no single source or coherent source set contains all eight categories, the
process must stop again with no live collection.

## Local validation

Run:

```sh
node scripts/cad-auth-restricted-source-set-contract-checker.js
node --test scripts/cad-auth-restricted-source-set-contract.test.js scripts/cad-auth-restricted-candidate-discovery.test.js scripts/cad-auth-restricted-source-intake.test.js scripts/cad-auth-restricted-receipt-review.test.js scripts/cad-auth-restricted-receipt-bundle.test.js
```

Passing validation means only that the public source-only contract is internally
consistent and cannot be promoted into runtime execution.
