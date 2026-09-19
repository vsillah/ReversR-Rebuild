# CAD Mark feedback parallel-readiness packet

Status: source-only packet for continuing development while Mark reviews the
public/internal Dispenser IGES preview path. Base:
`223820ec2a4dc62ab2925af918497a28f3af5e02`. Expenses: USD 0.

## Handoff state

The Mark handoff has been sent to the approved Mark recipient reference with:

- production preview URL:
  `https://reversr.vercel.app/?cadPreview=mark-dispenser-v1&cadPhase=build&qa=003a370`
- public material: `Dispenser.IGS` plus matching reference images
- walkthrough attachment: included
- send evidence reference: `rrb-ref:captain-gmail-sent-message`

The checked-in packet deliberately uses recipient and receipt references rather
than storing the email address in source.

The current review path is the installed Android internal IGS upload-render
preview, reached through `Import` -> `Open internal IGS preview`. The correction
handoff points Mark to the direct APK artifact reference
`rrb-ref:final-correction-direct-apk-link`; the source packet does not store the
recipient address. The expected in-app choices are `Choose IGES file` and
`Use public sample`. The expected result is a local 3D preview with dimensions,
grid, zoom controls and orientation controls.

The installed app embeds the production-hosted public renderer route:

`https://reversr.vercel.app/?cadPreview=mark-dispenser-v1&qa=native-internal-upload-render`

The verified EAS update group for the corrected JS bundle is
`81bf6888-3840-471e-b1c1-422e35d8fe0f`, and the Android preview build remains
versionCode `52`. This records the current tester path only. It does not turn on
production upload sessions, backend conversion, Sandbox processing, private CAD
handling or commercial CAD output.

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
5. Feedback intake and triage
   - Prepare the issue taxonomy and response boundaries for Mark's review.
   - Do not send a new external message from source-only work.
   - Do not ask Mark for private CAD in this review path.
6. Internal tester diagnostics
   - Prepare support-safe diagnostics for installed-app internal IGS preview
     issues.
   - Capture device/app/file-picker/local-render signals without telemetry
     egress.
   - Do not infer backend upload, conversion or Sandbox failures from local
     preview symptoms.

## Feedback intake model

For any Mark response, capture the minimum useful facts before changing source:

- device model and Android version if visible
- app install source and whether the direct APK path was used
- file name, extension and approximate file size
- whether the Android file picker opened
- whether the selected file appeared and the render button appeared
- whether the preview rendered
- what was visible on screen, with a screenshot or short clip when possible

Classify the feedback before acting:

| Class | Signals | Default handling |
| --- | --- | --- |
| Install/update | `Live upload locked`, `Internal preview unavailable`, missing internal preview entry | Confirm APK install path, relaunch/update state and installed-app bundle before changing source. |
| File picker | No picker, picker cannot see IGES file, permission denial | Capture Android picker/device details and reproduce with public or synthetic files before changing backend gates. |
| Local render | Render button fails, blank preview, missing dimensions/model | Treat as local renderer/file compatibility; do not infer backend upload or conversion failure. |
| CAD interpretation | Geometry looks wrong, orientation confusing, dimensions unexpected | Route to source/fixture interpretation review and keep external validation claims blocked. |
| Commercial readiness | Questions about production uploads, private CAD or manufacturing output | Answer from remaining gates; do not imply production activation or commercialization readiness. |

Response rules:

- do not ask Mark for private CAD in this review path
- do not request production credentials or account enrollment
- do not claim a backend upload, conversion or Sandbox failure from a local
  preview symptom
- preserve direct recipient details as local/email evidence references rather
  than source text

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

The next useful source-only gate is internal tester diagnostics and
support-readiness. That work should make the installed-app review path easier to
support while Mark's feedback is pending, without activating CAD upload,
conversion, Sandbox, private CAD or real-user paths.
