#!/usr/bin/env node
// Local internal entry point. The mode-0600 binding module must construct all
// approved ports explicitly; this runner never reads environment values.
const fs = require('node:fs');
const path = require('node:path');
const {
  COMMAND_REVIEW_GATE,
  createCadPhase5Package8InternalQualificationCommand,
} = require('../server/cadPhase5Package8InternalQualificationCommand');
const {
  classifyPackage8SetupFailure,
  createPackage8SetupTerminalGuard,
  requirePackage8ApprovalIssued,
} = require('../server/cadPhase5Package8SetupTerminal');

const fail = code => {
  process.stdout.write(`${JSON.stringify({ ok: false, code })}\n`);
  process.exitCode = 1;
};

async function main(argv = process.argv.slice(2)) {
  if (argv.length !== 2 || argv[0] !== '--binding-module') {
    fail('PACKAGE8_INTERNAL_BINDING_ARGUMENT_INVALID');
    return;
  }
  const bindingPath = path.resolve(argv[1]);
  let stat;
  try { stat = fs.lstatSync(bindingPath); } catch {
    fail('PACKAGE8_INTERNAL_BINDING_UNAVAILABLE');
    return;
  }
  if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0) {
    fail('PACKAGE8_INTERNAL_BINDING_CUSTODY_INVALID');
    return;
  }
  let binding;
  try {
    const loaded = require(bindingPath);
    if (typeof loaded.createPackage8QualificationCommandInputs !== 'function') throw Error();
    binding = await loaded.createPackage8QualificationCommandInputs(Object.freeze({
      setupTerminal: Object.freeze({
        createGuard: createPackage8SetupTerminalGuard,
        requireApprovalIssued: requirePackage8ApprovalIssued,
      }),
    }));
  } catch (error) {
    fail(classifyPackage8SetupFailure(error));
    return;
  }
  const command = createCadPhase5Package8InternalQualificationCommand({
    ...binding,
    reviewOnly: true,
    commandGate: COMMAND_REVIEW_GATE,
  });
  const result = await command.execute();
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (result.ok !== true) process.exitCode = 1;
}

if (require.main === module) {
  main().catch(() => fail('PACKAGE8_INTERNAL_QUALIFICATION_OUTCOME_UNKNOWN'));
}

module.exports = { main };
