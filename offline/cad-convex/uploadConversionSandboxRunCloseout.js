function allFalse(record) {
  return Object.values(record || {}).every(value => value === false);
}

function inspectUploadConversionSandboxRunCloseout(closeout, correction) {
  const structureValid = closeout?.schemaVersion === 1
    && closeout?.mode === 'source-only-cad-upload-conversion-sandbox-run-closeout'
    && closeout?.status === 'PUBLIC_SYNTHETIC_CONVERSION_QUALIFIED'
    && closeout?.sourceOnly === true
    && closeout?.production === false
    && closeout?.baseMainCommit === '9a19da6707b4c62a5ba4dcae473b6d0733a73ef8'
    && closeout?.branch === 'codex/cad-upload-conversion-sandbox-run-closeout';

  const correctionBound = correction?.status === 'SANDBOX_AUTH_PATH_CORRECTED_SOURCE_ONLY'
    && closeout?.sourceBindings?.authCorrectionMergeCommit
      === '9a19da6707b4c62a5ba4dcae473b6d0733a73ef8'
    && closeout?.sourceBindings?.authCorrectionPacketSha256
      === '2b2b43c4cee4e8370b82aeade0311a57f5adf3651104099dadd258730e929bc5';

  const runValid = closeout?.run?.runRef
      === 'rrb-ref:cad-upload-conversion-sandbox-qualification-0212z'
    && closeout?.run?.decision === 'UPLOAD_CONVERSION_SANDBOX_QUALIFICATION_EXECUTED'
    && closeout?.run?.runCompleted === true
    && closeout?.run?.unknownOutcome === false
    && closeout?.run?.automaticRetry === false
    && closeout?.run?.secondRun === false;

  const conversionValid = closeout?.fixture?.id === 'public-cube'
    && closeout?.fixture?.privateCad === false
    && closeout?.conversionResult?.status === 'ready'
    && closeout?.conversionResult?.meshCount === 1
    && closeout?.conversionResult?.vertexCount === 24
    && closeout?.conversionResult?.triangleCount === 12
    && closeout?.conversionResult?.sourceConfidence === 'unqualified'
    && closeout?.conversionResult?.commandExitCode === 0;

  const sandboxValid = closeout?.sandboxEvidence?.authorizationPreflight === 'authorized'
    && closeout?.sandboxEvidence?.status === 'stopped'
    && closeout?.sandboxEvidence?.persistent === false
    && closeout?.sandboxEvidence?.vcpus === 1
    && closeout?.sandboxEvidence?.memoryMb === 2048
    && closeout?.sandboxEvidence?.timeoutMs === 60000
    && closeout?.sandboxEvidence?.networkPolicy === 'deny-all'
    && closeout?.sandboxEvidence?.cleanup === 'stopped'
    && closeout?.sandboxEvidence?.snapshotCreated === false
    && closeout?.sandboxEvidence?.remoteReconciliation === 'STOPPED_SESSION_OBSERVED';

  const evidenceValid = closeout?.sanitizedEvidence?.gitIgnored === true
    && closeout?.sanitizedEvidence?.directoryMode === '700'
    && closeout?.sanitizedEvidence?.fileMode === '600'
    && closeout?.sanitizedEvidence?.recordsContentBase64 === false
    && closeout?.sanitizedEvidence?.recordsRawCredential === false
    && closeout?.sanitizedEvidence?.recordsPrivateCad === false
    && closeout?.sanitizedEvidence?.recordsRawMeshPayload === false;

  const countsValid = closeout?.operationCounts?.authorizationReadChecks === 1
    && closeout?.operationCounts?.publicSyntheticUploadsRead === 1
    && closeout?.operationCounts?.sandboxDispatches === 1
    && closeout?.operationCounts?.conversionCommands === 1
    && closeout?.operationCounts?.conversionResultsRead === 1
    && closeout?.operationCounts?.sandboxStopsConfirmed === 1
    && closeout?.operationCounts?.storeMutations === 0;

  const costBounded = closeout?.costEvidence?.planningCapUsd === 50
    && closeout?.costEvidence?.estimatedRunCostUpperBoundUsd <= 0.01
    && closeout?.costEvidence?.newPaidCommitment === false
    && closeout?.costEvidence?.withinPlanningCap === true;

  const smokeValid = closeout?.productionFailClosedSmoke?.shell === '200 ReversR Rebuild'
    && closeout?.productionFailClosedSmoke?.capabilities === 200
    && closeout?.productionFailClosedSmoke?.userImport === '401 USER_SESSION_REQUIRED'
    && closeout?.productionFailClosedSmoke?.import === '401 UNAUTHORIZED'
    && closeout?.productionFailClosedSmoke?.sourceRecord === 404;

  const authoritiesClosed = allFalse(closeout?.authorityPreserved);

  return {
    structureValid,
    correctionBound,
    runValid,
    conversionValid,
    sandboxValid,
    evidenceValid,
    countsValid,
    costBounded,
    smokeValid,
    authoritiesClosed,
    developmentPublicSyntheticConversionQualified: structureValid
      && correctionBound
      && runValid
      && conversionValid
      && sandboxValid
      && evidenceValid
      && countsValid
      && costBounded
      && smokeValid
      && authoritiesClosed,
    productionUploadActivationAuthorized: false,
    privateCadAuthorized: false,
  };
}

module.exports = { inspectUploadConversionSandboxRunCloseout };
