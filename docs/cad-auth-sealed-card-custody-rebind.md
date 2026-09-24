# CAD Auth sealed-card custody rebind

Source-only successor preparation after PR #400, merge
`fb36a99bc6e0ba40551766bbb6558c7d044b13d7`.

This is the current source-only preparation entry point. It binds
`cad-auth-receipt-custody-binding-v1` and validates the complete receipt-bundle
and command-card source chain. The older sealed-card preparation stays immutable
as historical provenance; its target, window, proposed identities and approval
phrase cannot be reused by this packet. The new operational slots and exact
approval phrase remain null. The inherited MISSING_PREREQUISITE stop remains
consumed. Zero runs are authorized.

All eight receipt categories retain their missing status, null references,
digests and evidence. Custodian, preparer, independent reviewer and deletion-owner
assignments remain empty. Independent review requires separation from custodian
and preparer, resolved conflicts, provenance and exact stored-byte SHA-256 review.
Seven-day retention begins only at separately authorized receipt creation; expiry
or unresolved disposition blocks use. Deletion requires separate authority.
Immutable commit/deployment rechecks are required before a future card proposal
and again before a future run. A repository hash proves no installed runtime.

The public payload seal covers these requirements and empty slots only. It is
neither a receipt digest nor an executable command-card seal. Populating even a
plausible receipt, target, command, window or approval fails this checker. The
checker reads fixed public repository files only and never resolves receipt refs.
`--write` regenerates only this public template. There is no promotion mode.

## Review sequence

1. Captain reviews this source-only rebind and its integrity checks.
2. Any restricted receipt creation, collection, installation or use needs separate
   scoped authority; this packet requests no values.
3. Separately authorized independent review must satisfy all custody, receipt,
   retention, schedule/limits and immutable-target requirements.
4. Any future executable sealed-card proposal needs separate review and fresh
   exact approval. Passing this checker cannot satisfy those gates.

No live Auth/provider tests, provider/env/resource/billing changes, secret reads,
upload-session issuance, production uploads, body admission/read, conversion,
Sandbox dispatch, private CAD, commercialization, external messages, runtime
activation, executable card issuance, retry or second run is authorized.

## Local validation

```sh
node scripts/cad-auth-sealed-card-custody-rebind-checker.js
node --test scripts/cad-auth-sealed-card-custody-rebind.test.js scripts/cad-auth-receipt-custody-binding.test.js scripts/cad-auth-restricted-receipt-bundle.test.js scripts/cad-auth-command-card-source.test.js scripts/cad-auth-live-evidence-sealed-card-prep.test.js
node scripts/cad-convex-source-audit.js
node scripts/cad-convex-contract-manifest.js
git diff --check
```

These checks exercise only public source contracts. No live workflow or customer
data smoke, deployment, provider qualification or runtime activation is performed.
