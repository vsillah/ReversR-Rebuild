# CAD Auth receipt intake review disposition

Status: source-only, value-free and non-executable. Parent: the current
`cad-auth-receipt-intake-template-v1` packet bound to merge
`098357ec891a5b591bb652d33e9d1c2ce79af6e8`.

This packet defines the public shape of a later reviewer disposition without
reviewing any restricted values. It creates no receipt refs, opens no restricted
store, recomputes no receipt digests and grants no authority to accept, reject,
install or use evidence.

## Review shape

A future restricted review must decide every intake category separately:

- concrete provider runtime binding;
- executable collector command;
- restricted synthetic cohort receipt;
- custody and reviewer receipt;
- durable consumed-run ledger;
- installed route/body observer;
- late-grant observer; and
- immutable target recheck receipt.

Each category must later bind receipt refs, SHA-256 digests, provenance, custody
assignment, independent reviewer evidence, retention/disposition evidence and
immutable-target recheck evidence. In this source-only packet those fields remain
absent, the reviewer decision is undecided and both acceptance and rejection are
blocked because there are no restricted values to review.

## Blocked successor actions

The disposition does not unlock a sealed-card proposal. It explicitly leaves
non-executable sealed-card preparation, executable command-card issuance, fresh
window binding, exact approval text and live collection unavailable. A future
packet may only progress after separately authorized restricted receipt values
exist, every digest is independently recomputed, custody and reviewer separation
are accepted, retention/disposition is settled, and the immutable target is
rechecked.

## Local validation

Run:

```sh
node scripts/cad-auth-receipt-intake-review-disposition-checker.js
node --test scripts/cad-auth-receipt-intake-review-disposition.test.js
```

Passing validation means only that the value-free disposition contract is
internally consistent and fail-closed.
