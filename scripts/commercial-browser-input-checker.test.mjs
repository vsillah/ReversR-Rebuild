import assert from 'node:assert/strict';
import { test, before, after, mock } from 'node:test';
import { runInNewContext } from 'node:vm';
import net from 'node:net';
import { createSyntheticProfileInputChecker } from './commercial-browser-input-checker.mjs';

before(() => {
  mock.method(globalThis, 'fetch', () => { throw new Error('Network forbidden'); });
  mock.method(net.Socket.prototype, 'connect', () => { throw new Error('Sockets forbidden'); });
});
after(() => mock.restoreAll());

function fixture(options = {}) {
  const events = [];
  let generation = 0, observations = 0, fills = 0;
  const count = () => generation > 0 ? options.focusCount ?? options.count ?? 1 : options.count ?? 1;
  const node = { tagName: 'INPUT', type: 'text', isConnected: true, disabled: false, readOnly: false,
    value: 'never-emit-field-contents', getAttribute: () => null,
    getBoundingClientRect: () => ({ width: 100, height: 40 }), ...options.node };
  const document = { activeElement: null, querySelectorAll: () => Array.from({ length: count() }, () => node) };
  const tab = {
    getAXState: async opts => {
      events.push('observe'); observations++;
      assert.deepEqual(opts, { emit: false, disableDiffing: true });
      if (options.failObservation === observations) throw new Error('private tool observation');
      return 'never-emit-full-state';
    },
    playwright: {
      getByLabel: (label, opts) => {
        assert.ok(['Profile name', 'Shop name'].includes(label));
        assert.deepEqual(opts, { exact: true });
        events.push('acquire');
        const acquired = generation;
        return {
          count: async () => count(),
          isVisible: async () => options.visible ?? true,
          isEnabled: async () => options.enabled ?? true,
          click: async () => {
            events.push('focus');
            if (options.failFocus) throw new Error('private focus exception');
            generation++; // Simulate focus-triggered rerender invalidating old references.
            Object.assign(node, options.focusNode);
            if (!options.wrongFocus) document.activeElement = node;
          },
          fill: async value => {
            events.push('fill'); fills++;
            if (acquired !== generation || options.stale) throw new Error('target token mismatch');
            if (options.failFill === 'before') throw new Error('private pre-effect failure');
            node.value = options.mismatch ? 'never-emit-mismatch' : value;
            if (options.failFill === 'after') throw new Error('private partial-effect failure');
          },
        };
      },
      getByRole: () => { throw new Error('Save and fallback actions forbidden'); },
      evaluate: async (fn, args) => {
        events.push(args.expected === null ? 'inspect' : 'equal');
        if (options.failInspect) throw new Error('private evaluator failure');
        return runInNewContext(`(${fn.toString()})(args)`, { args, document,
          getComputedStyle: () => ({ visibility: 'visible', display: 'block' }) });
      },
    },
  };
  return { tab, events, fills: () => fills };
}
const request = { account: 'A', field: 'name', phase: 'edit' };

test('fixture reproduces unsafe stale-locator fill after focus', async () => {
  const f = fixture();
  const old = f.tab.playwright.getByLabel('Profile name', { exact: true });
  await old.click();
  await assert.rejects(old.fill('synthetic-only'), /target token mismatch/);
  assert.equal(f.fills(), 1);
});

test('focus, silent observation, reacquisition, one fill, observation and boolean equality', async () => {
  for (const account of ['A', 'B']) for (const field of ['name', 'shop']) for (const phase of ['edit', 'restore']) {
    const f = fixture();
    const result = await createSyntheticProfileInputChecker(f.tab)({ account, field, phase });
    assert.deepEqual(result, { ok: true, reason: 'VALUE_CONFIRMED' });
    assert.deepEqual(f.events, ['observe', 'acquire', 'inspect', 'focus', 'observe', 'acquire', 'inspect', 'fill', 'observe', 'acquire', 'equal']);
    assert.equal(f.fills(), 1);
  }
});

for (const [name, options, reason, fills] of [
  ['zero', { count: 0 }, 'INITIAL_TARGET_UNSAFE', 0],
  ['duplicate', { count: 2 }, 'INITIAL_TARGET_UNSAFE', 0],
  ['hidden', { visible: false }, 'INITIAL_TARGET_UNSAFE', 0],
  ['disabled', { enabled: false }, 'INITIAL_TARGET_UNSAFE', 0],
  ['read-only', { node: { readOnly: true } }, 'INITIAL_TARGET_UNSAFE', 0],
  ['password', { node: { type: 'password' } }, 'INITIAL_TARGET_UNSAFE', 0],
  ['wrong focus', { wrongFocus: true }, 'FOCUSED_TARGET_UNSAFE', 0],
  ['removed after focus', { focusCount: 0 }, 'FOCUSED_TARGET_UNSAFE', 0],
  ['duplicated after focus', { focusCount: 2 }, 'FOCUSED_TARGET_UNSAFE', 0],
  ['read-only after focus', { focusNode: { readOnly: true } }, 'FOCUSED_TARGET_UNSAFE', 0],
  ['disabled after focus', { focusNode: { disabled: true } }, 'FOCUSED_TARGET_UNSAFE', 0],
  ['disconnected after focus', { focusNode: { isConnected: false } }, 'FOCUSED_TARGET_UNSAFE', 0],
  ['focus failure', { failFocus: true }, 'FOCUS_FAILED', 0],
  ['initial observation', { failObservation: 1 }, 'INITIAL_OBSERVATION_FAILED', 0],
  ['focus observation', { failObservation: 2 }, 'FOCUS_OBSERVATION_FAILED', 0],
  ['final observation', { failObservation: 3 }, 'POST_FILL_OBSERVATION_FAILED', 1],
  ['inspection', { failInspect: true }, 'INITIAL_TARGET_UNSAFE', 0],
  ['before effect', { failFill: 'before' }, 'FILL_UNCONFIRMED', 1],
  ['partial effect', { failFill: 'after' }, 'FILL_UNCONFIRMED', 1],
  ['stale reacquisition', { stale: true }, 'FILL_UNCONFIRMED', 1],
  ['mismatch', { mismatch: true }, 'VALUE_UNCONFIRMED', 1],
]) test(`stops without retries or Save: ${name}`, async () => {
  const f = fixture(options);
  const check = createSyntheticProfileInputChecker(f.tab);
  const result = await check(request);
  assert.deepEqual(result, { ok: false, reason });
  assert.equal(f.fills(), fills);
  const before = [...f.events];
  assert.deepEqual(await check(request), { ok: false, reason: 'ATTEMPT_ALREADY_CONSUMED' });
  assert.deepEqual(f.events, before);
  const evidence = JSON.stringify(result);
  assert.ok(!/private|never-emit|Synthetic|mismatch|target token/.test(evidence));
  if (reason === 'FILL_UNCONFIRMED') assert.equal(f.events.at(-1), 'fill');
});

test('only enumerated synthetic profile operations are accepted; no credential or arbitrary-value path', async () => {
  for (const bad of [null, { ...request, account: 'C' }, { ...request, field: 'Login email' },
    { ...request, field: 'Account password' }, { ...request, value: 'unapproved' }, { ...request, phase: 'retry' }]) {
    const f = fixture();
    assert.deepEqual(await createSyntheticProfileInputChecker(f.tab)(bad), { ok: false, reason: 'INVALID_REQUEST' });
    assert.deepEqual(f.events, []);
  }
});
