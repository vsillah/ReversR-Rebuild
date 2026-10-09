const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const viewer = fs.readFileSync('components/CadFixtureViewer.tsx', 'utf8');

test('fixed-view handlers do not change material, tint, lights or grid visibility', () => {
  const viewHandler = viewer.slice(viewer.indexOf('const updateView ='), viewer.indexOf('viewerActions.current = {'));
  assert.doesNotMatch(viewHandler, /modelMaterial|edgeMaterial|\.color|\.intensity|\.visible/);
  assert.equal((viewer.match(/new THREE\.MeshLambertMaterial/g) || []).length, 1);
  assert.doesNotMatch(viewer, /HemisphereLight|MeshStandardMaterial|modelMaterial\.color/);
  const lights = [...viewer.matchAll(/new THREE\.(?:Ambient|Directional)Light\((0x[0-9a-f]+)/g)];
  assert.equal(lights.length, 3);
  assert(lights.every(match => match[1] === '0xffffff'));
  assert.match(viewer, /camera\.add\(key\)/);
  assert.match(viewer, /camera\.add\(fill\)/);
});

test('grid stays behind the full rotating model and disposes its resources', () => {
  assert.match(viewer, /new THREE\.GridHelper/);
  assert.match(viewer, /grid\.position\.copy\(camera\.position\)\.normalize\(\)\.multiplyScalar\(-radius \* 1\.4\)/);
  assert.match(viewer, /grid\.quaternion\.copy\(camera\.quaternion\)/);
  assert.match(viewer, /grid\.geometry\.dispose\(\)/);
  assert.match(viewer, /gridMaterials\.forEach\(material => material\.dispose\(\)\)/);
  assert.match(viewer, /new THREE\.GridHelper\(radius \* 18, 72,/);
  assert.doesNotMatch(viewer, /cad-view-grid-label|Unscaled grid|expectedDimensions|fixture\.units/);
  const qa = fs.readFileSync('docs/qa/cad-neutral-grid/README.md', 'utf8');
  assert.match(qa, /not\s+an object-attached or certified measuring workplane/);
});

test('fixture harness remains the original panel; rejected workflow is absent', () => {
  const panel = fs.readFileSync('components/CadImportPanel.tsx', 'utf8');
  assert.doesNotMatch(panel, /CadGuidedReview|cadReviewReceipt|Copy receipt/);
  assert.match(panel, /cad-review-qualified-result/);
  for (const path of ['components/CadGuidedReview.tsx', 'utils/cadReviewReceipt.js', 'utils/cadReviewReceipt.d.ts']) assert.equal(fs.existsSync(path), false);
});

test('shared Orbit and Move controller replaces the standalone pan overlay', () => {
  assert.doesNotMatch(viewer, /data-testid="cad-pan-controls"|aria-label="Model pan controls"/);
  assert.match(viewer, /useState<ControllerMode>\('orbit'\)/);
  assert.match(viewer, /data-testid="cad-view-controller"/);
  assert.match(viewer, /data-testid="cad-controller-mode-orbit"/);
  assert.match(viewer, /data-testid="cad-controller-mode-move"/);
  assert.match(viewer, /aria-pressed=\{controlMode === 'orbit'\}/);
  assert.match(viewer, /aria-pressed=\{controlMode === 'move'\}/);
  assert.match(viewer, /data-testid="cad-shared-control-ring"/);
  assert.match(viewer, /data-testid="cad-controller-center-action"/);
  assert.match(viewer, /moveControls: Array/);
  const moveControlList = viewer.slice(viewer.indexOf('const moveControls:'), viewer.indexOf('const isOrbitView'));
  assert.equal((moveControlList.match(/\n  \{ position:/g) || []).length, 4);
  assert.doesNotMatch(viewer, /action: 'pan(?:UpRight|DownRight|DownLeft|UpLeft)'/);
  assert.match(viewer, /visibility: controlMode === 'orbit' \? 'visible' : 'hidden'/);
  assert.match(viewer, /controlMode === 'orbit' \? elevationViews\.map/);
  assert.match(viewer, /aria-label=\{controlMode === 'orbit' \? 'Reset model to fitted isometric view' : 'Reset model pan to center'\}/);
  assert.match(viewer, /overflowAnchor: 'none'/);
  assert.match(viewer, /onPointerDown=\{preventPointerFocusScroll\}/);
  assert.match(viewer, /onMouseDown=\{preventPointerFocusScroll\}/);
  assert.match(viewer, /onClick=\{\(\) => setControlMode\('orbit'\)\}/);
  assert.match(viewer, /onClick=\{\(\) => setControlMode\('move'\)\}/);
  assert.doesNotMatch(viewer, /pendingModeScrollRef|controllerSessionScrollRef|setControllerModePreservingScroll|modeToggleReady/);
  assert.ok(viewer.indexOf('aria-label="Controller mode"') < viewer.indexOf('data-testid="cad-shared-control-ring"'));
  const resetPanHandler = viewer.slice(viewer.indexOf('viewerActions.current.resetPan ='), viewer.indexOf('const onPointerDown ='));
  assert.match(resetPanHandler, /rig\.position\.set\(0, 0, 0\)/);
  assert.match(resetPanHandler, /dataset\.pan = '0\.000,0\.000,0\.000'/);
  assert.doesNotMatch(resetPanHandler, /setView|setZoom|rig\.rotation|camera\.position/);
  const panHandler = viewer.slice(viewer.indexOf('const panByPixels ='), viewer.indexOf('viewerActions.current.resetPan ='));
  assert.match(panHandler, /rig\.position\.addScaledVector/);
  assert.doesNotMatch(panHandler, /updateView|setView|setZoom|rig\.rotation/);
});

test('viewer guidance is contextual, accessible, and absent as a persistent canvas overlay', () => {
  assert.doesNotMatch(viewer, /cad-interaction-guide|interactionGuideStyle|Drag orbit · Shift\/right-drag pan/);
  assert.doesNotMatch(viewer, /\btitle=/);
  assert.match(viewer, /data-testid="cad-control-tooltip" role="tooltip"/);
  assert.match(viewer, /activeTooltip \? <div id=\{tooltipId\}/);
  assert.match(viewer, /onPointerEnter: \(\) => setActiveTooltip/);
  assert.match(viewer, /onPointerLeave: \(\) => setActiveTooltip/);
  assert.match(viewer, /onFocus: \(\) => setActiveTooltip/);
  assert.match(viewer, /onBlur: \(\) => setActiveTooltip/);
  assert.match(viewer, /if \(event\.key !== 'Escape'\) return/);
  assert.match(viewer, /left: 12, right: 76, bottom: 12/);
  assert.match(viewer, /maxWidth: 'calc\(100% - 88px\)'/);

  const expectedTooltipBindings = [
    "tooltipBindings('command-view', 'View: open Orbit and Move controls.')",
    "tooltipBindings('command-zoom', 'Zoom: open zoom controls.')",
    "tooltipBindings('mode-orbit', 'Drag the model to orbit. Use arrows for fixed views.')",
    "tooltipBindings('mode-move', 'Shift/right-drag pan. Use arrows for cardinal nudges.')",
    'tooltipBindings(`fixed-${view}`',
    'tooltipBindings(`move-${control.action}`',
    "tooltipBindings('center-action'",
    "tooltipBindings('zoom-in'",
    "tooltipBindings('zoom-fit', 'Reset zoom to the fitted level.')",
    "tooltipBindings('zoom-slider', 'Drag or use arrow keys to set model zoom.')",
    "tooltipBindings('zoom-out'",
  ];
  expectedTooltipBindings.forEach(binding => assert.ok(viewer.includes(binding), `missing ${binding}`));

  const expectedAriaLabels = [
    'Open View controls',
    'Open Zoom controls',
    'Use Orbit controls for drag rotation and fixed views',
    'Use Move controls for panning and cardinal nudges',
    'Show fixed ${viewLabels[view].toLowerCase()} view',
    '${control.label} one step',
    'Reset model to fitted isometric view',
    'Reset model pan to center',
    'Zoom model in one step',
    'Reset model zoom to fitted level',
    'Adjust model zoom level',
    'Zoom model out one step',
  ];
  expectedAriaLabels.forEach(label => assert.ok(viewer.includes(label), `missing ${label}`));
});

test('compact command strip owns mutually exclusive View and Zoom popovers', () => {
  assert.match(viewer, /useState<ActivePanel>\(null\)/);
  assert.match(viewer, /data-testid="cad-command-strip"/);
  assert.match(viewer, /data-testid="cad-command-view"/);
  assert.match(viewer, /data-testid="cad-command-zoom"/);
  assert.match(viewer, /role="toolbar" aria-label="Viewer commands"/);
  assert.match(viewer, /import \{ Ionicons \} from '@expo\/vector-icons'/);
  assert.match(viewer, /name="cube-outline" size=\{20\} color="#e8fffa"/);
  assert.match(viewer, /name="search-outline" size=\{20\} color="#e8fffa"/);
  assert.equal((viewer.match(/style=\{commandIconStyle\}/g) || []).length, 2);
  assert.match(viewer, /width: 20, height: 20, lineHeight: 0/);
  assert.match(viewer, /width: 36, height: 36, minWidth: 36, minHeight: 36/);
  const commandStripMarkup = viewer.slice(viewer.indexOf('data-testid="cad-command-strip"'), viewer.indexOf('<span role="status"'));
  assert.doesNotMatch(commandStripMarkup, /◇|⌕/);
  assert.match(viewer, /setActivePanel\(current => current === panel \? null : panel\)/);
  assert.match(viewer, /hidden=\{activePanel !== 'view'\}/);
  assert.match(viewer, /display: activePanel === 'view' \? 'grid' : 'none'/);
  assert.match(viewer, /data-testid="cad-zoom-popover" hidden=\{activePanel !== 'zoom'\}/);
  assert.match(viewer, /display: activePanel === 'zoom' \? 'flex' : 'none'/);
  assert.doesNotMatch(viewer, /zoomRailPanelStyle|expandedZoomRailPanelStyle/);

  assert.match(viewer, /window\.setTimeout\(\(\) => \{/);
  assert.match(viewer, /\}, 3000\)/);
  assert.match(viewer, /activePanelElement\?\.contains\(document\.activeElement\)/);
  assert.match(viewer, /panelPointerDownRef\.current/);
  assert.match(viewer, /!controlsRef\.current\?\.contains\(event\.target\)/);
  assert.match(viewer, /onPointerCancel=\{onPanelPointerEnd\}/);
  assert.match(viewer, /window\.requestAnimationFrame\(\(\) => origin\?\.focus\(\)\)/);

  const gestureHandlers = viewer.slice(viewer.indexOf('const onPointerDown ='), viewer.indexOf('const preventContextMenu'));
  assert.match(gestureHandlers, /event\.shiftKey \|\| event\.button === 2/);
  assert.match(gestureHandlers, /pointers\.size === 2/);
  assert.match(gestureHandlers, /const onWheel =/);
  assert.doesNotMatch(gestureHandlers, /activePanel/);
});
