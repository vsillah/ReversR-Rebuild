# CAD Internal Admission Opening Bundle Checker

Status: source-only checker ready, switch still disabled  
Base commit: `256ab774763d7b039916276d40a47d7e631a42ad`

This slice adds a template and local checker for the future internal production upload opening bundle. It is a review tool, not an activation mechanism.

## What It Checks

- Every evidence slot from `docs/cad-internal-admission-evidence-binding.json` is present.
- Each future slot has a sanitized receipt reference and reviewer reference.
- The exact runtime commit, deployment route, cohort, window, transport, revocation fence, rollback, retention, private-register lockout, environment/test split, cost, conversion/Sandbox split, and post-rollback smoke references are present.
- The candidate remains admission-only and non-executable.
- Conversion, Sandbox dispatch, store mutation, private CAD, real users, external messages, and commercial-readiness claims remain off.

## What Ready Means

The checker can only report `readyForSeparateActivationApproval`. That means the bundle is complete enough to put in front of the next human gate. It does not open the route, authorize request body reads, or perform any provider action.

The checked-in template is intentionally incomplete and must fail readiness with `USER_UPLOADS_DISABLED`.

## Files

- Template: `docs/cad-internal-admission-opening-bundle-template.json`
- Checker: `scripts/cad-internal-admission-opening-bundle-checker.js`
- Tests: `scripts/cad-internal-admission-opening-bundle-checker.test.js`

## Preserved Boundaries

No production upload activation, request body reads, conversion dispatch, Sandbox dispatch, provider/env/resource changes, store mutation, private CAD, real users, secrets, usage/billing changes, or external messages are authorized by this checker.

## Next Recommended Gate

Prepare a sanitized candidate opening bundle for human approval review only. Execution remains blocked until a separate explicit production upload activation approval is granted.

## Current Commit Review

Historical `check` completeness does not establish freshness. Use `check-current <full-reviewed-merge-commit>` for the [PR #380 current-commit rebind](cad-internal-admission-current-commit-rebind.md). It checks source digests, smoke and bridge bindings and keeps activation readiness false.
