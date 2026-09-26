# CAD Auth durable adapter evidence command-card review

Status: source-only, sanitized and non-executable. This packet binds the durable
adapter preparation packet, the production deployment reference approved for the
review, source-only independent-expiry and durable-ledger evidence, fail-closed
route-smoke evidence, command-card digest requirements and the next live opening
approval template.

It does not issue a command card, issue an upload session, activate production
upload admission, read request bodies, dispatch conversion or Sandbox work, use
private CAD, collect live evidence, change provider configuration or claim
commercial readiness.

## Evidence boundary

The public packet may contain only:

- source-only parent packet references and SHA-256 digests;
- the production deployment URL reference and source commit;
- route-smoke statuses and zero-effect counters;
- source/test references for independent expiry and durable one-session,
  one-attempt ledger behavior;
- command-card digest and durable receipt key requirements; and
- the next exact approval phrase template.

It may not contain private receipt values, local paths, top-level key listings,
secrets, provider runtime values, request bodies, private CAD or executable live
command-card material.

## Closed controls

The review binds these controls as still closed:

- upload-session issuance;
- production upload activation;
- request-body admission or read;
- runtime activation;
- executable command-card issuance;
- conversion;
- Sandbox dispatch;
- retry or second live run;
- real-user commercialization; and
- commercial-readiness claim.

## Next gate

The next safe action is a separate live opening gate. That later gate must fill
the evidence packet SHA-256, reviewed source commit, executable command-card
SHA-256 and exact UTC start/expiry window. Unresolved placeholders are not
approval.

## Local validation

Run:

```sh
node scripts/cad-auth-durable-adapter-evidence-command-card-review-checker.js
node --test scripts/cad-auth-durable-adapter-evidence-command-card-review.test.js scripts/cad-auth-prod-durable-runner-adapter-prep.test.js scripts/cad-auth-upload-admission-readiness-rollup.test.js
node scripts/cad-convex-source-audit.js
node scripts/cad-convex-contract-manifest.js
```
