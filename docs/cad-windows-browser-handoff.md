# CAD Windows browser handoff for Mark

Status: source-only reviewer packet refresh. The earlier Windows-browser
correction email was sent after separate explicit approval. This refresh updates
the Mark handoff around the production desktop shell now live on `main`; it is
not a new send. No additional external message, production upload activation,
backend conversion, Sandbox dispatch, private CAD handling, provider setting
change or billing change is authorized.

## Reviewer Link

Use this live production desktop link for the next Mark review:

`https://reversr.vercel.app/?cadPreview=mark-dispenser-v1&cadPhase=input&qa=windows-desktop-handoff`

The requested test path is a Windows desktop browser, preferably Chrome or Edge.
The browser should use the full desktop workspace, not a phone-sized layout.

## Reviewer Instructions

Mark should:

1. Open the link in Chrome or Edge on Windows.
2. Click `Choose CAD file`.
3. Select an authorized CAD file from his computer.
4. Click `Render preview`.
5. Confirm whether the local 3D preview appears.
6. Try the orientation dial, top/bottom controls, and zoom controls.
7. Confirm whether dimensions, grid, fixed views, zoom persistence, and the
   desktop layout feel usable.
8. Use `Use public sample` only as a fallback comparison.

For this browser preview, IGES, STEP, and BREP are the formats expected to render
locally. The file picker also recognizes common CAD extensions such as STL, OBJ,
DXF, DWG, 3MF, SAT/SAB, Parasolid, SolidWorks, CATIA and JT, but those formats
may show preview-pending language rather than a rendered model in this internal
test path.

## What To Ask For If Something Fails

Ask Mark for:

- browser name and version if visible,
- Windows version if visible,
- file extension and approximate size,
- whether the file picker opened,
- whether `Render preview` appeared,
- whether the viewer opened,
- a screenshot or short clip of the failure.

Do not ask for private CAD. If Mark wants to test a file that is not already
public or approved for this review, keep that as a separate authorization gate.

## Known Limitations To Call Out

This is an internal preview, not commercial readiness. The test does not enable
or prove:

- production upload sessions,
- backend conversion,
- Sandbox processing,
- manufacturing/export output,
- private CAD workflows,
- fee or run-cost readiness.

The browser preview is meant to validate whether an authorized CAD file can be
selected locally, rendered into the desktop browser viewer when supported, and
inspected with the current controls.

## Walkthrough Recording Scope

The refreshed walkthrough for the next handoff should show the live production
desktop route, choosing the public authorized `Dispenser.IGS` fixture for
demonstration, rendering the preview, and using the desktop viewer controls. The
recording must not show private recipient details and must not perform a Gmail
send.

## Draft Follow-Up Copy

```text
Hi Mark,

Quick update before you test: the browser version now uses the full desktop
workspace on Windows instead of the narrower mobile-style layout.

Please use this link in Chrome or Edge on your Windows computer:
https://reversr.vercel.app/?cadPreview=mark-dispenser-v1&cadPhase=input&qa=windows-desktop-handoff

What I’d like you to test:
1. Click Choose CAD file.
2. Select an authorized CAD file from your computer.
3. Click Render preview.
4. Confirm whether the model appears.
5. Try the orientation dial, top/bottom controls, zoom controls, and reference
   views.
6. Let us know whether the dimensions, grid, fixed views, and desktop layout
   feel usable.

For this preview, IGES, STEP, and BREP are the formats we expect to render in
the browser. Other CAD formats may be recognized but may not render yet.

This is still an internal preview. We know it is not commercialization-ready:
production upload sessions, backend conversion, manufacturing/export output,
private CAD workflows, and fee/run-cost readiness are not enabled in this test.

If anything fails, please send the browser, Windows version if known, file
extension, approximate file size, and a screenshot or short screen recording.
```
