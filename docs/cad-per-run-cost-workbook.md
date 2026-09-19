# CAD per-run cost workbook and Build readiness

Status: source-only workbook and product-surface binding. Base:
`ea82b675598c343e2c936f66efa44595d4e253a7`. Expenses: USD 0.

This packet turns the cost discussion into a concrete workbook without creating
a fee claim. The approved USD 50 figure remains an internal development ceiling.
It is not a customer price, not a unit cost and not evidence that production
uploads or conversion can be activated.

The current internal review path is the installed Android IGS upload-render
preview, not only the earlier browser fixture. Mark can choose an `.igs` or
`.iges` file locally on the Android device, but that remains a local/internal
preview path. It does not activate production upload sessions, backend
conversion, Sandbox dispatch or private CAD handling.

## Workbook rows

Each CAD run should eventually carry measured or quoted evidence for these
rows:

| Row | Provider bucket | Current state |
| --- | --- | --- |
| Convex Auth/session/store | Convex | Needs current plan terms, deployment limits, operation counts and retention duration. |
| Web/API hosting | Vercel | Needs current plan terms, route usage, function counts and asset bandwidth. |
| Upload admission | ReversR runtime | Locked until `BODY_ADMISSION_AUTHORIZED = false` changes through a separate gate. |
| Conversion compute | Sandbox or conversion compute | Locked until conversion and Sandbox dispatch are separately approved. |
| Preview and retention | Preview assets and evidence custody | Needs asset byte sizes, cache policy, retention window and rollback receipts. |
| Internal tester support | Internal tester support | Needs device, Android/WebView, file-picker, renderer compatibility and triage-time evidence. |
| Commercial buffer | Pricing policy | Needs tax, fee, FX, contingency and support assumptions. |

Every unresolved row keeps `estimateUsd` as `null`. The workbook should not
fill missing provider data with guesses.

## Build readiness surface

The Build phase can now explain three things in-product:

- what is ready: installed-app internal IGES preview controls,
  source/reference comparison and fail-closed route status
- what cost evidence is missing: current provider terms, Sandbox/compute price,
  operation counts, storage, egress, tester support burden and commercial buffer
  policy
- what remains blocked: production CAD upload activation, conversion/Sandbox
  dispatch, customer fee quote and manufacturing package

This keeps Mark's QA focused on local/internal preview behavior while giving the
internal team a clean place to reason about implementation readiness and support
cost.

## Boundaries

This authorizes source-only docs, tests and Build-phase readiness copy. It does
not authorize a live run, upload activation, conversion dispatch, Sandbox
dispatch, private CAD, real users, provider/auth/resource/env changes, usage or
billing changes, customer fee quotes or external messages.
