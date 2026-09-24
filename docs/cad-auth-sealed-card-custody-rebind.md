# CAD Auth sealed-card custody rebind

This packet is source-only and non-executable. It ties the historical
`cad-auth-live-evidence-sealed-card-prep-v1` artifact to the newer restricted
receipt and custody binding requirements merged at
`fb36a99bc6e0ba40551766bbb6558c7d044b13d7`.

The historical sealed card remains useful as a record of the earlier acceptance
shape, but its exact approval text, window, deployment observation and seal are
not reusable for execution. This packet therefore leaves every future receipt,
digest, immutable deployment recheck, UTC window, schedule digest, limits digest
and exact approval phrase empty.

## Required successor work

Before any executable command-card can even be proposed, a later packet must:

- bind restricted receipt refs and SHA-256 digests outside Git;
- verify custodian, preparer, independent reviewer and deletion-owner roles;
- validate retention and deletion disposition;
- independently recompute receipt digests from exact stored bytes;
- recheck the immutable production deployment target after this source merge;
- bind a fresh UTC window and schedule/limits digest; and
- generate a new non-executable sealed card proposal before asking for a later
  exact approval phrase.

This packet creates no restricted values, accepts no receipts, installs no
runtime configuration, issues no upload sessions, reads no request bodies, opens
no provider/Auth evidence collection, and authorizes no retry or second run.

## Local validation

Run:

```sh
node scripts/cad-auth-sealed-card-custody-rebind-checker.js
node --test scripts/cad-auth-sealed-card-custody-rebind.test.js
```

Passing validation means only that the source-only rebind remains internally
consistent and fail-closed.
