# CAD Auth controlled upload observable gate wiring repair

Status: source wiring retained; runtime blocked. See [corrective repair](cad-auth-controlled-upload-durable-fence-repair.md). Historical process-local adapter receipts never established shared durability, atomic expiry, rollback or independently executed smoke.

## Bound disposition

- Stopped controlled upload activation disposition: `ef54235060fc632f884d708bbb977e8279979dd83d1f4f17aab9eae27704563c`
- Approved controlled activation refresh: `af33c5a1b0121ee33164d778f7e62b864c80465b71434d2dc45a15ba3c03e73e`
- Base main commit: `7c551e230982d0482068cbc60424860c268aafdc`
- Vercel deployment: `dpl_CfkHP8RFjCSthTtZJm4JwJHSkFwY`
- Controlled observable proof packet: `43d1bb66e9e53dae20206790808be81d055a0090da12a814a03f49ed442aa614`
- Approved command-card SHA-256: `63bedb7cecae55872d8ac291ab3dd9761de202634a13998a7a77c6eb0051f03c`
- Approved installation SHA-256: `df21b3ec6ecfa44d5190f63a815722c2b0bd90b5f596121294f51439acf859c3`

## Corrected behavior

The source-only review preserves the original deployment/session/cohort/card/install/window binding. The deployed startup factory now returns a terminal denial without constructing an adapter or invoking the base runtime. Its configuration is disabled even when source digests match. The composition layer cannot fall back to a legacy admission gate after this denial.

The unsafe Set-backed adapter and fabricated rollback/smoke receipts have been removed. The adapter resolver returns null; supplied flags, ledgers or callbacks cannot authorize admission. The existing generic protocol runner is exercised only through explicitly synthetic local fixtures in this repair.

## Safety properties

- Unauthenticated requests remain `401 USER_SESSION_REQUIRED`.
- Synthetic credentialed local requests stop at `503 USER_UPLOADS_DISABLED` before body-stream subscription.
- Denials emit no controlled validation, rollback, command-card or installation proof headers.
- The IGES-only validator and exact binding contracts remain unchanged.
- One session, one attempt, no retries and rollback-first controls remain requirements for a future durable host; this repair does not claim they have been durably qualified.
- Production activity and commercial-readiness claims remain unauthorized.

## Next gate

A reviewed source-owned shared transactional upload host with atomic expiry, durable close/revocation and a real independent smoke verifier is required. The offline engine adapter alone does not supply that host. This repair stops at local validation and a scoped commit.
