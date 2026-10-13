const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('desktop viewer keeps a reduced-height safety margin and bounded flex chain', () => {
  const hook = read('hooks/useCadDesktopWorkspace.ts');
  const workspace = read('components/DesktopCadWorkspace.tsx');
  const phaseLayout = read('components/CadDesktopPhaseLayout.tsx');
  const design = read('components/CadDesignReview.tsx');

  assert.match(hook, /Math\.max\(300, Math\.min\(720, height - 344\)\)/);
  assert.match(workspace, /shell: \{[^}]*minHeight: 0[^}]*overflow: 'hidden'/);
  assert.match(workspace, /workspace: \{[^}]*minHeight: 0[^}]*overflow: 'hidden'/);
  assert.match(workspace, /workArea: \{[^}]*minHeight: 0[^}]*overflow: 'hidden'/);
  assert.match(phaseLayout, /layout: \{[^}]*minHeight: 0[^}]*overflow: 'hidden'/);
  assert.match(design, /paddingBottom: desktop \? Spacing\.xl : 0/);
});
test('saved active tour progress stays resumable without replacing first-arrival review context', () => {
  const app = read('app/index.tsx');

  assert.match(app, /const hasSavedActiveTour = parsed\.active === true/);
  assert.match(app, /setTourHistoryResumeDetected\(hasSavedActiveTour\)/);
  assert.doesNotMatch(app, /setTourActive\(hasSavedActiveTour\)/);
  assert.match(app, /if \(!tourStateLoaded\) \{[\s\S]*pendingTourStartRef\.current = true;[\s\S]*return;/);
  assert.match(app, /requestedWorkspace === 'tour'[\s\S]*startTour\(\)/);
  assert.match(app, /key=\{`desktop-cad:\$\{activeCadPreview\.fixture\.sha256\}`\}/);
  assert.match(app, /canvasScrollable=\{cadPhase !== 3 \|\| tourActive\}/);
});
test('labeled desktop rail bounds local projects and preserves keyboard tree behavior', () => {
  const app = read('app/index.tsx');
  const navigation = read('components/DesktopNavigation.tsx');

  assert.match(app, /getAllInnovations/);
  assert.match(app, /desktopProjects\.map\(toDesktopProjectNavItem\)/);
  assert.match(navigation, /const INLINE_PROJECT_LIMIT = 3/);
  assert.match(navigation, /projects\.slice\(0, INLINE_PROJECT_LIMIT\)/);
  assert.match(navigation, /selectedProject[\s\S]*collapsedProjects/);
  assert.match(navigation, /role="tree"/);
  assert.match(navigation, /role="treeitem"/);
  assert.match(navigation, /aria-expanded=\{compact \? undefined : projectsExpanded\}/);
  assert.match(navigation, /Show \$\{hiddenProjectCount\} more/);
  assert.match(navigation, /Show fewer/);
  assert.match(navigation, /View all projects/);
  assert.match(navigation, /ArrowDown/);
  assert.match(navigation, /ArrowUp/);
  assert.match(navigation, /ArrowLeft/);
  assert.match(navigation, /visibleProjects\.length - 1/);
});
test('desktop rail uses explicit Manage destinations and reserves the bottom pair for New and Tour', () => {
  const app = read('app/index.tsx');
  const account = read('app/account.tsx');
  const navigation = read('components/DesktopNavigation.tsx');
  const manageIndex = navigation.indexOf('testID="desktop-nav-manage"');
  const shortcutsIndex = navigation.indexOf('testID="desktop-nav-shortcuts"');
  const newIndex = navigation.indexOf('testID="desktop-nav-new"');
  const tourIndex = navigation.indexOf("item('tour', 'Tour'");

  for (const destination of ['Plan', 'AI', 'Inventory', 'Support', 'Legal']) {
    assert.match(navigation, new RegExp(`label: '${destination}'`));
  }
  assert.match(navigation, /onOpenSettings\(destination\.id\)/);
  assert.match(navigation, /accessibilityLabel="Settings"[\s\S]*testID="desktop-nav-settings"/);
  assert.match(app, /onOpenSettings: openSettings/);
  assert.match(account, /settingsSection=\$\{section\}/);
  assert.doesNotMatch(navigation, /label: 'Admin'|label: 'Profile'|'More'|>More</);
  assert.ok(manageIndex >= 0 && shortcutsIndex > manageIndex && newIndex > shortcutsIndex,
    'Manage and Shortcuts must remain above the fixed bottom actions');
  assert.ok(newIndex >= 0 && tourIndex > newIndex, 'New must precede Tour in the fixed rail actions');
  assert.doesNotMatch(`${app}\n${navigation}`, /fetch\s*\(|cadAuthenticatedIgs|uploadSession|R2|Sandbox|provider request/i);
});
