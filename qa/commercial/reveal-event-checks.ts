// Runs inside the local mock page, never against a live auth destination.
// Native event dispatch belongs to this explicit test fixture, not CUA evaluate.
export async function runRevealEventChecks() {
  const input = document.querySelector<HTMLInputElement>('[aria-label="Account password"]')!;
  const eye = document.querySelector<HTMLElement>('[aria-label="Hold to show password"]')!;
  const tick = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  const assert = (condition: boolean, label: string) => { if (!condition) throw Error(label); };
  const setLength = async (length: number) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String.fromCharCode(120).repeat(length));
    input.dispatchEvent(new Event('input', { bubbles: true })); await tick();
  };
  const pointer = (type: string, pointerType = 'mouse', outside = false) => {
    const bounds = eye.getBoundingClientRect();
    eye.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, isPrimary: true, pointerType,
      clientX: outside ? bounds.right + 50 : bounds.left + 20, clientY: bounds.top + 20 }));
  };
  const masked = () => input.type === 'password';
  const results: string[] = [];
  try {
    const target = eye.getBoundingClientRect();
    assert(eye.closest('[title]')?.getAttribute('title') === 'Hold to show password', 'Eye tooltip did not survive rendering');
    assert(target.width >= 44 && target.height >= 44, 'Eye hit target is too small');
    assert(parseFloat(getComputedStyle(input).paddingRight) >= 56, 'Password text has no reserved eye space');
    await setLength(0); pointer('pointerdown'); await tick(); assert(masked(), 'Empty input revealed');
    await setLength(9);
    for (const pointerType of ['mouse', 'touch']) {
      for (const end of ['pointerup', 'pointercancel', 'touchcancel', 'outside', 'lostpointercapture', 'blur', 'visibilitychange']) {
        pointer('pointerdown', pointerType); await tick(); assert(!masked(), `${pointerType} hold did not reveal`);
        if (end === 'outside') pointer('pointermove', pointerType, true);
        else if (end === 'blur') window.dispatchEvent(new Event('blur'));
        else if (end === 'visibilitychange') document.dispatchEvent(new Event('visibilitychange'));
        else window.dispatchEvent(new Event(end));
        await tick(); assert(masked(), `${pointerType} ${end} did not mask`);
        results.push(`${pointerType} ${end}`);
      }
    }
    for (const key of [' ', 'Enter']) {
      eye.focus(); eye.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      await tick(); assert(!masked(), 'Keyboard hold did not reveal');
      document.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
      await tick(); assert(masked(), 'Keyboard release did not mask');
      results.push(key === ' ' ? 'Space hold/release' : 'Enter hold/release');
    }
    eye.focus(); pointer('pointerdown'); await tick(); eye.blur(); await tick(); assert(masked(), 'Eye blur did not mask');
    pointer('pointerdown'); await tick(); await setLength(0); assert(masked(), 'Clear did not mask');
    assert(document.querySelector('[aria-label="Account password"]') === input, 'Input remounted');
    return `${results.length + 3} rendered checks passed; input stayed mounted; no auth submitted.`;
  } finally { await setLength(0); window.dispatchEvent(new Event('pointercancel')); }
}
