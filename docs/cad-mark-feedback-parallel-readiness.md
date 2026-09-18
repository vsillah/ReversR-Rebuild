# CAD Mark feedback parallel-readiness packet

Status: source-only packet for continuing development while Mark reviews the
public Dispenser IGES preview. Base:
`003a370b5286c4f1f40f7102a4b4014e1148fc64`. Expenses: USD 0.

## Handoff state

The Mark handoff has been sent to the approved Mark recipient reference with:

- production preview URL:
  `https://reversr.vercel.app/?cadPreview=mark-dispenser-v1&cadPhase=build&qa=003a370`
- public material: `Dispenser.IGS` plus matching reference images
- walkthrough attachment: included
- send evidence reference: `rrb-ref:captain-gmail-sent-message`

The checked-in packet deliberately uses recipient and receipt references rather
than storing the email address in source.

## What Mark gates

Mark's feedback gates only the claims that depend on his domain review:

- rendered dispenser geometry credibility
- reference orientation and fixed-view mapping
- external stakeholder usefulness
- source interpretation corrections
- any statement that this CAD preview has been externally validated

Until his response is received, the preview can be called a public-material
review build. It cannot be called validated CAD, manufacturing-ready output or a
private/customer upload workflow.

## What can proceed in parallel

Parallel work may continue when it stays source-only or preserves every current
disabled gate:

1. Public preview hardening
   - Use public materials only.
   - Avoid private CAD and product accuracy claims.
   - Keep the preview clear about test-only content.
2. Upload/session UX
   - Improve disabled upload/session language and recovery paths.
   - Keep `BODY_ADMISSION_AUTHORIZED = false`.
   - Do not read upload bodies or activate production uploads.
3. Cost attribution planning
   - Prepare per-CAD-run cost breakdowns across Convex, Vercel, Sandbox,
     storage, compute, backup, egress, taxes/fees/FX and contingency.
   - Do not change billing settings or create paid commitments.
4. Implementation readiness
   - Prepare the next Build-phase information architecture.
   - Keep manufacturing packages, STL/export certification and conversion
     dispatch locked.

## Hard stops

Stop before any of the following:

- unknown outcome
- failing production smoke
- private CAD
- real-user enrollment
- production upload activation
- production conversion
- Sandbox dispatch
- provider, auth, resource or environment changes outside the approved
  development target
- usage or billing changes
- new paid commitments at or above the approved cap
- external messages beyond the already approved Mark handoff
- claims that Mark approved geometry before his response is received

## Next recommended gate

The next useful source-only gate is cost attribution and implementation
readiness planning. That work should convert the remaining high-level blockers
into a fee-per-run model and a Build-phase readiness surface without activating
CAD upload, conversion, Sandbox, private CAD or real-user paths.
