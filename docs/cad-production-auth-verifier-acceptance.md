# Production Auth verifier acceptance evidence contract

Status: source-only; production verifier evidence remains uncollected and unaccepted.
Base: PR #382, `a2613c956ac6bd20637ffda6d020f128f065119b`.

The [packet](cad-production-auth-verifier-acceptance.json) defines the evidence
required to accept a concrete implementation of `readAuthenticatedSession` and
`readAuthorization` for `server/cadProductionSessionVerifierBinding.js`. Its
checker validates a pending source contract only. `ok: true` never means that
Auth, issuance, uploads or runtime activation are accepted.

The packet enumerates twelve evidence categories: provider verification, exact
identity, same-user different-login substitution, fresh shop authorization,
expiry, logout/revocation/replacement, malformed or forged credentials,
cancellation/deadlines, transport, upload-body ordering, credential isolation,
and review provenance. Each category contains its required observations. Every
receipt and candidate reference is null; every evidence status is NOT_COLLECTED.
The checker rejects completion claims, omitted requirements, additional fields,
source drift, changed transport disposition and reused windows or approvals.

## Evidence collection and acceptance remain separate work

1. Source review identifies a concrete production verifier implementation,
   provider/SDK versions, authenticated-context flow, freshness guarantees and
   deadline owner. `convex/librarySession.ts` is development-gated; its password
   assumption cannot establish production Auth. The service-envelope gateway's
   `refreshAuthorization` is not a user-authenticated verifier.
2. Before any live collection, obtain separate authorization for an exact
   candidate commit/deployment, bounded fresh UTC window, permitted synthetic
   identities and cases, evidence handling and stop conditions. This packet
   grants none of that authority and contains no executable live commands.
3. A future, separate evidence packet records each case's expected and observed
   result, sanitized evidence reference/digest, exact source/deployment and test
   versions, UTC timestamp, and reviewer disposition. Include lifecycle and
   denied-path observations on both resolve and refresh. Never include tokens,
   cookies, provider values, raw account records or private CAD. Local doubles
   and historical fail-closed smoke are supporting source evidence only.
4. Acceptance requires review of every category for that exact implementation.
   This checker intentionally has no accepted mode: do not change this pending
   packet into a runtime receipt. Add a separately reviewed acceptance artifact
   and validator when evidence collection is actually authorized and complete.
5. Even verifier acceptance cannot activate issuance. Runtime configuration,
   issuer composition, exact deployment evidence and a fresh opening approval
   require another review. Upload-body admission remains an independent gate.
   Historical opening packets and earlier human approvals grant no authority.

## Details that must survive review

The reviewed transport is bearer-only. Cookies and mixed transport are rejected;
cookie support needs separate origin/CSRF/SameSite review and source changes.
A caller-provided transport label provides no authority. Actual router and
middleware ordering must be observed; fabricated request objects alone cannot
prove that a framework avoided parsing an upload body first.

The binding checks cancellation but owns no timer. A future composition must
prove an explicit operation deadline, propagated cancellation and no late grant
or side effect even when a dependency ignores abort. Provider freshness and
logout semantics must be demonstrated; a correctly signed cached token does not
by itself prove the exact login remains live.

Source hashes bind the adapter, exact-session bridge, gateway service, session
store, user-upload router and both relevant Convex source contracts. The checker
reads only those repository files and the fixed JSON packet. It loads no runtime
configuration, provider SDK, network client or credentials. It reports fixed
field labels instead of echoing rejected input. Existing runtime files remain
unchanged, including permanent `configured: false` in the production binding.

## Offline validation

Run `node scripts/cad-production-auth-verifier-acceptance-checker.js` and
`node --test scripts/cad-production-auth-verifier-acceptance.test.js`, followed
by the affected verifier/gateway/opening tests, source audit and contract
manifest check. These are source validations, not live Auth qualification.

No provider/environment/resource/billing changes, secret reads, live Auth tests,
deployment, issuance, body reads, uploads, conversion, Sandbox dispatch, private
CAD, real-user commercialization, external messages or second live run/retry are
authorized by this artifact. No commercial readiness is claimed. Expenses: US$0.
Next gate: captain source review; concrete verifier evidence and separately
approved activation remain outstanding.
