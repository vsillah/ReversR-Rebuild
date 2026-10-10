// Source-only binding for one terminal development controlled-upload qualification.
// The immutable target and fixture are fixed here. A later reviewed source rebind
// must install every nullable run field before the internal mutation can execute.
// There is no environment switch or caller-supplied override.
export const cadControlledUploadDevQualificationBinding = {
  schemaVersion: 1,
  mode: 'cad-controlled-upload-development-qualification-source-closed',
  source: {
    baseCommit: '6aa57afc24aac6769bad12aa06a7ed6855a83739',
    qualificationCommit: null as string | null,
    stopReceiptSha256: 'f1696dfb1bc24bef2bf41aaff1f5894527bd8bd89966d215301e1d4b261b8872',
    deploymentAttemptLedgerSha256: 'aa7267c413e05da07c0e3769c52d009b2cace74d6eb7a20e8cdcd68ea9c73531',
    hostSha256: 'ff398dce1a67e14b3ac9ca32d11c0974b1d329eb28464a898316f250027fb3c7',
    bridgeSha256: '2559724d72deb8b0bd25cdc73f17dce35de038b19bc19b1eda48537a3ab9678f',
    adapterSha256: 'e1a4f90c41942689121d2f3158bf3d3260ff405fa2fbeb76d0e44282cd07bb2f',
  },
  target: {
    teamSlug: 'vambah-sillah',
    projectSlug: 'reversr-cad-auth-dev',
    deploymentName: 'majestic-alligator-31',
    deploymentType: 'development',
    cloudUrl: 'https://majestic-alligator-31.convex.cloud',
  },
  fixture: {
    reference: 'occt-import-js:testfiles/cube-10x10mm/Cube 10x10.igs',
    sha256: '5bc09d9b7a163ed8052af1fffebf953e000dc0d48cd7d700c064dacce1f2e7b3',
    bytesAdmitted: 0,
  },
  synthetic: {
    email: 'cad-test-alpha-20260915@auth-test.invalid',
    userId: null as string | null,
    loginSessionId: null as string | null,
    shopId: 'cad-controlled-upload-development-qualification',
    sessionId: 'cad-controlled-upload-development-qualification-v1',
    cohortRef: 'rrb-ref:cad-controlled-upload-development-qualification-v1',
    approvedRunId: 'rrb-ref:cad-controlled-upload-development-qualification-run-v1',
  },
  approval: {
    recordSha256: null as string | null,
    windowStartMs: null as number | null,
    windowEndMs: null as number | null,
  },
  limits: {
    maxRuns: 1,
    maxSessions: 1,
    maxAttempts: 1,
    maxRetries: 0,
    maxWindowMs: 15 * 60 * 1000,
  },
  closures: {
    internalOnly: true,
    bodyAdmissionAuthorized: false,
    requestBodyReads: 0,
    conversionAuthorized: false,
    sandboxAuthorized: false,
    storageWritesAuthorized: false,
    productionChangesAuthorized: false,
  },
} as const;
