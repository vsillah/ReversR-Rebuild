# CAD Auth evidence stop and rollback runbook — unreviewed source

This document grants no execution authority. The shipped collector handles only
local synthetic receipts. These controls describe the required future reviewed
live implementation; observer, custody and remediation bindings remain null.

1. Before any future run, independently verify every source digest, immutable
   target, provider policy/version, restricted cohort mapping, reviewed schedule,
   custodian/reviewer and exact approval window. Missing or changed references
   block collection. Old windows and prior approvals cannot be reused.
2. Stop on any parent-plan stop condition: missing prerequisite; window not open
   or expired; source/target drift; identity outside cohort; sensitive capture;
   body getter/read/parser attempt; issuance/write; unexpected authority; failed
   deadline/cancellation; unknown outcome/interruption; failed case; retry request.
   Reserve all logical, reader and HTTP operations before dispatch; never exceed
   the sealed limits. Metadata reads count, SDK retries are disabled.
3. Mark the one run consumed, invalidate unused authority, cancel pending reads,
   prevent later dispatch and discard ephemeral request bindings. Preserve only
   sanitized partial receipts and their digest with an incomplete/failed status.
   An unknown result consumes its scheduled attempt. No resume, second run,
   additional diagnostic call or automatic window rollover is authorized.
4. A separately reviewed observer must verify that settled asynchronous work
   produces no late grant or side effect. If this cannot be established within
   the approved schedule and budget, record UNKNOWN and stop. The local replay's
   zero late-grant counter is not an actual observer or provider receipt.
5. The designated custodian restricts sanitized evidence to the approved store.
   The independent reviewer records disposition separately from observations.
   Proposed retention is seven days followed by custodian-confirmed deletion;
   no location, person or deletion action is authorized by this source packet.
6. On accidental sensitive capture, restrict the artifact and report only a
   sanitized incident through a separately authorized channel. No raw exceptions,
   bearer/cookie values, headers, credentials, account records or private CAD may
   be copied into public receipts or logs. Credential remediation needs its own
   approval; this runbook cannot revoke credentials or contact external parties.
7. Rollback here means stopping and discarding ephemeral collector state. Any
   provider mutation, environment toggle, credential action, deployment rollback
   or resource/billing change is a separate decision. Present its exact scope to
   the captain; preserve the stopped state until a new gate is approved.

Acceptance requires a reviewed observer and partial-evidence/custody references,
plus tests for stop, late completion, drift, expiry, unknown outcome and no retry.
The current source tests validate local replay termination and pre-access guards
only. No live rollback or collection is attempted.
