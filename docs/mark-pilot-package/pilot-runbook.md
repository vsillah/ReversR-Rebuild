# Public-fixture pilot runbook

## 1. Prepare

1. Record the package binding: commit
   `487a4d72369dda9e6afa9332763a14bb8285cef8`, tree
   `65c8647d15383eccf4c78e5b92e3fd3c3ac5cf4c`.
2. Open the [production tour entry](https://reversr.vercel.app/?cadPreview=mark-dispenser-v1&cadPhase=input)
   in a clean browser tab.
3. Confirm the URL still contains `cadPreview=mark-dispenser-v1` and
   `cadPhase=input`.
4. Confirm the Input screen offers `Dispenser.IGS`, then open the reconstruction
   menu and select **Tour**.
5. Confirm step 1 of 6 says "Begin with the file you were given" and "Public
   Dispenser.IGS fixture · no upload."
6. Keep the [facilitator script](facilitator-script.md), [feedback questions](feedback-questions.md),
   and an empty observation table open outside the shared screen.
7. Confirm no recording is running. If a recording is planned, use the separate
   consent language immediately before starting it.
8. Remind Mark not to select, show, send, or describe a private file.

If any expected route, fixture, or tour label differs, stop. Do not improvise
with another fixture or a private file.

## 2. Run the five-minute session

Follow the facilitator clock:

1. Set the public-fixture and no-file boundary.
2. Review source identity at Input.
3. Review importer observations at Inventory.
4. Exercise orbit, Move, fixed view, zoom, fit, and one reference image at
   Design.
5. Distinguish the original IGS from the derived STL and read the review limits.
6. Confirm the privacy boundary.
7. End at locked Build with a hold for engineering and manufacturing review.

Checking a tour subtask means the topic was discussed. It does not mean the
source, dimension, conversion, or artifact passed a manufacturing check.

## 3. Take observation notes

Record behavior before interpretation:

- what Mark was asked to do;
- the first action he took;
- what he found without help;
- where he paused or needed a prompt;
- the manufacturing evidence he said was missing;
- the severity of any issue;
- the observable result that would resolve it.

Use role or participant reference, not contact details. Do not record private
filenames, customer names, part numbers, drawing numbers, file paths, or CAD
content.

## 4. Stop conditions

Stop the session immediately if:

- Mark offers or selects a private or customer file;
- the route loads a fixture other than `mark-dispenser-v1`;
- the source or STL fingerprint differs from the source register;
- the tour, fixture warning, or locked Build decision is missing;
- the app requests an upload session, provider credential, payment, or account
  change;
- an unexpected network conversion or provider action appears;
- confidential information appears on screen or in a recording;
- consent for notes or recording is withdrawn;
- Mark asks for a quote, fabrication approval, or manufacturing certification
  based on this fixture;
- the outcome is uncertain and cannot be reconciled from public evidence.

Record the stop reason. Do not retry with a different file, weaken the warning,
or move to a private path.

## 5. Close out

1. Confirm no Mark-owned file was requested, selected, received, or retained.
2. Record the production URL, date, browser, fixture ID, and whether recording
   was consented to.
3. Separate direct observations from facilitator inference.
4. Summarize the top product blocker, the evidence Mark needs, and the next
   testable product change.
5. Classify the result as `continue public-fixture research`, `revise before
   another session`, or `stop`.
6. Keep Build on hold. Do not describe the session as manufacturing validation
   or external certification.
7. Route the sanitized notes to the Captain. Any external follow-up remains a
   separate send approval.

## 6. Gate for a Mark-owned-file pilot

Do not advance because the public session went well. Phase 3 begins only after
the Captain has accepted all of the following:

- Mark's written consent and authority for one exact private file;
- a private file reference and hash handled outside public source;
- a named purpose and a finite test plan;
- an approved environment, upload route, converter, provider boundary, and
  access list;
- retention, deletion, custody, and derived-artifact rules;
- enforceable cost, time, operation, and retry caps;
- stop, rollback, revocation, and unknown-outcome handling;
- a privacy-safe evidence plan;
- a fresh execution authorization bound to the exact source and window.

Approval template for that later gate:

> Approve one bounded Mark-owned-file pilot for ReversR using private file
> reference `<file-ref>` and SHA-256 `<digest>`, provided under Mark's recorded
> authority and consent `<consent-ref>`, for the sole purpose `<purpose>`, in
> environment `<environment>` through route `<route>` and converter/provider
> boundary `<binding>`, during `<utc-window>`. Limit access to `<roles>`, retain
> source and derived artifacts until `<expiry>`, assign deletion and receipt
> ownership to `<owner>`, and enforce total cost `<hard-cap>`, operations
> `<count>`, and attempts `<count>`. Stop on digest drift, auth or custody
> failure, unexpected provider access, policy mismatch, cost-cap failure,
> private-data leakage, unknown outcome, or failing validation. No reuse,
> training, external sharing, manufacturing certification, fabrication release,
> production activation, or retry outside this exact approval.

Every placeholder must be filled and independently reviewed. This template is
not approval by itself.
