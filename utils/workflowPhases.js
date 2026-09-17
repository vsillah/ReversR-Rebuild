const PHASE_NAMES = Object.freeze(['Input', 'Inventory', 'Design', 'Build']);
const PHASE_STATES = Object.freeze(['complete', 'active', 'locked', 'skipped']);

// Reviewing a completed phase does not erase its progress. CAD qualification is
// evidence for source acquisition/inventory, never manufacturing readiness.
function getWorkflowPhaseStates({ currentPhase = 1, qualifiedCad = false, skippedPhases = [] } = {}) {
  if (qualifiedCad) return ['complete', 'complete', 'active', 'locked'];
  const current = Number.isInteger(currentPhase) && currentPhase >= 1 && currentPhase <= 4 ? currentPhase : 1;
  return PHASE_NAMES.map((_, index) => {
    const phase = index + 1;
    if (phase === current) return 'active';
    if (skippedPhases.includes(phase)) return 'skipped';
    return phase < current ? 'complete' : 'locked';
  });
}
function getCadReviewPhase(search) {
  const name = new URLSearchParams(search || '').get('cadPhase');
  const index = PHASE_NAMES.findIndex(phase => phase.toLowerCase() === name);
  return index < 0 ? 3 : index + 1;
}
module.exports = { PHASE_NAMES, PHASE_STATES, getWorkflowPhaseStates, getCadReviewPhase };
