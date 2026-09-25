# CAD Auth production upload-admission readiness rollup

Status: source-only, sanitized and non-executable. This packet rolls up the
accepted provenance projection, eight-artifact receipt supply, coherent
restricted source-set coverage, closed-control status, rollback controls and
the next approval-gated production upload-admission phrase. It does not read
private receipt values, private source-set bytes, local paths, top-level keys,
secrets, provider configuration, request bodies or private CAD.

## Rollup boundary

The public packet may contain only:

- source-only parent packet references and SHA-256 digests;
- the restricted source-set run id and SHA-256 digest;
- per-category receipt SHA-256 digests and byte counts;
- category and required-field coverage counts;
- closed-control and rollback/stop status; and
- the next exact approval phrase template.

This packet is not production upload activation, upload-session issuance,
request-body admission, conversion, Sandbox dispatch, runtime activation, live
evidence collection, or a commercial-readiness claim.

## Coverage

The rollup binds:

- accepted provenance projection: `22/22` required fields accepted;
- restricted source-set projection: `8/8` categories and `23/23` required
  receipt fields projected by counts only;
- eight receipt digests and byte counts; and
- closed controls for upload admission, request-body reads, session issuance,
  runtime activation, conversion, Sandbox dispatch, real-user
  commercialization and commercial-readiness claims.

## Next gate

The next safe action is a separate production upload-admission approval gate.
That later gate must provide the filled rollup packet SHA-256, source commit,
UTC start and expiry window. Unresolved placeholders are not approval.

## Local validation

Run:

```sh
node scripts/cad-auth-upload-admission-readiness-rollup-checker.js
node --test scripts/cad-auth-upload-admission-readiness-rollup.test.js scripts/cad-auth-restricted-source-set-projection.test.js scripts/cad-auth-accepted-provenance-projection.test.js
node scripts/cad-convex-source-audit.js
```
