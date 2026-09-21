# CAD Internal Admission Opening Review Packet

Status: not ready for activation review  
Base commit: `a81e217a223d810ee727d5b1e8841a40f82d8293`

This packet records the current upload-admission opening gap after the checker landed. It treats the current approval as permission to assemble a source-only review packet, not as production upload activation.

## Current State

- The route remains `POST /api/cad/user-import`.
- The default-closed switch is imported.
- `BODY_ADMISSION_AUTHORIZED` remains `false`.
- The endpoint still resolves to `USER_UPLOADS_DISABLED` after valid session checks and before body parsing.
- The latest production smoke for `qa=a81e217` stayed fail-closed.

## Why This Is Still Blocked

The opening checker can only say a bundle is ready to bring to a human approval gate. The checked-in template still fails that checker because the activation evidence slots are not filled.

Still missing:

- Reviewed runtime implementation commit accepted into activation readiness.
- Exact deployment and route receipt.
- Exact internal tester cohort and activation window.
- Separate explicit upload activation approval.
- Concurrent session revocation fence.
- Browser CSRF or native bearer transport review.
- Rollback session revocation evidence.
- Retention or deletion disposition.
- Private-file register and lockout evidence.
- Separate environment deployment and test approvals.
- Per-run cost and fee evidence.
- Separate conversion and Sandbox approval.

## What This Packet Authorizes

This packet authorizes source-only docs/tests, local validation, a draft PR, green-check merge, normal Vercel deployment from main, production fail-closed route smoke, and cleanup.

It does not authorize request body reads, production upload activation, conversion dispatch, Sandbox dispatch, provider/env/resource changes, store mutation, private CAD, real users, secrets, billing changes, or external messages.

## Next Human Gate

When the missing evidence exists, the next approval should name the exact reviewed commit, deployment, cohort, time window, rollback, retention, and cost evidence. It should still be admission-only and should still exclude conversion and Sandbox dispatch unless those are separately approved.
