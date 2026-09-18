# CAD public-material preview path authorization

## Decision

The bounded internal-tester or public-preview path is authorized for public
materials only. The authorized path is an anyone-with-link, non-production
Vercel preview using `?cadPreview=mark-dispenser-v1`.

This is not a real-user enrollment, upload activation or production conversion
decision. It authorizes the existing fixture-preview path and visual QA using
public source material only.

## Bound material

The preview is bound to `public/cad-fixtures/mark-dispenser-v1/manifest.json`.
That manifest records source-provider authorization for anyone-with-link Vercel
preview redistribution.

- Source: `Dispenser.IGS`, 701,346 bytes, SHA-256
  `1e52b301cf33bc241cd0d3d039691236ab45116f439197820f690b424750f0b8`.
- Derived display mesh: `dispenser-derived.stl`, 131,784 bytes, SHA-256
  `9b5bfa4b86d6976ae87e6f023b3a243d4b04966b2337b224203bb630e7b8096e`.
- References: front, left, top and drawing JPEGs, each hash-bound in the
  fixture manifest.

The derived mesh is a display aid. It is not fully watertight and does not
create a dimensional inspection, arbitrary CAD fidelity, manufacturing or
private-CAD claim.

## Route boundary

The preview route is `/?cadPreview=mark-dispenser-v1`. Existing source allows
it only on `localhost`, `127.0.0.1`, `::1` or non-production `*.vercel.app`
hosts. `https://reversr.vercel.app` is blocked even when the query string is
present.

The route source and regression test are hash-bound in the packet:

- `utils/cadInternalTesterPreview.js`
- `scripts/cad-internal-tester-preview.test.js`

## QA evidence

This packet binds the prior phase-progression and neutral-grid QA evidence,
including the MP4 walkthroughs and machine-readable browser results. Those
checks cover the public Dispenser route, fixed phase progression, source
download, references, viewer controls, responsive behavior, neutral material,
grid visibility, no auto-rotation and production-host denial simulation.

## What remains blocked

This authorization does not send the link to Mark or any other external
recipient. It does not create or enroll an account, use private CAD, enable
production upload, dispatch production conversion or Sandbox work, mutate
provider/resource/env settings, change billing, or run another live provider
qualification.

## Next gate

Use a PR or non-production Vercel preview URL with
`?cadPreview=mark-dispenser-v1`, perform visual QA, attach the walkthrough in
the Codex thread, and stop before external delivery. Sending the URL outside
the workspace remains a separate explicit approval.
