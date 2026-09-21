# CAD per-run cost workbook and Build readiness

Status: source-only workbook and product-surface binding. Base:
`b7b9d4d3248b9fc7395bf11244d07a6cd8e12efb`. Expenses: USD 0.

This packet turns the cost discussion into a concrete workbook without creating
a fee claim. The approved USD 50 figure remains an internal development ceiling.
It is not a customer price, not a unit cost and not evidence that production
uploads or conversion can be activated.

The current internal review path includes the production-hosted desktop browser
preview and the installed internal app build. Mark can choose a CAD file locally
from his device. The picker recognizes common CAD extensions, while the current
local renderer supports IGES, STEP and BREP preview only; unsupported-but-known
formats stay in a preview-pending state instead of pretending to render. This
does not activate production upload sessions, backend conversion, Sandbox
dispatch or private CAD handling.

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
| Internal tester support | Internal tester support | Needs device, browser or Android/WebView, file-picker, renderer compatibility and triage-time evidence. |
| Account history | ReversR account/storage policy | Needs a durable account-backed history decision, migration path and update/uninstall behavior. |
| Commercial buffer | Pricing policy | Needs tax, fee, FX, contingency and support assumptions. |

Every unresolved row keeps `estimateUsd` as `null`. The workbook should not
fill missing provider data with guesses.

## Build readiness surface

The Build phase now separates product-facing readiness from internal
commercialization evidence. The visible UI uses a compact sub-step rail:

| Step | State | User-facing meaning |
| --- | --- | --- |
| Source | Ready | CAD source is selected and ready for review. |
| Geometry | Review | Inspect the model, dimensions and references before preparing implementation. |
| Package | Locked | The implementation package opens after the required review is complete. |

Cost, provider, production upload, conversion, persistence and fee-policy
details stay in this source packet and are not rendered as visible end-user
explainer copy.

## Commercialization gate checklist

The Build phase also carries a compact remaining-gates checklist:

| Gate | State | Meaning |
| --- | --- | --- |
| Run cost | Needs evidence | Provider terms, metered operation counts, storage and support burden are still open. |
| Account history | Fast follow | Saved reconstruction history needs account-backed persistence or an explicit local-only policy. |
| Production upload | Locked | User-file upload activation still requires a separate production gate. |
| Conversion compute | Locked | Sandbox or conversion dispatch for user files remains separately gated. |
| Manufacturing output | Blocked | Build packages and customer fee quotes wait on cost, geometry and review evidence. |

## Account history fast follow

Saved reconstruction history is still a commercialization dependency. Normal
app updates should preserve local `AsyncStorage`, but uninstall/reinstall, app
data clearing, package identity changes, device replacement and different web
preview origins can present a fresh empty state. Before the CAD path is
commercialized, the team needs either account-backed history or an explicit
local-only product decision with migration, empty-state copy and release
validation.

The cost model should therefore include history storage, sync/export/import,
retention, support triage and preview-to-project separation. Internal CAD
preview renders must not be treated as saved reconstruction journeys unless the
product explicitly records them.

## Boundaries

This authorizes source-only docs, tests and Build-phase readiness copy. It does
not authorize a live run, upload activation, conversion dispatch, Sandbox
dispatch, private CAD, real users, provider/auth/resource/env changes, usage or
billing changes, customer fee quotes or external messages.
