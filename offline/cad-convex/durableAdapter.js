// Source-only durable adapter boundary. No driver injection or authority switch.
const METHODS = Object.freeze(['readExact', 'readAuthority', 'transact', 'claim',
  'settle', 'scanPage', 'stop']);
function blocked() {
  return Object.freeze({ decision: 'LIVE_RUN_BLOCKED', executable: false,
    liveRunAuthorized: false, liveQualified: false, uploadsEnabled: false,
    conversionEnabled: false, publicationAuthorized: false,
    remoteAttempts: 0, retainHolds: true, retainLeases: true, redispatch: false });
}
// Arguments are deliberately never inspected, resolved, invoked or echoed.
function createDurableAdapter() {
  return Object.freeze(Object.fromEntries(METHODS.map(name => [name, blocked])));
}
module.exports = { METHODS, blocked, createDurableAdapter };
