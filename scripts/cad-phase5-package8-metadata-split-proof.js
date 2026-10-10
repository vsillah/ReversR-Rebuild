const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const PACKET_PATH = 'docs/cad-phase5-package8-public-evidence/convex-metadata-split-proof.json';
const STOP_RECEIPT_SHA256 = '7c24ab20d73c3e272291430e0207156d10dd1655893c0cce86597ddb206a09d9';
const UNAVAILABLE_VALUES_SHA256 = '9dc9e8294a4334a157dbdff9799d0ea71ce35688314938c7d684d2e0df13c72d';
const MAIN_COMMIT = '6c822b215bc74fc1203442bfef903855a9cbe5df';
const SOURCE_TREE = '0063973062495d3f06e93644f041c57d76989f42';
const EXPECTED_TARGET = Object.freeze({
  teamSlug: 'vambah-sillah',
  projectSlug: 'reversr-cad-auth-dev',
  deploymentName: 'majestic-alligator-31',
  deploymentType: 'development',
  cloudUrl: 'https://majestic-alligator-31.convex.cloud',
});
const MAX_IDENTITY_AGE_MS = 15 * 60 * 1000;

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function fileSha256(rootPath, relativePath) {
  return sha256(fs.readFileSync(path.join(rootPath, relativePath)));
}

function collectSourceInventory(rootPath = root) {
  const configPath = path.join(rootPath, 'tsconfig.json');
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) throw new Error('TYPESCRIPT_CONFIG_INVALID');
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, rootPath);
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const checker = program.getTypeChecker();
  const generatedPath = path.join(rootPath, 'convex/_generated/api.d.ts');
  const generated = program.getSourceFile(generatedPath);
  if (!generated) throw new Error('GENERATED_API_MISSING');
  const diagnostics = program.getSyntacticDiagnostics(generated).concat(program.getSemanticDiagnostics(generated));
  if (diagnostics.length) throw new Error('GENERATED_API_INVALID');
  const moduleSymbol = checker.getSymbolAtLocation(generated);
  if (!moduleSymbol) throw new Error('GENERATED_API_SYMBOL_MISSING');
  const exports = checker.getExportsOfModule(moduleSymbol);
  const functions = [];
  const moduleNames = new Set();

  for (const namespace of ['api', 'internal']) {
    const namespaceSymbol = exports.find(symbol => symbol.name === namespace);
    if (!namespaceSymbol) throw new Error(`GENERATED_NAMESPACE_MISSING:${namespace}`);
    const namespaceType = checker.getTypeOfSymbolAtLocation(
      namespaceSymbol,
      namespaceSymbol.valueDeclaration || namespaceSymbol.declarations?.[0] || generated,
    );
    for (const module of checker.getPropertiesOfType(namespaceType)) {
      moduleNames.add(module.name);
      const moduleType = checker.getTypeOfSymbolAtLocation(
        module,
        module.valueDeclaration || module.declarations?.[0] || generated,
      );
      for (const fn of checker.getPropertiesOfType(moduleType)) {
        const fnType = checker.getTypeOfSymbolAtLocation(
          fn,
          fn.valueDeclaration || fn.declarations?.[0] || generated,
        );
        if (!checker.typeToString(fnType).startsWith('FunctionReference<')) {
          throw new Error(`GENERATED_FUNCTION_TYPE_INVALID:${module.name}:${fn.name}`);
        }
        functions.push({ name: `${module.name}:${fn.name}`, visibility: namespace === 'api' ? 'public' : 'internal' });
      }
    }
  }

  functions.sort((a, b) => a.name.localeCompare(b.name) || a.visibility.localeCompare(b.visibility));
  if (new Set(functions.map(entry => entry.name)).size !== functions.length) throw new Error('FUNCTION_NAME_DUPLICATE');
  const modules = [...moduleNames].sort().map(name => {
    const sourcePath = `convex/${name}.ts`;
    if (!fs.existsSync(path.join(rootPath, sourcePath))) throw new Error(`FUNCTION_MODULE_MISSING:${name}`);
    return { name, sourcePath, sha256: fileSha256(rootPath, sourcePath) };
  });
  const generatedApiSha256 = fileSha256(rootPath, 'convex/_generated/api.d.ts');
  const codegenScriptSha256 = fileSha256(rootPath, 'scripts/cad-convex-codegen.js');
  const packageLockSha256 = fileSha256(rootPath, 'package-lock.json');
  const functionsSha256 = sha256(JSON.stringify(functions));
  const moduleSourcesSha256 = sha256(JSON.stringify(modules));

  return {
    method: 'TYPESCRIPT_CHECKER_OVER_CHECKED_IN_GENERATED_API_NAMESPACES',
    generatedApiPath: 'convex/_generated/api.d.ts',
    generatedApiSha256,
    codegenScriptPath: 'scripts/cad-convex-codegen.js',
    codegenScriptSha256,
    packageLockPath: 'package-lock.json',
    packageLockSha256,
    sdkVersions: { convex: '1.45.0', typescript: '6.0.3' },
    namespaceScope: ['api', 'internal'],
    exclusions: ['HTTP routes and HTTP actions are not members of the generated api/internal FunctionReference namespaces'],
    moduleCount: modules.length,
    functionCount: functions.length,
    visibilityCounts: {
      public: functions.filter(entry => entry.visibility === 'public').length,
      internal: functions.filter(entry => entry.visibility === 'internal').length,
    },
    functionsSha256,
    moduleSourcesSha256,
    modules,
    functions,
  };
}

