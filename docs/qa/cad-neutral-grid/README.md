# Neutral CAD viewer and mobile shell QA

Draft PR #304, branch `codex/cad-guided-review`.
Worktree: `/Users/vambahsillah/.codex/worktrees/bbf2/ReversR-Rebuild`.
Baseline: merged PR #303, `75d75fb3d3abb70f2938c66ec063283ad3553ad9`.

## Final product scope

The Mark-specific Compare/Check/Receipt workflow is removed, including its
component, receipt utilities, tests, workflow scripts and obsolete QA artifacts.
`CadImportPanel.tsx` is byte-identical to the pre-PR baseline. No new customer
checklist, reviewer identity, receipt or feedback-persistence feature is included.

The existing authorized Mark fixture route is a **non-production fixture harness**,
retained from PRs #302/#303. Open
`http://localhost:5193/?cadPreview=mark-dispenser-v1` and click **Review qualified
result**. This harness and its references are QA tools, not the final customer
review workflow. Production fixture gating and source assets are unchanged.

The general workflow header still preserves a full single-line REVERSR wordmark
and complete phase labels at 320/390px. Header controls wrap to a second row when
needed. This fix is generic product UI, independent of fixture query parameters.

## Viewer treatment

- One neutral `#aaaaaa` matte Lambert material for every view; dark neutral edges.
  White ambient light and white key/fill lights attached to the camera replace
  green/blue world lights. No orientation handler changes any material or color.
- A light blue-gray background separates the neutral model from the canvas.
  The shadow floor and corner grid cue are replaced by a real scene grid behind
  the entire model bounding sphere.
- The grid is view-aligned: fixed views reorient the plane to the camera; manual
  model rotation leaves the view plane stable. It shares camera zoom/projection.
  Grid spacing is based on the normalized display radius, not source units or
  measured dimensions. The viewport has no persistent grid label or grid toggle;
  this QA documentation carries the non-dimensional explanation.
- Fixed-view mappings, perspective projection, compact wheel and camera clearance,
  model fitting, direct drag, wheel/pinch zoom, reset and no auto-rotation remain.

## Validation

All commands passed on the final exported route:

```sh
npm run typecheck
node --test scripts/cad-internal-tester-preview.test.js scripts/cad-viewer-presentation.test.js
EXPO_NO_DOTENV=1 npm run web:export
python3 -m http.server 5193 --bind 127.0.0.1 --directory dist
CAD_PUCK_URL='http://localhost:5193/?cadPreview=mark-dispenser-v1' CAD_PUCK_EVIDENCE=/private/tmp/cad-neutral-grid-final node scripts/cad-orientation-puck-smoke.js
node scripts/cad-viewer-walkthrough.js
git diff --check
```

13 focused tests cover exact fixture hashes, host denial, fixed materials/white
camera-relative lighting, normalized non-metrology grid spacing/lifecycle, absence
of persistent grid text, and absence of the rejected workflow.
The browser smoke covers 1440×1000, 768×1000, 390×1000, 320×1000 and 855×904:

- All seven views, selected-view state, keyboard wheel/Escape, 44px wheel targets,
  compact fit, desktop drag/wheel, mobile touch rotation/pinch, zoom and reset.
- Real WebGL pixels (canvas PNG readback), rather than only DOM assertions:
  neutral model pixels, grid pixels in every view, at least 35 channel-value units
  between background red and median model brightness, fitted-model frame margins,
  and at most 30 units of median brightness variation across fitted views.
- Measured medians span 156–177 on desktop/tablet and 157–177 on mobile, including
  manual rotation. Minor shading changes describe form; the material has no hue
  shifts. These thresholds are rendering regressions, not metrology or proof of
  arbitrary-model fidelity. Sanitized measurements are in `results.json`.
- Identical stationary frame readbacks verify no auto-rotation. Reset restores
  isometric, zoom 1.0 and standard grid framing. No horizontal page overflow;
  the expanded wheel clears persistent navigation at 855×904.
- Single-line untruncated wordmark and all four phase labels at every tested width.
- Production hostname simulated locally with static files: no fixture viewer,
  no fixture asset requests, upload disabled. No live production request.

External and API requests are blocked in every browser context. Each main viewport
attempted one inherited shell external GET, which was aborted. No CAD upload,
conversion, Sandbox, private CAD, live account or production mutation was used.

## Human QA evidence and limits

`walkthrough.mp4`: 25.80 seconds, 600×1000, 25 fps, 645 frames. Actual exported
route, desktop content-column crop then padded mobile, covering all fixed views,
manual rotation, wheel/pinch and reset. No model imagery is substituted. The
recording script includes the FFmpeg command; decoded final frames were inspected.

`desktop-*.png` includes all six fixed views, initial isometric, manual rotation
and reset. `320-*.png` and `390-*.png` show collapsed viewer, expanded Left view,
manual rotation and generic shell readability. `1440-harness.png` and
`390-harness.png` show the real non-production fixture route with supplied images.
Temporary full recordings/screenshots: `/private/tmp/cad-neutral-grid-final`.

Human QA should judge whether neutral shading, visible edges and the grid make
shape/orientation clear on the actual route. The grid is a view-plane guide, not
an object-attached or certified measuring workplane. Physical-device/Safari and
other GPU rendering remain untested. Automated integrated Browser control is
blocked by the configured symlinked writable root; Playwright Chromium provided
actual-route evidence. No new geometry fidelity, watertightness, dimensional or
manufacturing claim is made.

Next: Captain review and Human QA. PR remains draft; no ready, merge, deployment,
activation or task/worktree cleanup. Expenses: USD 0.
