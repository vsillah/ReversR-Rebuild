# CAD internal tester diagnostics readiness

Status: source-only diagnostics and support-readiness packet. Base:
`223820ec2a4dc62ab2925af918497a28f3af5e02`. Expenses: USD 0.

Mark's Monday feedback remains useful, but it should not freeze the internal
roadmap. His response is still required before we claim external validation,
source-correct geometry, stakeholder usefulness or private/customer readiness.
It is not required for supportability work that helps us understand what went
wrong when an internal tester cannot reach or use the installed-app preview.

## Purpose

This packet defines the minimum evidence needed when an internal tester reports
an issue with the installed Android internal CAD upload-render preview. The goal
is to distinguish five failure classes without activating production upload,
backend conversion, Sandbox dispatch or private CAD handling:

| Class | Example signal | Default handling |
| --- | --- | --- |
| Install or update | `Live upload locked`, `Internal preview unavailable`, missing internal preview entry | Confirm direct APK artifact, relaunch/update state and embedded renderer URL before changing source. |
| File picker | Picker does not open, CAD file is hidden, permission denial | Capture Android picker/device details and reproduce with public or synthetic files before changing backend gates. |
| Local render | Render action missing, blank preview, dimensions or controls missing | Treat as local renderer or file-compatibility issue; do not infer upload, conversion or Sandbox failure. |
| CAD interpretation | Geometry, orientation or dimensions appear wrong | Route to source or fixture interpretation review and keep external-validation claims blocked. |
| Commercial readiness | Questions about production upload, private CAD, conversion, manufacturing output or fee | Answer from remaining gates and cost workbook; do not imply commercialization readiness. |

## Minimum capture

For a tester issue, capture only support-safe details:

- tester role or opaque reviewer reference
- device model, Android version and WebView or Chrome version when visible
- app install source or APK artifact reference
- visible app version or build reference when available
- whether `Open internal CAD preview` is visible
- whether `Live upload locked` appears instead of the internal preview path
- file name, extension and approximate file size
- whether the file picker opened and the selected file appeared in the app
- whether the render action appeared and whether the preview rendered
- whether dimensions, grid, zoom and orientation controls appeared
- whether zoom state persisted across orientation changes
- screenshot or short clip when possible
- last action before failure
- visible error or blocked-state copy
- triage time spent and resolved/unresolved status

Do not store recipient addresses, private file paths or raw CAD contents in
source. Use opaque local evidence references for screenshots, clips and email
receipts.

## Cost hook

The support evidence feeds the `internal-tester-support` workbook bucket. The
meters are device install support, file-picker failures, renderer compatibility
triage and tester follow-up time. That burden needs to be measured before any
customer fee per CAD run is quoted.

## Product binding

The internal preview entry should expose diagnostics as a collapsed support
detail, not a prominent warning. The primary tester action remains `Open
internal CAD preview`. The diagnostics detail captures device/app/file/path/render
signals and reminds the operator not to send private CAD, credentials, raw paths
or production account data.

The native fallback state should follow the same pattern: show a short
unavailable message, then keep the support checklist behind a compact
`Support details` disclosure. The fallback should not add another large warning
block or imply that backend upload, conversion, or Sandbox failed.

## Boundaries

This authorizes source-only docs, tests, local validation, one-commit PRs,
normal Vercel deployment from `main`, fail-closed production smokes and cleanup.
It does not authorize external messages, telemetry egress, private CAD,
production upload activation, conversion dispatch, Sandbox dispatch, real-user
enrollment, provider/auth/resource/env changes, usage or billing changes, or
new paid commitments.

## Next safe action

The next safe action is human QA of the compact internal-preview diagnostics
surface before merging the UI change. Stop if the change would require another
external message or cross into any production upload/conversion gate.
