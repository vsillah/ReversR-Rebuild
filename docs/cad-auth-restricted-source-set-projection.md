# CAD Auth coherent restricted source-set projection

Status: source-only, sanitized and non-executable. This packet projects that a
coherent eight-category restricted source set was generated and validated from
the accepted provenance review. It does not read private source-set bytes,
private receipt values, local paths, top-level keys, secrets, provider
configuration, request bodies or private CAD.

## Projection boundary

The public packet may contain only:

- the restricted source-set run id and SHA-256 digest;
- per-category receipt SHA-256 digests and byte counts;
- category and required-field coverage counts;
- closed-control status; and
- stop conditions plus the next approval-gated source-only rollup.

The generated restricted source set remains private and ignored. This packet is
not runtime activation, upload admission, upload-session issuance, request-body
admission, conversion, Sandbox dispatch, live evidence collection, or a
commercial-readiness claim.

## Coverage

The projected source set covers all eight CAD Auth categories:

- concrete provider runtime binding;
- executable collector command review;
- restricted synthetic cohort receipt;
- custody/reviewer receipt;
- durable consumed-run ledger;
- installed route/body observer;
- late-grant observer; and
- immutable target recheck receipt.

The source-only projection records `8/8` complete categories and `23/23`
required field names present by count only. Raw field values remain outside Git.

## Next gate

The next safe action is a separate source-only readiness rollup gate that binds
this projection into the broader upload-admission readiness chain and returns a
later production upload-admission approval phrase. Production upload activation
still requires a separate explicit gate.

## Local validation

Run:

```sh
node scripts/cad-auth-restricted-source-set-projection-checker.js
node --test scripts/cad-auth-restricted-source-set-projection.test.js scripts/cad-auth-accepted-provenance-projection.test.js scripts/cad-auth-restricted-source-set-generator.test.js
node scripts/cad-convex-source-audit.js
```
