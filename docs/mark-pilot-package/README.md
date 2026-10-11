# Mark public-fixture pilot package

Status: Captain-review draft. External delivery is not authorized.

This package is bound to ReversR source commit
`487a4d72369dda9e6afa9332763a14bb8285cef8` and tree
`65c8647d15383eccf4c78e5b92e3fd3c3ac5cf4c`.

## Start here

Production tour entry:

[Open the public Dispenser fixture at Input](https://reversr.vercel.app/?cadPreview=mark-dispenser-v1&cadPhase=input)

The current production URL opens the approved public fixture. It does not
auto-open the guide. To begin the guide, open the reconstruction menu in the
upper-right corner and select **Tour**. The first card should read "Begin with
the file you were given" and show "Public Dispenser.IGS fixture · no upload."

Do not describe this as an auto-start link. No tour query parameter exists in
the bound source.

## What this pilot is for

Five minutes should be enough to answer one useful question: does ReversR make
the source, review artifact, and manufacturing hold clear enough for a
manufacturer who works in 2D printing to know what can be inspected and what
still needs engineering evidence? The point is not to turn a print operator
into a CAD engineer. It is to test whether the handoff has the same discipline
he expects around source artwork, proofs, materials, finishing, and production
release.

The session uses only the checked-in public Dispenser fixture. Mark should not
provide, select, upload, email, or screen-share a private CAD file during this
phase.

## Package map

- [Five-minute facilitator script](facilitator-script.md)
- [Manufacturer concerns and limits](manufacturer-concerns-and-limitations.md)
- [Structured feedback questions](feedback-questions.md)
- [Privacy, file ownership, and consent](privacy-ownership-consent.md)
- [Pilot runbook](pilot-runbook.md)
- [Source register and claim ledger](source-register.md)
- [Validation receipt](validation-receipt.md)

## Fixed boundary

This pilot can show that a specific public IGS source and a specific derived STL
are separately identified, hash-bound, viewable, and downloadable. It can also
show the viewer controls, imported extents, four connected geometry components,
reference images, local tour progress, and a locked Build phase.

It cannot establish manufacturing certification, dimensional verification,
tolerance validation, material validation, thread validation, finish
validation, wall-thickness validation, support validation, orientation
validation, or fabrication readiness. A successful view or conversion is still
a review result, not a release to manufacture.

## Four-phase roadmap

| Phase | Gate | Status |
| --- | --- | --- |
| 1. Pilot package | Captain verifies the package, source claims, and release scope | Draft complete; Captain review pending |
| 2. Public-fixture session | Mark reviews only the approved public Dispenser fixture | Not started |
| 3. Mark-owned-file pilot | Separate consent, authority, custody, retention, execution, and cost approval | Not authorized |
| 4. Product decision | Evidence-backed continue, revise, or stop decision | Not started |

Phase 1 prepares the conversation. It does not schedule the session, contact
Mark, publish source, or advance to a Mark-owned file.

## Source release gate

The exact next authorization is:

> Approve Captain review and source release of the ReversR Mark public-fixture
> pilot package on branch `codex/mark-pilot-package`, based on commit
> `487a4d72369dda9e6afa9332763a14bb8285cef8`, limited to
> `docs/mark-pilot-package/*.md`. Allow one scoped commit, push to
> `origin/codex/mark-pilot-package`, and draft PR to `main`. No merge,
> deployment, external delivery or message to Mark, session scheduling, private
> CAD access, file upload or conversion, provider, environment, resource, or
> billing change, production activation, or manufacturing-readiness claim.
> Stop on source drift, check failure, privacy risk, unsupported claim, or
> unknown outcome.

This text is a request template. It is not approval by itself.
