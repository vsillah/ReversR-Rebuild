# Authenticated IGS authority consolidation

This branch is based on main commit `d15468230d46e9dd4e32d9057373e31880b82cb2`. It keeps the authenticated IGS implementation merged through PR #515 as the sole runtime authority and removes the older PR #516 implementation as a competing route, schema, storage, session, conversion, grant, and cleanup stack.

## Sole authority map

| Responsibility | Canonical authority |
| --- | --- |
| Workspace integration | `components/CadWorkflow.tsx` delegates private-file work to the authenticated browser client while retaining the public fixture path and current desktop workspace information architecture. |
| Browser transport | `utils/cadAuthenticatedIgsBrowser.ts` validates the selected file, mints the cookie-bound upload session, sends CSRF-protected requests, resumes a job, obtains one-use grants, downloads the original or STL, and requests deletion. |
| HTTP routes | `server/cadAuthenticatedIgsRouter.js` owns the `/api/cad/authenticated-*` route family and performs session verification before reading an upload body. |
| Session verification | `server/cadAuthenticatedIgsSessionVerifier.js` accepts exactly one upload cookie, rejects upload-route authorization headers, verifies the allowed origin, and checks the CSRF digest. |
| Durable state | `commercial-backend/convex/cadAuthenticatedIgs.ts` and `commercial-backend/convex/cadAuthenticatedIgsGateway.ts` own job, artifact, quota, session, and one-use grant transitions. |
| Schema | `cadAuthenticatedIgsJobs`, `cadAuthenticatedIgsArtifacts`, `cadAuthenticatedIgsGrants`, and `cadAuthenticatedIgsQuota` are the only authenticated IGS tables. |
| Private custody | `server/cadR2PrivateArtifactCustody.js` and `server/cadR2S3Provider.js` own exact-key storage, bounded access, confirmation-before-tombstone deletion, and the single-attempt provider policy. |
| Conversion | `server/cadAuthenticatedIgsSandboxExecutor.js` and the other `cadAuthenticatedIgs*` sandbox modules own the one-shot, deny-all conversion contract. |

## Removed parallel surfaces

The consolidation intentionally does not restore the former `cadProductImport*` authority or its adjacent files: `cadImports.ts`, `cadProductConvexStore.js`, `cadProductImportPipeline.js`, `cadProductImportRouter.js`, `cadProductPrivateCustody.js`, `cadProductWorkerContract.js`, `cadR2Provider.js`, `cadProductIgesAdmission.*`, `cadProductImport.ts`, and `cad-product-import.integration.test.js`.

Those files previously duplicated ownership of admission, durable records, storage, conversion, grants, and cleanup. Their absence is now guarded by `scripts/cad-authenticated-igs-authority-consolidation.test.js`.

## Preserved product behavior

- The existing Import journey keeps file and included-sample choices visibly exclusive.
- Private `.igs` and `.iges` selection remains bounded to 8 MiB and delegates to the authenticated browser client.
- The public fixture and manufacturer tour remain available without using or exposing private CAD.
- Authenticated requests use the HttpOnly upload cookie plus CSRF; direct bearer-style upload-route authentication remains rejected.
- A claimed job receives one conversion attempt and the provider client receives zero application retries.
- Job reads, artifact operations, and grants remain scoped to the current owner, shop, and upload session.
- Ready jobs retain original/STL download and terminal delete controls.
- The desktop workspace information architecture merged on main remains unchanged by this consolidation.

## Evidence and boundary

The consolidation test statically guards route and table uniqueness, UI delegation, cookie-only auth, CSRF, owner/session scoping, one-shot conversion, one-use grants, provider retry limits, and confirmed deletion ordering. The existing browser, route, security, and Convex suites exercise those contracts behaviorally. The public-fixture manufacturer tour supplies responsive, privacy-safe visual evidence without a private upload.

This is source-only consolidation evidence. It does not prove live private CAD conversion, provider activation, a live Convex binding, deployment, production authentication, or real-user readiness. Production remains disabled until those separate gates are explicitly authorized and evidenced.