function classifyDeploymentIdentityObservation(proof, observation, evaluatedAtUtc) {
  if (!observation || typeof observation !== 'object') return 'IDENTITY_OBSERVATION_MISSING';
  if (!evaluatedAtUtc || !Number.isFinite(Date.parse(evaluatedAtUtc))) return 'IDENTITY_EVALUATION_TIME_INVALID';
  for (const [key, value] of Object.entries(EXPECTED_TARGET)) {
    if (observation[key] !== value) return 'IDENTITY_TARGET_MISMATCH';
  }
  if (observation.sourceFunctionsSha256 !== proof.sourceInventory.functionsSha256
      || observation.sourceGeneratedApiSha256 !== proof.sourceInventory.generatedApiSha256) {
    return 'IDENTITY_SOURCE_BINDING_MISMATCH';
  }
  const observedAt = Date.parse(observation.observedAtUtc);
  const evaluatedAt = Date.parse(evaluatedAtUtc);
  if (!Number.isFinite(observedAt) || observedAt > evaluatedAt
      || evaluatedAt - observedAt > MAX_IDENTITY_AGE_MS) return 'IDENTITY_OBSERVATION_STALE';
  return 'IDENTITY_ONLY_EQUIVALENCE_UNPROVEN';
}

function validateProof(proof, inventory, manifest) {
  const errors = [];
  const expect = (condition, message) => { if (!condition) errors.push(message); };
  expect(proof?.schemaVersion === 1, 'schema version');
  expect(proof?.packetType === 'CAD_PHASE5_PACKAGE8_CONVEX_METADATA_SPLIT_PROOF', 'packet type');
  expect(proof?.status === 'SOURCE_INVENTORY_VERIFIED_DEPLOYMENT_EQUIVALENCE_UNPROVEN', 'fail-closed status');
  expect(proof?.scope === 'SOURCE_ONLY_METADATA_GATE_REDESIGN', 'source-only scope');
  expect(proof?.bindings?.mainCommit === MAIN_COMMIT, 'main binding');
  expect(proof?.bindings?.tree === SOURCE_TREE, 'tree binding');
  expect(proof?.bindings?.stopReceiptSha256 === STOP_RECEIPT_SHA256, 'stop receipt binding');
  expect(JSON.stringify(proof?.sourceInventory) === JSON.stringify(inventory), 'source inventory drift');
  expect(proof?.sourceInventory?.functionCount === 50, 'function count');
  expect(proof?.sourceInventory?.moduleCount === 11, 'module count');
  expect(proof?.sourceInventory?.visibilityCounts?.public === 9, 'public function count');
  expect(proof?.sourceInventory?.visibilityCounts?.internal === 41, 'internal function count');
  expect(new Set((proof?.sourceInventory?.functions || []).map(entry => entry.name)).size
    === proof?.sourceInventory?.functionCount, 'function names unique');

  expect(manifest?.version === 87, 'contract manifest version');
  expect(manifest?.baseCommit === MAIN_COMMIT, 'contract manifest base');
  expect(manifest?.mode === 'offline-source-unqualified', 'contract manifest mode');
  expect(proof?.contractManifest?.path === 'offline/cad-convex/manifest.json', 'contract manifest path');
  expect(proof?.contractManifest?.version === 87, 'packet contract manifest version');
  expect(proof?.contractManifest?.baseCommit === MAIN_COMMIT, 'packet contract manifest base');
  expect(proof?.contractManifest?.mode === 'offline-source-unqualified', 'packet contract manifest mode');
  for (const item of [
    { sourcePath: inventory.generatedApiPath, sha256: inventory.generatedApiSha256 },
    { sourcePath: inventory.codegenScriptPath, sha256: inventory.codegenScriptSha256 },
    ...inventory.modules,
  ]) {
    expect(manifest?.files?.[item.sourcePath] === item.sha256, `contract manifest mismatch: ${item.sourcePath}`);
  }

  expect(JSON.stringify(proof?.deploymentIdentity?.expectedTarget) === JSON.stringify(EXPECTED_TARGET), 'deployment target binding');
  expect(proof?.deploymentIdentity?.status === 'UNAVAILABLE_FRESH_SUPPORTED_OBSERVATION_REQUIRED', 'deployment identity unavailable');
  expect(proof?.deploymentIdentity?.freshObservation === null, 'no deployment observation invented');
  expect(proof?.deploymentIdentity?.identityReceiptAccepted === false, 'identity receipt not accepted');
  expect(proof?.splitProof?.sourceInventoryVerified === true, 'source inventory verified');
  expect(proof?.splitProof?.deploymentIdentityVerified === false, 'deployment identity unverified');
  expect(proof?.splitProof?.sourceToDeploymentEquivalence === 'NOT_CLAIMED', 'equivalence not claimed');
  expect(proof?.splitProof?.runtimeFunctionSchemaEquivalence === 'UNSUPPORTED', 'runtime schema equivalence unsupported');
  expect(proof?.splitProof?.package8ActivationReady === false, 'activation closed');
  expect(proof?.preservedState?.consumedReadRetried === false, 'consumed read not retried');
  expect(proof?.preservedState?.unavailableValueCount === 17, 'unavailable value count');
  expect(proof?.preservedState?.unavailableValuesSha256 === UNAVAILABLE_VALUES_SHA256, 'unavailable values digest');
  expect(proof?.preservedState?.unavailableValuesChanged === false, 'unavailable values preserved');
  expect(proof?.preservedState?.proposedWindowActivated === false, 'window inactive');
  expect(proof?.preservedState?.providerRequests === 0, 'no provider requests');
  expect(Object.values(proof?.authority || {}).every(value => value === false), 'all runtime authority closed');
  return errors;
}

