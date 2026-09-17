# Dispenser guided visual review

Branch: `codex/cad-guided-review`

Worktree: `/Users/vambahsillah/.codex/worktrees/bbf2/ReversR-Rebuild`

Base: `75d75fb3d3abb70f2938c66ec063283ad3553ad9` (merged PR #303)

Exact local route: `http://localhost:5193/?cadPreview=mark-dispenser-v1`.
The authorized public dispenser now opens directly in the viewer. Use Compare,
Check and Receipt below the viewer. No account or service-status check is needed.

## Scope

- Compare original `Dispenser.IGS` identity, bytes, SHA-256 and imported X/Y/Z
  metadata with the existing calibrated display mesh and supplied references.
- Eight fixed-choice checks: source, references, orientation, rotation, zoom,
  clipping, contrast and mobile gestures. Each starts as Not tested; Pass and
  Issue are reviewer assertions, never inferred from clicking a control.
- Session storage is local to the browser tab. Stored receipts are versioned and
  bound to the source and display-mesh hashes. Invalid entries restore as untested.
- Copy, manual-copy fallback and JSON download contain allowlisted fixture metadata
  and check states only. No free text, identities, hostnames, URLs or tokens.
- Reset returns all checks to Not tested. A denied storage operation leaves an
  explicit in-memory-only notice. Missing mesh shows viewer-unavailable text and
  disabled viewer controls while the reviewer can still record an Issue.
- Existing six orientation mappings, camera, responsive wheel, zoom, gestures,
  neutral canvas, source assets and host boundary are unchanged.

This is visual review of one fixed public fixture. Imported extents are metadata,
not measurements. No dimensional/manufacturing certification, watertightness claim,
arbitrary-file fidelity, live Auth, enrollment, body admission, upload, conversion,
Sandbox dispatch, private CAD, backend persistence, external feedback submission,
production change, merge or deployment is qualified or performed by this slice.

## Validation

All checks passed against the exported app:

```sh
npm run typecheck
node --test scripts/cad-review-receipt.test.js scripts/cad-internal-tester-preview.test.js
EXPO_NO_DOTENV=1 npm run web:export
python3 -m http.server 5193 --bind 127.0.0.1 --directory dist
node scripts/cad-guided-review-smoke.js
CAD_PUCK_URL='http://localhost:5193/?cadPreview=mark-dispenser-v1' CAD_PUCK_EVIDENCE=/private/tmp/cad-guided-orientation-final node scripts/cad-orientation-puck-smoke.js
node scripts/cad-guided-review-walkthrough.js
git diff --check
```

- 13 focused tests passed, including source/reference byte hashes, allowed preview
  hosts, malformed storage, inherited/unknown fields and unsafe-value rejection.
- Full workflow: 1440×1000, 768×1000, 390×1000 and 320×1000. Source/reference
  downloads and links, every checklist state, clipboard success/failure, JSON
  download equality, reload restore, complete/reset, storage denial, keyboard
  activation, nested overflow, 44px buttons and bottom-navigation clearance.
  Follow-up assertions verify single-line wordmark/phase text without clipping,
  non-overlapping header controls, and working appearance/menu actions at all widths.
- Viewer regression: 1440×1000, 390×1000, 320×1000 and 855×904. All six views,
  reset, drag/wheel, Chromium touch rotation/pinch, active view, compact wheel
  fitting, floor/grid, Escape/focus return and persistent-navigation clearance.
- Failure path: blocked STL load and initial storage read denial still permit an
  issue receipt. Production hostname simulated with local files only: no fixture
  UI, no fixture requests, upload disabled. No live production requests.
- Full-workflow request guard observed zero API attempts and zero writes; two
  inherited shell external GET attempts per viewport (one per load/reload) were
  aborted. These are not new review requests. Viewer smoke also blocks external
  and API traffic in every context.

Visual review corrected a desktop layout that incorrectly assumed wide content:
ReversR's existing shell remains a narrow column. The viewer now uses that full
column at every viewport. At 320px, step names and three fixed-choice targets stay
on one row. Captain follow-up corrected the inherited narrow-shell branding and phase labels:
the workflow header now wraps controls onto a second row instead of shrinking the
wordmark, and reduced stepper-card side padding keeps Inventory fully visible at
320px. No shared stepper or CAD component changes were needed. New controls can
scroll fully above the persistent bottom navigation.

The dependency symlink initially generated the wrong Expo bundle. Validation uses
an isolated copy of the existing dependencies in this worktree; the final export
contains the guided-review component. No dependency or lockfile changes.

## Evidence and Human QA

`walkthrough.mp4` is 33.84 seconds, 600×1000, 25 fps, 846 frames. It combines the
actual desktop content-column crop and a padded mobile recording. No model frames
are substituted. Decoded final-video frames were inspected for legibility. The
recording script includes the exact FFmpeg command for reproducibility.

Representative screenshots cover viewer, comparison, checklist and receipt at
1440px and 390px, plus 768px checklist and 320px viewer/checklist. `results.json`
contains the sanitized workflow outcomes. Full temporary per-view screenshots and
recordings are in `/private/tmp/cad-guided-review-qa` and
`/private/tmp/cad-guided-orientation-final`.

Integrated Browser automation could not initialize because the configured writable
root `/Users/vambahsillah/Documents/ReversR` is a symlink. Playwright Chromium was
used on the exact exported route. This is not Safari or physical-device proof.

Human QA: open the local route, compare the supplied references using the wheel,
record Pass/Issue/Not tested, inspect/download the receipt, reload to confirm the
choices remain, then reset. Review the MP4 in the task and the 320px screenshots.
Remaining risks: subjective source/reference fidelity and contrast; physical
mobile gestures; Safari clipboard/download behavior. No hosted preview or live workflow/customer-data smoke was performed.

Next gate: Integration Captain review, then Human QA and separately authorized
integration/deployment. This lane stops at a draft PR. Expenses: USD 0.

## Captain responsive follow-up

Production code is limited to `app/index.tsx`: header flex wrapping, non-shrinking
brand text, right-aligned controls, smaller stepper-card side padding, and stable
test IDs. `scripts/cad-guided-review-smoke.js` adds text-fit/header regression checks.
All listed validation commands were rerun; all screenshots and the MP4 were
regenerated. The 320px and 390px shell was visually inspected, along with desktop,
tablet and final decoded-video frames. Guided-review behavior and CAD boundaries
are unchanged. PR #304 remains draft and this task stays open for Captain/Human QA.
