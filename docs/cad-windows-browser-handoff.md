# CAD Windows browser handoff for Mark

Status: source-only reviewer packet. The Windows-browser correction email was
sent after separate explicit approval, with the walkthrough MP4 attached. No
additional external message, production upload activation, backend conversion,
Sandbox dispatch, private CAD handling, provider setting change or billing
change is authorized.

## Reviewer Link

Use this link from the sent Mark correction email:

`https://reversr.vercel.app/?cadPreview=mark-dispenser-v1&cadPhase=input&qa=windows-browser-handoff`

The requested first test path is Windows desktop browser, preferably Chrome or
Edge.

## Sent Instructions

Mark should:

1. Open the link in Chrome or Edge on Windows.
2. Choose `Choose CAD file`.
3. Select an authorized `.igs` or `.iges` file from his computer.
4. Click `Render preview`.
5. Confirm whether the local 3D preview appears.
6. Try the orientation dial, top/bottom controls and zoom controls.
7. Confirm whether dimensions, grid, fixed views and zoom behavior feel usable.
8. Use `Use public sample` only as a fallback comparison.

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
selected locally, rendered into the browser viewer, and inspected with the
current controls.

## Walkthrough Recording Scope

The walkthrough attached to the sent correction email showed a draft email
page, clicking the production link, choosing a public authorized CAD fixture for
demonstration, rendering the preview and using the viewer controls. The
recording did not show private recipient details.
