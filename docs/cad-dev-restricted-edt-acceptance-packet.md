# CAD restricted E/D/T acceptance packet

Base: `5e02943f9dd8527c27ea9f6b3654661d9324c620`, after PR #232.
Branch: `codex/cad-dev-restricted-edt-acceptance-packet`.
Status: partial source-planning acceptance with live mutation still blocked.
Expenses: USD 0.

This packet records a source-safe projection of ignored local E/D/T receipts. It
accepts the receipt shape for planning only. It does not authorize live Auth,
env mutation, deployment, store writes, upload activation, conversion or private
CAD.

## Accepted For Planning

- Value-free custody refs for `JWKS`, `JWT_PRIVATE_KEY` and `SITE_URL`.
- Env rollback ref shape without reading or storing row values.
- Reviewed retention and lockout digests.
- No-delete retained-state custody requirement.
- Current source SHA for a future development deployment gate.

## Fresh Read-Only Usage Evidence

- Function call disable limit remains `100 calls` per day.
- Current usage is `17 calls` for the day and `30 calls` for the month.
- Compute, storage and egress rows remain zero in the read-only refresh.
- Usage limits were observed active and untriggered.

This still does not prove the team-level all-in spending cap, taxes/fees or
provider lag. Cost-cap uncertainty remains a hard stop before any development
mutation.

## Hard Stops Remaining

- Team all-in spending cap is unverified.
- Backup custodian is not named for live mutation.
- Durable development release ID is not bound.
- Pinned deploy and rollback command digests are not bound.
- Fresh future UTC run window is not accepted.

## Next Safe Action

Continue only with read-only or source-only evidence unless the cost cap, backup
custodian, deployment rollback and run-window evidence are concrete. No
development env mutation, deployment, live Auth/session run, store mutation,
upload activation, conversion, private CAD, retry or second run is authorized by
this packet.

## Validation

```sh
node --test scripts/cad-dev-restricted-edt-acceptance-packet.test.js
node --test scripts/cad-dev-restricted-edt-evidence-prep.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```
