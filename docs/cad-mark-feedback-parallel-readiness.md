# CAD Mark feedback parallel-readiness packet

Status: source-only packet for continuing development while Mark reviews the
public/internal CAD preview path. Base:
`fee2efd5a1ab4afc3cdb76c4ab6e7cbd3f1a2827`. Expenses: USD 0.

## Handoff State

The prior Mark handoffs were sent to the approved Mark recipient reference with:

- production preview URL:
  `https://reversr.vercel.app/?cadPreview=mark-dispenser-v1&cadPhase=build&qa=003a370`
- public material: `Dispenser.IGS` plus matching reference images
- walkthrough attachment: included
- send evidence reference: `rrb-ref:captain-gmail-sent-message`

The checked-in packet deliberately uses recipient and receipt references rather
than storing the email address in source.

The current review path has changed. Mark should test the Windows desktop
browser path first, reached from a new correction email link:

`https://reversr.vercel.app/?cadPreview=mark-dispenser-v1&cadPhase=input&qa=windows-desktop-handoff`

The expected browser choices are `Choose CAD file` and `Use public sample`.
The primary requested test is `Choose CAD file` with an authorized CAD file on
Mark's Windows computer. IGES, STEP and BREP are the expected renderable
formats in this preview; other recognized CAD formats may stay preview-pending
instead of rendering. The expected result is a local 3D preview with dimensions,
grid, zoom controls and orientation controls. The file
contents stay in the browser-local preview path and do not prove production
upload, backend conversion or Sandbox processing.

The installed Android preview remains useful as a secondary internal test path,
but it is no longer the primary Mark handoff.

## What Mark Gates

Mark's feedback gates only the claims that depend on his domain review:

- rendered dispenser geometry credibility
- reference orientation and fixed-view mapping
- Windows browser upload-to-preview usability
- external stakeholder usefulness
- source interpretation corrections
- any statement that this CAD preview has been externally validated

Until his response is received, the preview can be called a public-material
review build. It cannot be called validated CAD, manufacturing-ready output or a
private/customer upload workflow.

## Mark-Facing Instructions

Sent correction subject:

`Updated ReversR CAD preview: please test in Windows browser first`

Sent correction body:

```text
Hi Mark,

Quick correction to simplify the testing path. Please test the browser version
on your Windows computer first instead of using the mobile app.

Open this link in Chrome or Edge on Windows:
https://reversr.vercel.app/?cadPreview=mark-dispenser-v1&cadPhase=input&qa=windows-desktop-handoff

Then:
1. Click Choose CAD file.
2. Select an authorized CAD file from your computer.
3. Click Render preview.
4. Confirm whether the model appears and whether the dimensions, grid, zoom and
   orientation controls are usable.
5. Try the public sample only if you want a fallback comparison.

This is still an internal preview. We know it is not commercialization-ready:
production upload, backend conversion, manufacturing/export output and private
CAD workflows are not enabled in this test.

If anything fails, please send the browser, Windows version if known, file
extension, approximate file size, and a screenshot or short screen recording.
```

## Recording Requirement

The Windows-browser walkthrough recording attached to the correction email
shows:

1. a draft email view with the exact link,
2. the link opening the browser preview,
3. `Choose CAD file`,
4. selecting the public authorized `Dispenser.IGS` fixture for the demonstration,
5. `Render preview`,
6. the 3D viewer opening,
7. basic zoom and orientation validation.

The recording is a reviewer aid. It is not additional send authority and does
not activate any production upload or conversion path.

## What Can Proceed In Parallel

Parallel work may continue when it stays source-only or preserves every current
disabled gate:

1. Public preview hardening
   - Use public or explicitly authorized materials only.
   - Avoid private CAD and product accuracy claims.
   - Keep the preview clear about test-only content without overloading the UI.
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
6. Browser tester diagnostics
   - Capture Windows/browser/file-picker/local-render signals without telemetry
     egress.
   - Do not infer backend upload, conversion or Sandbox failures from local
     preview symptoms.

## Feedback Intake Model

For any Mark response, capture the minimum useful facts before changing source:

- Windows version if visible
- browser name and version if visible
- file name, extension and approximate file size
- whether the browser file picker opened
- whether the selected file appeared and the render button appeared
- whether the preview rendered
- what was visible on screen, with a screenshot or short clip when possible

Classify the feedback before acting:

| Class | Signals | Default handling |
| --- | --- | --- |
| Link/browser access | Page does not open, link blocked, stale build | Confirm URL, browser and production deployment before changing source. |
| File picker | No picker, picker cannot see CAD file, permission denial | Capture Windows/browser/file details and reproduce with public or synthetic files before changing backend gates. |
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

## Hard Stops

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
- external messages beyond the completed approved Mark correction send
- claims that Mark approved geometry before his response is received

## Next Recommended Gate

The Windows-browser handoff closeout now lives in
`docs/cad-windows-browser-handoff-closeout.json`. The next useful gate is
continued non-conflicting internal readiness work while Mark's feedback is
pending. Any further external message to Mark remains a separate approval gate.
