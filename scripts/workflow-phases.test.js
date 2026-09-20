const test = require('node:test');
const assert = require('node:assert/strict');
const { getWorkflowPhaseStates, getCadReviewPhaseStates, getCadReviewPhase } = require('../utils/workflowPhases');
test('qualified CAD keeps completed source and inventory separate from active review and locked outputs', () => {
  for (const currentPhase of [1,2,3,4]) assert.deepEqual(getWorkflowPhaseStates({qualifiedCad:true,currentPhase}), ['complete','complete','active','locked']);
});
test('ordinary journeys progress and explicitly skipped phases remain distinct', () => {
  assert.deepEqual(getWorkflowPhaseStates(), ['active','locked','locked','locked']);
  assert.deepEqual(getWorkflowPhaseStates({currentPhase:4}), ['complete','complete','complete','active']);
  assert.deepEqual(getWorkflowPhaseStates({currentPhase:3,skippedPhases:[2]}), ['complete','skipped','active','locked']);
  assert.deepEqual(getWorkflowPhaseStates({currentPhase:99}), getWorkflowPhaseStates());
});
test('CAD deep links default to Design and accept only named phases', () => {
  for (const [name, phase] of [['input',1],['inventory',2],['design',3],['build',4]]) assert.equal(getCadReviewPhase(`?cadPreview=mark-dispenser-v1&cadPhase=${name}`),phase);
  for (const search of ['', '?cadPhase=99', '?cadPhase=unknown']) assert.equal(getCadReviewPhase(search),3);
});
test('CAD review rail follows selected review phase while build stays locked', () => {
  assert.deepEqual(getCadReviewPhaseStates({selectedPhase:1}), ['active','complete','complete','locked']);
  assert.deepEqual(getCadReviewPhaseStates({selectedPhase:2}), ['complete','active','complete','locked']);
  assert.deepEqual(getCadReviewPhaseStates({selectedPhase:3}), ['complete','complete','active','locked']);
  assert.deepEqual(getCadReviewPhaseStates({selectedPhase:4}), ['complete','complete','complete','locked']);
});
