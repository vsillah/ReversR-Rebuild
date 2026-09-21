# CAD Production Upload Activation Scope

Status: source-only scope ready  
Base commit: `a2f514c2de5a080f6b13fb8aba9b3328aeb88a0e`

We are not one toggle away from production upload activation.

The app now has a credible internal preview path: Mark or an internal tester can choose supported CAD files locally and inspect the rendered preview. That path is intentionally different from backend production upload. It does not prove production admission, storage, conversion, Sandbox dispatch, private-CAD handling, durable account history, or commercial fee readiness.

## Current State

- Local/browser and installed-app CAD preview are available for internal QA.
- `POST /api/cad/user-import` is mounted in production but remains disabled by design.
- `server/cadUserUploadRouter.js` still has `BODY_ADMISSION_AUTHORIZED = false`.
- A valid session still stops at `USER_UPLOADS_DISABLED`.
- No production upload executor, conversion path, Sandbox dispatch, provider storage path, or live activation switch is wired.
- The cost workbook still says fee-per-run and customer-fee readiness are not complete.

## Activation Levels

1. Local preview only: complete for internal preview. No backend upload, no conversion, no durable project history.
2. Internal production admission dry-run: next implementable gate. This would allow an approved internal cohort to hit production route admission/body validation during an exact window, without conversion, Sandbox dispatch, durable storage, private CAD, or real users.
3. Internal upload plus conversion: future gate. This would add bounded Sandbox conversion only after admission dry-run closeout and separate conversion/Sandbox approval.
4. Private or commercial upload: blocked. This requires private-CAD policy, durable history, retention, billing/fee evidence, and real-user readiness.

## Remaining Evidence Before First Production Admission

- Concurrent session revocation fence.
- Browser cookie/origin/CSRF review.
- Native bearer transport review.
- Supported deletion or bounded-retention disposition.
- Durable private-register and lockout plan.
- Environment/deployment/test approval split.
- Rollback session revocation evidence.
- Reviewed runtime implementation commit.
- Exact deployment, route, cohort, and time window.
- Explicit upload activation approval.
- Separate conversion and Sandbox approval split.
- Per-run cost evidence and fee readiness.

## Route Change Strategy

The next implementation should not flip `BODY_ADMISSION_AUTHORIZED` directly to `true`. It should introduce a reviewed server-owned activation adapter or manifest that defaults closed unless the exact approved deployment, route, cohort, window, and rollback receipt are present.

That first production-facing gate should be admission-only. It should accept an approved internal request body, validate it, produce sanitized receipts, and stop before conversion, Sandbox dispatch, durable CAD storage, or private-CAD handling.

## Rollback Requirements

- Close admission before drain or rollback.
- Verify the route returns `USER_UPLOADS_DISABLED` before parser, storage, or executor paths.
- Run the production fail-closed smoke after rollback.
- Retain unknown reservations until read-only reconciliation proves disposition.
- Record session revocation or expiry evidence before calling rollback complete.

## What This Packet Authorizes

This packet authorizes source-only docs/tests, local validation, a draft PR, green-check merge, normal Vercel deployment from main, production fail-closed route smoke, and cleanup.

It does not authorize external messages, production upload activation, conversion dispatch, Sandbox dispatch, private CAD, real users, provider/env/resource changes, usage or billing changes, or secrets.

## Next Recommended Gate

Source-only runtime implementation packet for an internal production admission dry-run switch while preserving the disabled default and excluding conversion or Sandbox authority.
