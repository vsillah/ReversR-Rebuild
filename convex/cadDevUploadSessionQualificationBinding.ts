// Source binding for one bounded development upload-session qualification run.
// This binds only the reviewed 2026-09-15T21:30Z tuple; it does not authorize
// a live run by itself.
export const cadDevUploadSessionQualificationBinding = {
  enabled: true,
  mode: 'cad-dev-upload-session-2130z-rebind',
  target: {
    deploymentName: 'majestic-alligator-31',
  },
  run: {
    runKeySha256: 'ce5f7f60202f6ee08ab10e9efa21ab90b25799ddc77be995d5b2810f259bfa8d',
    acceptedProjectionSha256: '9ba800eb47ccec11923149a0af9f3c05558abbce38a2a9c0c856db75783cf036',
    acceptanceReceiptSha256: 'de8c962603a1ccace7f899b8b00a6771ade6acd63a7c4437b761ab90feca17dc',
    windowStartMs: 1789507800000,
    windowEndMs: 1789508700000,
  },
  constraints: {
    bodyAdmissionAuthorized: false,
    maxWindowMs: 15 * 60 * 1000,
    maxOperationBudgetMs: 800,
    retainRevokedState: true,
  },
} as const;
