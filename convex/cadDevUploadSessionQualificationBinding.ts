// Source binding for one bounded development upload-session qualification run.
// This binds only the reviewed 2026-09-16T01:00Z tuple; it does not authorize
// a live run by itself.
export const cadDevUploadSessionQualificationBinding = {
  enabled: true,
  mode: 'cad-dev-upload-session-0100z-rebind',
  target: {
    deploymentName: 'majestic-alligator-31',
  },
  run: {
    runKeySha256: 'de725ce29a1fd499836d47717c015517cfd36855b0b6622dc2e751ee2448d644',
    acceptedProjectionSha256: '3f405f0eafa4e3834b99d9ee69547402a0690e79e705dacd13a764b8e4b7e640',
    acceptanceReceiptSha256: 'd6a09751cece8326d6a242686ca310fa9b4a3abace455dcbd23e739b9223f930',
    windowStartMs: 1789520400000,
    windowEndMs: 1789521300000,
  },
  constraints: {
    bodyAdmissionAuthorized: false,
    maxWindowMs: 15 * 60 * 1000,
    maxOperationBudgetMs: 800,
    retainRevokedState: true,
  },
} as const;
