# CAD Internal Admission Cohort And Window Packet

Status: cohort/window draft only, uploads disabled  
Base commit: `f712cc98712284a35006c2fa576d78370bf3b667`

This packet narrows the future internal upload-admission opening to a named internal tester cohort and a one-window shape. It does not accept the cohort, set a start or expiration time, open the route, read request bodies, or activate production upload.

## Draft Cohort

- Cohort ref: `rrb-ref:cad-upload-internal-mark-test-cohort-v1`
- Participant refs: `rrb-ref:cad-upload-internal-tester-reviewer-mark`
- Max concurrent upload sessions: 1
- Max upload attempts: 1
- Materials: public, synthetic, or explicitly authorized internal tester CAD only

This is still a draft. It is not accepted activation evidence.

## Draft Window Shape

- `startsAtUtc`: not set
- `expiresAtUtc`: not set
- Maximum duration: 60 minutes
- Retry: false
- Second run: false
- Stop on unknown outcome: true

The next human gate must name exact UTC start and expiration values. Expired windows require fresh approval.

## Preserved Boundaries

`BODY_ADMISSION_AUTHORIZED` remains `false`. This packet does not authorize request body reads, production upload activation, conversion dispatch, Sandbox dispatch, provider/env/resource changes, store mutation, private CAD, real users, secrets, billing changes, or external messages.

## Next Recommended Gate

Fill the opening bundle with exact UTC `startsAtUtc` and `expiresAtUtc` values, plus the remaining rollback, transport, retention, and cost evidence, then bring that bundle to a separate human approval gate. Execution remains blocked.
