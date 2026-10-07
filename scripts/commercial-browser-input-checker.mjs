const stateOptions = Object.freeze({ emit: false, disableDiffing: true });
const labels = Object.freeze({ name: 'Profile name', shop: 'Shop name' });

// Read-only browser evaluation. Field contents never leave the browser context.
function inspectTarget({ label, expected, requireFocus }) {
  const nodes = document.querySelectorAll(`[aria-label="${label}"]`);
  if (nodes.length !== 1) return false;
  const node = nodes[0];
  const style = getComputedStyle(node);
  const rect = node.getBoundingClientRect();
  return node.tagName === 'INPUT' && node.type === 'text' && node.isConnected
    && !node.disabled && !node.readOnly && node.getAttribute('aria-disabled') !== 'true'
    && rect.width > 0 && rect.height > 0 && style.visibility === 'visible' && style.display !== 'none'
    && (!requireFocus || document.activeElement === node)
    && (expected === null || node.value === expected);
}

/** One instance permits one attempt only. No Save, retries, sleeps or fallback. */
export function createSyntheticProfileInputChecker(tab) {
  let consumed = false;
  return async function check(request) {
    if (consumed) return { ok: false, reason: 'ATTEMPT_ALREADY_CONSUMED' };
    consumed = true;
    let reason = 'INVALID_REQUEST';
    try {
      if (!request || typeof request !== 'object' || Array.isArray(request)
          || Reflect.ownKeys(request).length !== 3 || Object.keys(request).sort().join(',') !== 'account,field,phase'
          || !['A', 'B'].includes(request.account) || !['name', 'shop'].includes(request.field)
          || !['edit', 'restore'].includes(request.phase)) return { ok: false, reason };
      const label = labels[request.field];
      const base = `Synthetic Qualification ${request.field === 'shop' ? 'Shop ' : ''}${request.account}`;
      const expected = request.phase === 'edit' ? `${base} UI Check` : base;
      const fresh = () => tab.playwright.getByLabel(label, { exact: true });
      const ready = async locator => await locator.count() === 1
        && await locator.isVisible() === true && await locator.isEnabled() === true;
      const inspect = (value, focus) => tab.playwright.evaluate(inspectTarget, { label, expected: value, requireFocus: focus });

      reason = 'INITIAL_OBSERVATION_FAILED';
      await tab.getAXState(stateOptions); // Never return or emit the tree.
      reason = 'INITIAL_TARGET_UNSAFE';
      const initial = fresh();
      if (!await ready(initial) || await inspect(null, false) !== true) return { ok: false, reason };
      reason = 'FOCUS_FAILED';
      await initial.click(); // Semantic click on this text input is the explicit focus action.
      reason = 'FOCUS_OBSERVATION_FAILED';
      await tab.getAXState(stateOptions);
      reason = 'FOCUSED_TARGET_UNSAFE';
      const target = fresh(); // Never reuse the pre-focus locator.
      if (!await ready(target) || await inspect(null, true) !== true) return { ok: false, reason };
      reason = 'FILL_UNCONFIRMED';
      await target.fill(expected); // Exactly one dispatch, including uncertain/partial failures.
      reason = 'POST_FILL_OBSERVATION_FAILED';
      await tab.getAXState(stateOptions);
      reason = 'VALUE_UNCONFIRMED';
      const after = fresh();
      if (!await ready(after) || await inspect(expected, true) !== true) return { ok: false, reason };
      return { ok: true, reason: 'VALUE_CONFIRMED' };
    } catch {
      return { ok: false, reason }; // Never serialize tool exceptions or inputs.
    }
  };
}
