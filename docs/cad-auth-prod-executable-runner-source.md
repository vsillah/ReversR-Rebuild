# CAD Auth production executable runner source contract

This is the source-only bridge after the blocked live opening attempt. It does
not open production upload admission. It defines the production runner adapter
surface, command-card shape, exact-window checks, rollback order and smoke
requirements that a later live gate must bind before any effect can run.

The packet remains disabled by default:

- no runtime mount
- no default adapter
- no command-card issuance
- no upload session issuance
- no body admission or body read
- no conversion or Sandbox dispatch
- no private CAD, provider changes, secrets, external messages, retries or
  commercialization claim

## Validation

Run:

```sh
node scripts/cad-auth-prod-executable-runner-source-checker.js
node --test scripts/cad-auth-prod-executable-runner-source.test.js
node scripts/cad-convex-source-audit.js
node scripts/cad-convex-contract-manifest.js
```

`--write` regenerates only the public JSON packet. The checker accepts no
approval strings, runtime flags, arbitrary paths or live execution options.

## What this closes

The prior opening-preparation packet explicitly said no production runner or
adapter was supplied. This packet supplies a reviewable source contract for that
missing piece: the effect names, expected sanitized return shape, exact window,
command-card fields, rollback ordering and post-rollback smoke contract.

It does not supply provider configuration or live adapter evidence, and it does
not make the route live. A later gate still needs a fresh command card digest,
immutable deployment/run/cohort/window binding, adapter evidence, independent
expiry proof, durable run ledger proof and explicit separate authority for
session issuance, runtime activation and body admission.

## Next gate

Next safe gate: reviewed live command-card issuance and runtime activation
preparation. Stop before live execution if any provider/env/resource change,
secret, credential, missing adapter evidence or unknown outcome appears.
