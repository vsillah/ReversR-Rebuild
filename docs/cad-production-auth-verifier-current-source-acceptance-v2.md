# Production Auth verifier current-source acceptance successor v2

Status: source-only; production verifier evidence remains uncollected and unaccepted. Current-main lineage: `7a41d2abf14f900637aaa0be496a4f37ca8613a4` (after PR #492).

This successor binds the unchanged pending verifier-evidence requirements to current repository sources. It does not replace or rewrite the September [historical packet](cad-production-auth-verifier-acceptance.json), whose SHA-256 remains `31d1368957f770c423c903644decbc8043ac076a0dd8d76edfc3105a9643176f`.

## Lineage

PR #480 changed `server/cadUserUploadRouter.js` in source commit `078f67889a7284939c18add425a3f6df7aebe4f5`, merged as `f42c2d8a4f489856582aa33962b795f78f610fc3`. The router's current SHA-256 is `505edcadacc870be65d9ef7db72bfdcc3eeb9fa72b4802c225a163b1532dee7d`. Current main `7a41d2abf14f900637aaa0be496a4f37ca8613a4` contains both commits, and the seven verifier-bound source files are byte-identical to the earlier `714dce380497d25d19c8653e7bcf3c93105a4f0a` baseline.

The v1 packet remains historical and non-reusable. Its approval references cannot be transferred, and every expired window remains expired. This v2 packet also conveys no provider acceptance, runtime authority, upload-session issuance, body admission, deployment, upload, conversion, Sandbox dispatch, private-CAD use, retry, external message, or commercial-readiness claim.

The broad source audit validates this successor as the active source contract. Thirty-six packet/checker pairs whose semantic checks fail solely because their source bindings are commit-bound now have a fixed, non-regenerating SHA-256 allowlist derived from baseline `714dce380497d25d19c8653e7bcf3c93105a4f0a`. Exact bytes, path uniqueness, existence, and historical classification are checked on every audit. The still-valid `cad-auth-live-opening-command-card-digest-prep` semantic assertion remains active. A future historical change requires deliberate source review; no automatic refresh mode exists.

## Deterministic generation and validation

The checker reads only the fixed historical packet and seven allowlisted repository sources. It verifies the historical packet's exact digest before inheriting its twelve pending evidence requirements. `--write` regenerates only the fixed v2 packet path; every other argument fails closed.

```sh
node scripts/cad-production-auth-verifier-current-source-acceptance-checker.js --write
node scripts/cad-production-auth-verifier-current-source-acceptance-checker.js
node --test scripts/cad-production-auth-verifier-current-source-acceptance.test.js
node scripts/cad-convex-source-audit.js
node scripts/cad-convex-contract-manifest.js
```

No historical packet, approval, receipt, or expired window is regenerated. Next gate: Captain source review only. Any provider evidence collection or runtime step requires separate fresh authorization.
