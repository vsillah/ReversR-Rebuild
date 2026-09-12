# CAD Import UX — gated preview

Branch: `codex/cad-import-ux`. Base: `2899bcd340d8bd905d0d93005207c46a975967df` (PR #163).

Home and Phase One share the ordered Import / Scan / Describe / Sample definition. Home actions open the matching input mode, including when a current project exists. Generic New actions default to Describe. Resume and guided-tour actions clear the explicit entry choice so saved camera input retains its existing behavior.

Import supports browser file selection for `.igs` and `.iges`, including uppercase extensions. It rejects empty and unsupported selections. Only format and byte count are retained in component memory. Names, paths, contents, credentials and conversion output are neither persisted nor logged. The file input is cleared after selection; Clear selection removes retained metadata. Native and browser surfaces without File support explain the unavailable picker and next step.

The only CAD request is an explicit, unauthenticated GET to `/api/cad/capabilities`, with no body, no credentials, no cache and an eight-second timeout. Results are reduced to fixed user-facing status copy. Status success never unlocks upload. The upload control stays disabled with an operator-access explanation, and the ordinary scan submit button is absent in Import mode. No upload or worker dispatch path was added.

## Minimal follow-up backend contract

A future session-safe upload route must authenticate a user session on the server, authorize that user for the approved CAD rollout, enforce CSRF/origin protection where cookie sessions apply, validate IGES format and enforce bounded request size before dispatch. Apply per-user rate/concurrency limits and an enforceable execution budget. The server owns all worker/operator credentials; clients must never receive or supply an operator token. Preserve existing Sandbox resource, networking, cleanup and qualification gates. Do not implement a publicly callable proxy that merely attaches the existing operator token.

Expose a small user-safe capability response that separately reports rollout access and service availability. Return bounded errors with actionable retry guidance; avoid raw diagnostic or source material. Retention, deletion, output ownership, cancellation, budget, and explicit upload consent require a reviewed contract before user upload is enabled. Mesh preview is a separate acceptance gate from source fidelity, rendering, STL export and manufacturing certification.

## Validation and manual QA

Run from the isolated worktree:

```sh
npm run typecheck
git diff --check
npx expo start --web --port 5097
node scripts/cad-import-ux-smoke.js
```

The smoke uses mocked API responses and synthetic file metadata only; it checks home routing at 375, 768 and 1440 pixels, selected mode accessibility, unsupported/empty/valid selections, metadata clearing, service enabled/disabled/failure responses, disabled upload, missing browser File support and zero CAD upload requests. Existing Describe text entry, Scan camera entry and Sample shuffle are exercised; no paid analysis or camera permission is invoked.

For human QA open `http://localhost:5097` with the local preview running:

1. At each viewport width, click Import, Scan, Describe and Sample from home. Confirm the corresponding selector and content. Repeat with a saved current project.
2. In Import, choose a synthetic `.igs` or `.iges` file. Confirm only format and byte count appear and upload remains unavailable. Clear, replace, and cancel selection. Try an empty file and a `.txt` file.
3. Check service status. Confirm offline or unavailable status provides a retry and that even an available service leaves upload disabled.
4. Switch to Describe, enter text, then switch back to Import. Confirm there is no Start Machine Scan action in Import.
5. On native, confirm the picker-unavailable explanation. Actual native camera, device picker, paid analysis, real CAD conversion, production access and rendering/export are outside this check.

The integrated Browser in the implementation task could not launch because its configured writable root contains a symlink. Playwright can operate the local preview using the real worktree path. Screenshots are synthetic UI evidence, not native or conversion qualification. No merge, deployment, production configuration, or public exposure is authorized by this implementation.

## Implementation check results

- Typecheck, diff whitespace check, and targeted CAD path/hash/token plus payload/logging scan passed.
- Browser smoke passed at 375, 768 and 1440 pixels with unavailable-picker coverage and zero CAD upload requests.
- Visually reviewed home entry controls, Phase One selector, and blocked import content across those widths. Synthetic screenshots are retained locally under `artifacts/cad-import-ux/` (home, selector and import images for each width).
- Existing shared workflow header wraps the logo at 375px; this predates the Import panel and is a separate mobile-header polish item.
- Integration Captain review and human QA remain next. Merge, deployment and public rollout remain gated.

## Captain correction: Input phase naming

Both home and workflow steppers now label phase one Input. The shared stepper renders its supplied current-phase hint below the rail, keeping “Import, scan, describe, or try a sample” readable at narrow widths. New Reconstruction, current-project phase naming and tour entry copy now account for Import. Scan remains the camera mode; upload gates are unchanged.

Validation repeated: `npm run typecheck`, `git diff --check`, and `CAD_UX_EVIDENCE=artifacts/cad-import-ux-input-fix node scripts/cad-import-ux-smoke.js` passed. The smoke now asserts Input and the full hint in both steppers. Refreshed screenshots at 375, 768 and 1440 pixels were visually inspected. Evidence remains local in `artifacts/cad-import-ux-input-fix/`. This correction stops at a local commit, before push or PR.
