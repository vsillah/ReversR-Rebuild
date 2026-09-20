# CAD cost attribution and implementation-readiness packet

Status: source-only cost model and implementation-readiness packet. Base:
`ea82b675598c343e2c936f66efa44595d4e253a7`. Expenses:
USD 0.

This packet converts the current roadmap concern into a reviewable cost model
without pretending we know the current provider prices. It also keeps the Mark
feedback boundary intact: while Mark reviews the installed Android internal CAD
upload-render preview, we
can continue source-only planning, disabled-gate UX work and implementation
readiness. We cannot claim external CAD validation until his response is
received.

## Cost policy

The approved development ceiling for bounded CAD-readiness work is USD 50. That
is an operating cap for internal development work, not a fee-per-run price.

No current pricing claim is made here. Before any customer-facing fee, internal
tester quota or production activation decision, the team still needs refreshed
pricing evidence for every cost bucket in the run path.

The fee-per-run model should be built around one CAD run and should include:

- Convex Auth/session and store operations
- Vercel web/API execution, builds, bandwidth and logs
- upload-admission request validation and body-read cost after a separate
  activation gate
- conversion/Sandbox startup, CPU, memory, storage, egress and cleanup
- derived preview rendering and asset delivery
- backup, retained-state custody, rollback and reconciliation evidence
- internal tester device/file-picker/render compatibility support and follow-up
- taxes, fees, currency conversion, provider minimums, contingency and support
  burden

Any unverified provider label, including the user-mentioned Bracell bucket,
must be confirmed against an actual provider identity and pricing source before
it appears in a fee calculation.

## Minimum workbook

The next cost artifact should be a source-only workbook or JSON ledger with:

- run id and source material class
- file size and derived artifact sizes
- operation counts from sanitized run evidence
- Convex usage
- Vercel usage
- Sandbox or compute usage
- storage and retention duration
- egress and cache assumptions
- tester support triage and compatibility evidence
- taxes, fees and FX allowance
- contingency percentage
- approved cap
- all-in estimated cost
- margin or fee recommendation

The workbook should separate measured evidence from assumptions. If a provider
price is stale, missing or plan-dependent, the workbook should mark that field
as unresolved instead of filling it with a guess.

## Implementation readiness

The next product work can continue source-only around the Build phase. The
useful surfaces are:

1. A per-run cost workbook fed by sanitized evidence.
2. A Build-phase implementation readiness panel showing what is validated,
   what is test-only and what remains locked.
3. An operator-facing remaining-gates checklist.
4. Copy guardrails that keep public-material tests distinct from actual product
   readiness.

The current source boundary stays closed:

- `BODY_ADMISSION_AUTHORIZED = false`
- no production CAD upload activation
- no production conversion
- no Sandbox dispatch for user files
- no private CAD ingestion
- no real-user enrollment
- no provider, auth, resource, environment, usage or billing changes
- no external messages beyond separately approved sends

## Mark feedback boundary

Mark's feedback remains necessary before we describe the Dispenser preview as
externally validated, geometry-correct or source-approved. His feedback does
not block source-only cost attribution, Build-phase information architecture,
disabled-gate UX polish, feedback intake packet updates or fail-closed
production route smokes.

## Next recommended gate

The next gate is a source-only per-run cost workbook and Build-phase readiness
surface. That gate should produce current-pricing evidence requirements and a
clear internal-tester cost view, while still stopping before upload activation,
conversion, Sandbox dispatch, private CAD, real users, billing changes or
external messages.
