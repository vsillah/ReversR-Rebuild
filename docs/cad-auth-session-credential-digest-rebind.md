# CAD Auth session credential digest rebind

Roadmap: 5/6 complete. This source-only gate resolves the Phase 6 credential
precondition blocker by generating exactly one private local `us1.*` bearer
credential and committing only its digest and custody metadata.

## Scope

The private credential value is stored only in ignored local custody under the
approved worktree. Public source receives:

- the generated credential SHA-256;
- the generated private custody file SHA-256;
- byte counts and opaque custody refs;
- the source-owned deployment, bounded session, durable evidence, command-card,
  and installation bindings.

This gate does not read a request body, issue an upload session, activate
production upload admission, run conversion, dispatch Sandbox, use private CAD,
or claim commercial readiness.

## Bound Inputs

- post-merge production session supply closure deployment rebind refresh
  SHA-256:
  `16d5520a28f8c57d7328eab5f9be3174bd8f94c17bacda75aa0a035e520632b5`
- production session supply closure packet SHA-256:
  `26533055c57d5ea7243463baa698edf22d457382242e3931efe863c037acf30f`
- production session supply closure source commit:
  `59373f240ab8cba74dc4005e9f39556253e5f7d3`
- main commit:
  `b613888df285a5291fe176142116ff9a5162093a`
- GitHub production deployment: `6791773894`
- Vercel deployment: `dpl_AurXmnR3TUZyd6CnintDQgqGdT6s`
- production target:
  `https://reversr-hpbhbtfo6-vsillahs-projects.vercel.app`
- source-owned deployment reference:
  `vercel-target:reversr-hpbhbtfo6-vsillahs-projects.vercel.app@b613888df285a5291fe176142116ff9a5162093a`
- fail-closed smoke:
  `401 USER_SESSION_REQUIRED` observed at `2026-10-01T18:15:01Z`
- previous session credential digest SHA-256:
  `2165440ab2035b4fa249cf960cc036b449b9eb780776c89ad5cba46b9033e359`
- generated session credential digest SHA-256:
  `76c7cb47f616bc2e6a1ca99ad35d534d5c0cdaaba460f26717d79e100d90d87e`
- generated private credential file SHA-256:
  `6da997122386aefce6c31cd86f060af1a848bae80bfd763eb47b94f61399f150`
- generated private credential file ref:
  `rrb-ref:cad-auth-generated-private-session-credential-20261001T190508Z`
- command-card SHA-256:
  `f77255907ba85e4091974b484af5275bfee3ce47f5cdee4e532c388accad51dc`
- installation SHA-256:
  `4ef051c3f9bfa14b668afa0811e0213b6f59f3c3c45356a2e3a54bc77dc444e4`

## Validation

Run:

```sh
node scripts/cad-auth-session-credential-digest-rebind-checker.js
node --test scripts/cad-auth-session-credential-digest-rebind.test.js
```

The checker records
`SESSION_CREDENTIAL_DIGEST_REBIND_PACKET_VALID_DEFAULT_CLOSED` only when the
generated digest replaces the previous digest in the source-owned live-gate
session service, the previous digest is rejected, private credential values are
absent from public source, and all live effects remain closed.

## Next Gate

The next gate is public branch push and draft PR creation for the source-only
changes. A live-opening approval remains blocked until this branch is reviewed,
merged, deployed from `main`, fail-closed-smoked in production, and re-bound to
the fresh production deployment.
