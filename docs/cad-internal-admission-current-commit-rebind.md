# CAD opening evidence after PR #380

This source-only rebind targets merged main commit `046ff00368caa98f13c9a105fa30ec7036bdc57f` from [PR #380](https://github.com/vsillah/ReversR-Rebuild/pull/380). It connects the candidate opening bundle, exact-opening decision, activation scope, disabled readiness record and exact-session bridge evidence for source review. It does not activate uploads or issue upload sessions.

The [JSON packet](cad-internal-admission-current-commit-rebind.json) is the current review overlay. The original candidate's `0c8f676` commit and exact decision's `92db313` commit remain historical provenance. Their smoke receipts, timestamps and human-QA acceptance have not been rewritten. The exact decision's September 22, 17:00–18:00 UTC window is expired and cannot be reused. No replacement window or approval phrase is accepted here.

The bridge was included in merge `046ff00368caa98f13c9a105fa30ec7036bdc57f`; its own earlier base commit remains the implementation's provenance. Packet and source digests bind its current source to this review. This does not supply a production request-session verifier, install runtime values, prove live Auth, or grant body admission. The readiness JSON remains unchanged: all gates are unapproved, authority fields are null, and enabled/liveReady/executable are false.

The captain supplied the sanitized production receipt: deployment `6605428703`, successful status updated `2026-09-23T03:03:31Z`, canonical target `https://reversr.vercel.app`, cache buster `qa=046ff00`. GET `/` and `/api/cad/capabilities` returned 200; empty-JSON POST `/api/cad/user-import` returned 401 `USER_SESSION_REQUIRED`; empty-JSON POST `/api/cad/import` returned 401 `UNAUTHORIZED`; GET `/api/cad/import-source-record` returned 404. This lane did not repeat those probes. The deployment timestamp is not represented as a separately observed smoke timestamp. These unauthenticated denials do not prove an authenticated upload path or successful body validation.

Run the current-source check with an independently selected expected merge commit:

```sh
node scripts/cad-internal-admission-opening-bundle-checker.js check-current 046ff00368caa98f13c9a105fa30ec7036bdc57f
node --test scripts/cad-internal-admission-current-commit-rebind.test.js
node scripts/cad-convex-source-audit.js
node scripts/cad-convex-contract-manifest.js
git diff --check
```

The legacy `check` command checks historical bundle completeness only. `check-current` additionally rejects stale commit/smoke/bridge bindings, changed source digests, missing receipt provenance, transferred approval and reused windows. A passing current check means `sourceReviewCurrent`, with `readyForSeparateActivationApproval: false` and `routeMayOpenNow: false`. The expected commit must come from the reviewed merge/deployment; the checker does not fetch main or independently verify the captain's deployment receipt. When advancing this overlay, refresh the receipt, digests and expected-commit assertion together. The source audit includes the pinned current review check.

Next: captain review of this rebind. Any future opening requires a fresh exact deployment and UTC window, production session-verifier evidence, transport/revocation/retention/lockout/cost review and separate explicit activation approval. No merge, deployment, runtime activation, body read, conversion, Sandbox dispatch, provider/env/resource/billing changes, secrets, private CAD, real-user use, external messages, retry or commercial-readiness claim is authorized by this packet. Expenses: US$0.
