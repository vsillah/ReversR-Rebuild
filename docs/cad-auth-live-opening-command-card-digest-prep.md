# CAD Auth live-opening command-card digest preparation

Status: source-only, sanitized and non-executable. This packet resolves the
command-card SHA-256 and proposes a UTC opening window for a later explicit
live upload-admission opening gate.

It does not issue a command card, issue an upload session, activate production
upload admission, read request bodies, dispatch conversion or Sandbox work, use
private CAD, collect live evidence, change provider configuration or claim
commercial readiness.

## Bound inputs

The packet binds:

- durable adapter evidence command-card review packet
  `c857f4fd982dbdfb113450920e88f25841f5e21b25f9ed515232d1b49b9420ce`;
- durable adapter packet
  `783fc44dc5b052f7f6d2da933e8d32c09ab11a872ba3f9d2a027db173a16d285`;
- production deployment reference
  `https://vercel.com/vsillahs-projects/reversr/HtpRhuWPbhBnaV7kejXrs4jDzHJp`;
- production target `https://reversr.vercel.app POST /api/cad/user-import`;
- cohort `rrb-ref:cad-upload-internal-mark-test-cohort-v1`; and
- proposed UTC window `2026-09-26T21:00:00Z` through
  `2026-09-26T21:30:00Z`.

## Digest boundary

The command-card digest is computed over a non-executable draft that contains
only source-only refs, hashes, counts, controls and null command material. The
draft has no command line, no executable card body, no runtime credential source,
no provider mutation, no upload-session issuance and no request-body read.

The digest does not authorize live use. The later live gate must repeat the
digest and window in the exact approval phrase.

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

The next safe action is the separate live opening gate. That later gate must use
the exact command-card SHA-256 from the generated JSON packet, the proposed UTC
window and the explicit production route and cohort. The populated phrase is
stored in `nextLiveOpeningGate.exactPhrase` for review.

## Local validation

Run:

```sh
node scripts/cad-auth-live-opening-command-card-digest-prep-checker.js
node --test scripts/cad-auth-live-opening-command-card-digest-prep.test.js scripts/cad-auth-durable-adapter-evidence-command-card-review.test.js scripts/cad-auth-prod-durable-runner-adapter-prep.test.js scripts/cad-auth-upload-admission-readiness-rollup.test.js
node scripts/cad-convex-source-audit.js
node scripts/cad-convex-contract-manifest.js
```
