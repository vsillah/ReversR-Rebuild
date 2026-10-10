const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const proposalPath = path.join(root, 'docs/cad-phase5-package8-public-evidence/binding-completion-proposal.json');

function check() {
  const proposal = JSON.parse(fs.readFileSync(proposalPath, 'utf8'));
  const authority = proposal.authority || {};
  const unavailable = proposal.unavailableValues || [];
  const start = Date.parse(proposal.proposedWindow?.startUtc);
  const end = Date.parse(proposal.proposedWindow?.endUtc);

  if (proposal.status !== 'BLOCKED_PROVIDER_METADATA_UNKNOWN') throw new Error('status');
  if (proposal.source?.mainCommit !== '6c822b215bc74fc1203442bfef903855a9cbe5df') throw new Error('main');
  if (proposal.source?.tree !== '0063973062495d3f06e93644f041c57d76989f42') throw new Error('tree');
  if (proposal.source?.productionDeployment !== 'dpl_9LJyxxsuq8pqEXBTGidGvagLxfgb') throw new Error('deployment');
  if (proposal.source?.readinessPacketSha256 !== 'b0d1c3b8c3c6fe85990cf0664c54935adca145bd19ae57b0ea5410c213b83cf0') throw new Error('readiness');
  if (!Object.values(authority).every(value => value === false)) throw new Error('authority');
  if (proposal.providerReadDisposition?.convex?.outcome !== 'UNKNOWN_NO_PARSABLE_OUTPUT') throw new Error('convex outcome');
  if (proposal.providerReadDisposition?.convex?.commandCount !== 1
      || proposal.providerReadDisposition?.convex?.retryPerformed !== false) throw new Error('convex count');
  if (proposal.providerReadDisposition?.cloudflare?.commandCount !== 0
      || proposal.providerReadDisposition?.sandbox?.commandCount !== 0
      || proposal.providerReadDisposition?.monitoring?.commandCount !== 0) throw new Error('post-stop reads');
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start
      || end - start > 15 * 60 * 1000 || proposal.proposedWindow?.activated !== false) throw new Error('window');
  if (unavailable.length !== 17 || !unavailable.some(value => value.includes('Spend Management'))
      || !unavailable.some(value => value.includes('Convex'))) throw new Error('unavailable');
  return { status: 'PASS', unavailableBindings: unavailable.length, activationAuthorized: false };
}

if (require.main === module) process.stdout.write(`${JSON.stringify(check())}\n`);
module.exports = { check };