function buildProof(rootPath = root) {
  const sourceInventory = collectSourceInventory(rootPath);
  return {
    schemaVersion: 1,
    packetType: 'CAD_PHASE5_PACKAGE8_CONVEX_METADATA_SPLIT_PROOF',
    status: 'SOURCE_INVENTORY_VERIFIED_DEPLOYMENT_EQUIVALENCE_UNPROVEN',
    scope: 'SOURCE_ONLY_METADATA_GATE_REDESIGN',
    preparedAtUtc: '2026-10-10T16:27:49Z',
    bindings: {
      mainCommit: MAIN_COMMIT,
      tree: SOURCE_TREE,
      stopReceiptSha256: STOP_RECEIPT_SHA256,
      bindingProposalSha256: '554fb996ba48f06109eef17026471aab9c44919926c4b203cb3355e210c39cda',
      readinessPacketSha256: 'b0d1c3b8c3c6fe85990cf0664c54935adca145bd19ae57b0ea5410c213b83cf0',
    },
    officialSourceDisposition: {
      directSystemTransportRemoved: true,
      reason: 'No versioned complete _system/cli/modules:apiSpec response schema or supported internal endpoint and credential compatibility contract exists for Convex 1.45.0.',
      sources: [
        'https://github.com/get-convex/convex-js/blob/main/src/cli/lib/functionSpec.ts',
        'https://github.com/get-convex/convex-js/blob/main/src/cli/lib/mcp/tools/functionSpec.ts',
        'https://docs.convex.dev/http-api/',
        'https://github.com/get-convex/convex-js/blob/main/src/browser/http_client.ts',
        'https://docs.convex.dev/cli/deploy-key-types',
      ],
    },
    sourceInventory,
    contractManifest: {
      path: 'offline/cad-convex/manifest.json',
      version: 87,
      baseCommit: MAIN_COMMIT,
      mode: 'offline-source-unqualified',
      inventorySourceCoverageRequired: true,
    },
    deploymentIdentity: {
      expectedTarget: EXPECTED_TARGET,
      status: 'UNAVAILABLE_FRESH_SUPPORTED_OBSERVATION_REQUIRED',
      freshObservation: null,
      identityReceiptAccepted: false,
      maximumObservationAgeMs: MAX_IDENTITY_AGE_MS,
      requiredSanitizedFields: [
        'teamSlug', 'projectSlug', 'deploymentName', 'deploymentType', 'cloudUrl',
        'observedAtUtc', 'sourceFunctionsSha256', 'sourceGeneratedApiSha256',
      ],
      acceptedClaim: 'A matching fresh supported receipt may identify the intended Convex deployment only.',
      prohibitedClaims: [
        'the checked-in source inventory is deployed',
        'the runtime function schema matches local generated types',
        'the deployment has current Package 8 adapters',
        'Package 8 runtime activation is ready',
      ],
    },
    splitProof: {
      sourceInventoryVerified: true,
      deploymentIdentityVerified: false,
      sourceToDeploymentEquivalence: 'NOT_CLAIMED',
      runtimeFunctionSchemaEquivalence: 'UNSUPPORTED',
      package8ActivationReady: false,
    },
    preservedState: {
      providerRequests: 0,
      consumedReadRetried: false,
      unavailableValueCount: 17,
      unavailableValuesSha256: UNAVAILABLE_VALUES_SHA256,
      unavailableValuesChanged: false,
      proposedWindowActivated: false,
      runtimeAuthorityChanged: false,
    },
    authority: {
      package8ActivationAuthorized: false,
      routeMountAuthorized: false,
      sessionIssuanceAuthorized: false,
      requestBodyAdmissionAuthorized: false,
      storageDispatchAuthorized: false,
      conversionDispatchAuthorized: false,
      downloadRoutingAuthorized: false,
      providerConfigurationAuthorized: false,
      deploymentAuthorized: false,
      paymentAuthorized: false,
      externalMessagesAuthorized: false,
    },
    nextGate: 'Obtain a separately approved, supported, sanitized deployment-identity receipt and the remaining 16 provider and operational bindings. Even a matching identity receipt must not be treated as source-to-deployment function equivalence.',
  };
}

function verify(rootPath = root) {
  const inventory = collectSourceInventory(rootPath);
  const proof = JSON.parse(fs.readFileSync(path.join(rootPath, PACKET_PATH), 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(path.join(rootPath, 'offline/cad-convex/manifest.json'), 'utf8'));
  return validateProof(proof, inventory, manifest);
}

if (require.main === module) {
  const write = process.argv[2] === '--write';
  if (process.argv.length > (write ? 3 : 2)) throw new Error('UNSUPPORTED_ARGUMENT');
  if (write) fs.writeFileSync(path.join(root, PACKET_PATH), `${JSON.stringify(buildProof(), null, 2)}\n`);
  else {
    const errors = verify();
    if (errors.length) throw new Error(errors.join('; '));
    const proof = buildProof();
    process.stdout.write(`${JSON.stringify({ status: 'PASS', functions: proof.sourceInventory.functionCount,
      modules: proof.sourceInventory.moduleCount, deploymentEquivalence: 'NOT_CLAIMED', activationAuthorized: false })}\n`);
  }
}

module.exports = {
  EXPECTED_TARGET,
  buildProof,
  classifyDeploymentIdentityObservation,
  collectSourceInventory,
  validateProof,
  verify,
};
