# CAD fresh replacement restricted evidence assembly

Status: blocked source-safe packet. Branch:
`codex/cad-fresh-replacement-restricted-evidence`. Baseline:
`16410eeb9653631827f115f27a4d26b1d9470e62`. Expense: USD 0.

## Result

The prior fresh rollover projection from PR #216 still verifies as
`d6c36899e75ed925b5232add3e9c8144bb8f53a59c14dbdffb1a95c5492296f9`,
but the ignored original rollover restricted register with digest
`3bd0ec777a9f3f2ec748e17ff05591b78e22378a6ac63256b5682a7940320724`
was not found in the checked local evidence roots.

An older accepted restricted register was found with canonical digest
`0ed5be1773de1db4f7f9f6991a63f29473a530dfe53716ee1d955e61380c3c58`.
It is not the fresh rollover register and was not substituted. The successor
artifact created in the ignored local evidence area is an intake record only;
it is not an executable restricted register and it does not produce replacement
projection, command-card or acceptance digests.

## Replacement window

Proposed window: `2026-09-15T17:00:00Z` through
`2026-09-15T17:05:00Z`, maximum 300 seconds. This is planning only. It is not
approved, it is not bound to a verified restricted register, and it does not
refresh automatically. If the window expires before evidence review finishes,
prepare a new packet instead of rolling the time forward.

## Evidence state

The ignored local evidence directory was verified as Git-ignored, mode `0700`,
with files mode `0600`. The tracked packet records only source-safe digests:

| Artifact | Digest |
| --- | --- |
| Provenance search | `88c2f00c56b409329288b5845fb848862bf0cd85c4f1e2bf8f24d764e4911f7a` |
| Successor intake | `aebf37cceef5514279b6b036d87b5aafcbbcf9d3de2849f312d921b7ddbf3988` |
| Historical closeout | `25006f0f0a79bd5ccd156c7f87c670c024b64f9745ea398d7ff5a64a768fc199` |

All replacement digest fields remain null. Resource binding, cost enforcement,
custody, trusted UTC evidence, disabled-route pre/post evidence,
reconciliation, rollback and retained-state custody are still unaccepted. The
public packet therefore remains `LIVE_RUN_BLOCKED`.

## Independent review materials

Before any evidence-completeness acceptance can be requested, the reviewer must:

1. Recover the authentic original rollover restricted register or accept
   successor provenance through a separate restricted review.
2. Verify canonical register digest, original file hash, custody source and
   non-substitution. The older accepted register is explicitly disallowed as a
   replacement for the fresh rollover register.
3. Fill and review all 45 restricted evidence fields. Pending refs, fixture
   strings, planning-only values, missing reviewer identities and
   `approved=false` entries fail the review.
4. Regenerate the successor public projection, command-card projection and
   restricted command set from the reviewed bytes. The current intake digest is
   not a replacement register digest.
5. Bind exact resource, UTC, cost, custody, destination, disabled-route,
   reconciliation, rollback and retained-state evidence. No provider, billing,
   env or resource mutation is authorized by this packet.
6. Freeze an independent reviewer receipt before emitting any restricted
   evidence acceptance phrase.

## Review implications

The next live-run approval phrase cannot be safely produced from this packet.
The restricted-evidence acceptance gate is also blocked until an authentic
successor restricted register and independent review exist. A source-only
executor rebind may be planned after restricted provenance is restored or
independently accepted, but final digest pins must remain blocked until the
accepted replacement artifacts exist.

## Next approval phrase

> Approve pushing only commit [full reviewed SHA] from codex/cad-fresh-replacement-restricted-evidence to public repository vsillah/ReversR-Rebuild and opening a draft PR against main for the source-safe CAD fresh replacement restricted evidence assembly packet. No merge, deployment, live tests, production/development env or provider/auth/resource changes, secrets outside ignored reviewed restricted evidence artifacts, usage/billing changes, enrollment, email/SMS/Slack, store mutation outside reviewed restricted evidence artifacts, CAD upload activation, CAD conversion, private CAD, Sandbox dispatch, expired-run retry, live run, or branch/worktree cleanup.

## Validation

Run the fresh replacement evidence inspector, the existing private-register and
command-card validators, source audit, manifest regeneration/verification and
`git diff --check`. No UI changed, so browser QA and production smoke are
outside this source-local evidence slice.
