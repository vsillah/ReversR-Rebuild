# CAD Auth command-card source packet

Status: source-only. This packet prepares the disabled command-card and receipt
structure needed after the approved September 24, 2026 evidence window stopped
with `MISSING_PREREQUISITE`. It does not emit a command line, seal an executable
card, run live evidence, issue upload sessions, or activate upload admission.

The disabled preparation source is
`offline/cad-auth-command-card-source/preparation.js`. It defines the receipt
shape, validates the PR #397 source-only collector-binding parent, and keeps
every runtime binding missing by default. It has no command-line emission path
and no execution authority until a separately reviewed receipt bundle and fresh
executable command-card gate exist.

## Required receipts

- Concrete provider runtime binding.
- Executable collector command design.
- Restricted synthetic cohort receipt.
- Custody and independent reviewer receipt.
- Durable consumed-run ledger.
- Installed route/body observer.
- Late-grant observer.
- Immutable target recheck receipt.

The command-card approval phrase is intentionally a template, not an executable
instruction. It cannot become exact until the restricted receipt refs and digests,
fresh immutable deployment, UTC window, custodian and independent reviewer values
are all reviewed in a later gate.

## Local validation

```sh
node scripts/cad-auth-command-card-source-checker.js
node --test scripts/cad-auth-command-card-source.test.js scripts/cad-auth-live-collector-binding.test.js
node scripts/cad-convex-source-audit.js
node scripts/cad-convex-contract-manifest.js
git diff --check
```

No live Auth/provider tests, provider/env/resource/billing changes, secrets or
secret reads, upload-session issuance, production upload activation, request-body
admission/read, conversion, Sandbox dispatch, private CAD, real-user
commercialization, external messages, retries, second run, runtime activation,
executable command-card issuance or commercial-readiness claim is authorized by
this packet.
