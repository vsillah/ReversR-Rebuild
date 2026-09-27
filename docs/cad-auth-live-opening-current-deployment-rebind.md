# CAD Auth live-opening current-deployment rebind

Status: source-only, sanitized and non-executable. This packet rebinds the
reviewed command-card digest draft to the current production deployment observed
after the runtime mount prep merge.

It does not issue a command card, issue an upload session, activate production
upload admission, read request bodies, dispatch conversion or Sandbox work, use
private CAD, collect live evidence, change provider configuration or claim
commercial readiness.

## Bound inputs

The packet binds:

- live-opening runtime mount prep packet
  `24d3a96fc431f2a23e14724f4b8c061e8fefaa3cbbb97c4832b6a8d570f10346`;
- prior command-card digest prep packet
  `53aab3bab61f99b8d995236096440ae838f706c25e5e9cf4bb30639faf5bad81`;
- current production deployment reference
  `https://vercel.com/vsillahs-projects/reversr/CyBjkXRmZsWuw3q4LS3gcnCweMRL`;
- production target `https://reversr.vercel.app POST /api/cad/user-import`;
- cohort `rrb-ref:cad-upload-internal-mark-test-cohort-v1`; and
- proposed UTC window `2026-09-27T18:00:00Z` through
  `2026-09-27T18:30:00Z`.

## Rebind boundary

The command-card digest is computed over a non-executable draft that repeats the
existing durable adapter and readiness evidence, supersedes the stale deployment
reference from the prior digest packet, and binds the current production
deployment reference above.

The digest does not authorize live use. The later live gate must repeat the
current deployment reference, digest and window in the exact approval phrase.

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
the exact current-deployment rebind packet SHA-256, source commit,
command-card SHA-256, deployment reference and UTC window from the generated JSON
packet. The approval phrase template is stored in
`nextLiveOpeningGate.exactPhraseTemplate`; it intentionally leaves only the
packet SHA-256 and source commit unresolved until this packet is committed and
reviewed.

## Local validation

Run:

```sh
node scripts/cad-auth-live-opening-current-deployment-rebind-checker.js
node --test scripts/cad-auth-live-opening-current-deployment-rebind.test.js scripts/cad-auth-live-opening-runtime-mount-prep.test.js scripts/cad-user-upload-admission.test.js
node scripts/cad-convex-contract-manifest.js
```

The broader `cad-convex-source-audit` is not used as this packet's acceptance
check because it currently stops on an older
`cad-production-auth-verifier-acceptance` packet before reaching this rebind.
