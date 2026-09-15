// Source binding for one bounded development upload-session qualification run.
// Disabled by default; a future reviewed rebind must set an exact run tuple.
export const cadDevUploadSessionQualificationBinding = {
  enabled: false,
  mode: 'cad-dev-upload-session-disabled-pending-register',
  target: {
    deploymentName: 'majestic-alligator-31',
  },
  run: {
    runKeySha256: null,
    acceptedProjectionSha256: null,
    acceptanceReceiptSha256: null,
    windowStartMs: null,
    windowEndMs: null,
  },
  constraints: {
    bodyAdmissionAuthorized: false,
    maxWindowMs: 15 * 60 * 1000,
    maxOperationBudgetMs: 800,
    retainRevokedState: true,
  },
} as const;
