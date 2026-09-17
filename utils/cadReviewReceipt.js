const { MARK_DISPENSER_RESULT: fixture } = require('./cadInternalTesterPreview');

const REVIEW_CHECKS = Object.freeze([
  { id: 'source', label: 'Source & metadata', instruction: 'Confirm Dispenser.IGS and the imported X / Y / Z extents in Compare. These are metadata, not measured dimensions.' },
  { id: 'reference', label: 'Reference comparison', instruction: 'Compare Front, Left and Top with the matching wheel views; use Drawing for overall shape and missing features.' },
  { id: 'orientation', label: 'Orientation', instruction: 'Open the wheel. Check all six views, then use the center reset for fitted isometric.' },
  { id: 'rotation', label: 'Rotation', instruction: 'Drag the model in both directions. Check that movement follows your input.' },
  { id: 'zoom', label: 'Zoom & reset', instruction: 'Try + / − and a mouse wheel or pinch. Reset should restore the whole model.' },
  { id: 'clipping', label: 'Clipping & framing', instruction: 'At fitted zoom, inspect every view for cut-off geometry or controls covering the model.' },
  { id: 'contrast', label: 'Contrast & detail', instruction: 'Check that edges, openings and surfaces remain readable on the neutral canvas.' },
  { id: 'touch', label: 'Mobile gestures', instruction: 'On a touch screen, rotate with one finger and pinch with two. Otherwise leave Not tested.' },
]);
const REVIEW_STATES = Object.freeze(['not-tested', 'pass', 'issue']);
const STORAGE_KEY = 'reversr:mark-dispenser-review:v1';

function normalizeReview(input) {
  return Object.fromEntries(REVIEW_CHECKS.map(({ id }) => [id,
    input && Object.hasOwn(input, id) && REVIEW_STATES.includes(input[id]) ? input[id] : 'not-tested',
  ]));
}
function createReviewReceipt(input) {
  const checks = normalizeReview(input);
  const counts = { pass: 0, issue: 0, 'not-tested': 0 };
  Object.values(checks).forEach(state => counts[state]++);
  return {
    schema: 'reversr-cad-visual-review-v1',
    fixture: 'mark-dispenser-v1',
    source: { file: fixture.sourceFileName, sha256: fixture.sha256, bytes: fixture.bytes },
    displayMeshSha256: fixture.previewGeometry.sha256,
    references: fixture.referenceImages.map(({ label, sha256 }) => ({ label, sha256 })),
    importedExtents: { axes: 'X × Y × Z', values: fixture.expectedDimensions, units: fixture.units },
    checks, counts,
    outcome: counts.issue ? 'issues-recorded' : counts['not-tested'] ? 'incomplete' : 'visual-checks-passed',
    exclusions: ['Dimensional inspection', 'Manufacturing certification', 'Arbitrary-file fidelity', 'Upload or conversion qualification'],
    scope: 'Reviewer-reported visual checks of the fixed public fixture only; no upload, conversion or external submission.',
  };
}
function restoreReview(serialized) {
  try {
    const receipt = JSON.parse(serialized);
    if (receipt?.schema !== 'reversr-cad-visual-review-v1' || receipt?.fixture !== 'mark-dispenser-v1'
      || receipt?.source?.sha256 !== fixture.sha256 || receipt?.displayMeshSha256 !== fixture.previewGeometry.sha256) return normalizeReview(null);
    return normalizeReview(receipt.checks);
  } catch { return normalizeReview(null); }
}
module.exports = { REVIEW_CHECKS, REVIEW_STATES, STORAGE_KEY, normalizeReview, createReviewReceipt, restoreReview };
