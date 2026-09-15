# CAD restricted E/D/T evidence prep

Base: `9c77d01a83815e48c4dac68f36ec4b81ea3f1838`, after PR #231.
Branch: `codex/cad-dev-restricted-edt-evidence-prep`.
Status: source-only restricted evidence requirements; no live Auth, env mutation,
deployment, store write, upload activation, conversion or private CAD.
Expenses: USD 0.

This packet turns the E/D/T blocker list into a source-safe checklist for the
next restricted local evidence bundle. It does not accept the evidence yet and
does not authorize any development mutation.

## What this prepares

- Value-free custody receipts for `JWKS`, `JWT_PRIVATE_KEY` and `SITE_URL`.
- Row-specific env rollback receipts without reading or recording row values.
- A bounded cost-cap proof template with USD 5 recommended all-in ceiling and
  the blanket hard stop at or above USD 10.
- Durable development deployment and rollback evidence placeholders.
- Retention and lockout digest bindings from the already reviewed source files.
- A fresh future UTC run-window template for one development-only Auth/session
  qualification attempt.

## What remains blocked

- No secret value read, generation, storage or rotation is authorized.
- No Convex env row add, edit, delete or overwrite is authorized.
- No provider/auth/resource configuration is authorized.
- No development deployment or live Auth/session run is authorized.
- No CAD upload activation, conversion, Sandbox dispatch, private CAD, real-user
  enrollment or external message is authorized.

## Next automated source slice

The next branch is `codex/cad-dev-restricted-edt-acceptance-packet`.

That slice should prepare ignored local receipts and a source-safe projection for
secret custody, env rollback, cost cap, deployment rollback, retained-state
custody, lockout acceptance and one future development-only Auth/session run
window. It must still stop before env mutation, deployment or a live run until
the complete acceptance bundle is concrete.

## Validation

```sh
node --test scripts/cad-dev-restricted-edt-evidence-prep.test.js
node --test scripts/cad-dev-auth-acceptance-manifest.test.js
node scripts/cad-convex-contract-manifest.js
node scripts/cad-convex-source-audit.js
git diff --check
```
