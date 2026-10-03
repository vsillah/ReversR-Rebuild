# CAD Auth controlled upload observable gate wiring repair

Status: source-only deployed startup wiring repair ready for review. This packet does not activate production uploads.

The bounded controlled upload activation on `2026-10-03T02:30:00Z` reached the disabled terminal `USER_UPLOADS_DISABLED`, but the response did not include the reviewed observable proof headers. That means the deployed startup/default route path still had not installed the controlled activation mount that can prove body-admission validation, rollback, and smoke from server-owned source.

## Bound disposition

- Stopped controlled upload activation disposition: `ef54235060fc632f884d708bbb977e8279979dd83d1f4f17aab9eae27704563c`
- Approved controlled activation refresh: `af33c5a1b0121ee33164d778f7e62b864c80465b71434d2dc45a15ba3c03e73e`
- Base main commit: `7c551e230982d0482068cbc60424860c268aafdc`
- Vercel deployment: `dpl_CfkHP8RFjCSthTtZJm4JwJHSkFwY`
- Controlled observable proof packet: `43d1bb66e9e53dae20206790808be81d055a0090da12a814a03f49ed442aa614`
- Approved command-card SHA-256: `63bedb7cecae55872d8ac291ab3dd9761de202634a13998a7a77c6eb0051f03c`
- Approved installation SHA-256: `df21b3ec6ecfa44d5190f63a815722c2b0bd90b5f596121294f51439acf859c3`

## Repair

`server/cadControlledUploadObservableGateWiringRepair.js` creates a server-owned controlled activation source from reviewed current-production deployment metadata and the current bounded UTC window. It then builds the existing controlled internal upload activation manifest, adapter, and mount without reading credentials, request bodies, private CAD, provider state, or secrets.

`server/index.js` now passes a controlled activation mount factory into `createCadProductionExecutableRuntimeMount()`. The factory receives the existing base runtime mount, so the repair is part of the deployed route path rather than a proof-only test injection.

`server/cadProductionExecutableRuntimeMountCompletion.js` accepts that factory and composes the controlled activation route-body gate before the existing base gate.

## Safety properties

- Default production remains fail-closed.
- Unauthenticated requests still stop at `401 USER_SESSION_REQUIRED`.
- Credentialed requests without a later exact live activation gate still stop at `503 USER_UPLOADS_DISABLED`.
- No production upload activation, conversion, Sandbox dispatch, durable project history, private CAD use, external messages, retry, second live run, real-user commercialization, or commercial-readiness claim is authorized.
- The IGES-only validator envelope remains unchanged.
- The one-session and one-attempt fence remains enforced.
- Rollback is armed before body admission opens.
- The observable headers may appear only after the controlled gate opens, the IGES validator accepts the one approved body, and post-rollback fail-closed smoke passes.

## Observable proof headers

The later controlled live activation must prove the deployed source can emit all four headers:

- `X-ReversR-CAD-Controlled-Upload-Validation`
- `X-ReversR-CAD-Controlled-Upload-Rollback`
- `X-ReversR-CAD-Controlled-Command-Card-SHA256`
- `X-ReversR-CAD-Controlled-Installation-SHA256`

These headers cannot include credential values, CAD bytes, request bodies, private file names, local paths, provider identifiers, or user identifiers.

## Next gate

After this repair is reviewed, merged, deployed, and fail-closed smoked, the next gate is a source-only/no-live post-merge rebind refresh. It must verify the deployed startup route wiring resolves the observable controlled body-admission path from reviewed source, recompute the current deployment binding, controlled manifest digest, command-card SHA-256, installation SHA-256, and a fresh UTC activation window, and return the exact later live activation approval phrase without runtime activation.
