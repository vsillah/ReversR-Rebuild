import { test, expect } from 'vitest';
import { bindPasswordRevealAppState, bindPasswordRevealInterruptions, createMomentaryPasswordReveal } from '../../utils/momentaryPasswordReveal';

test('hold lifecycle masks on release/cancel/blur/submit and cannot reveal when disabled or disposed', () => {
  let shown = false;
  const control = createMomentaryPasswordReveal(value => { shown = value; });
  control.start(); expect(shown).toBe(false);
  control.configure(true);
  for (const interruption of ['release', 'pointer-leave', 'touch-cancel', 'eye-blur', 'submit']) {
    control.start(); expect(shown, interruption).toBe(true);
    control.mask(); expect(shown, interruption).toBe(false);
  }
  for (const condition of ['empty', 'busy', 'auth-state-change']) {
    control.configure(true); control.start();
    control.configure(false); control.start(); expect(shown, condition).toBe(false);
  }
  control.configure(true); control.start(); control.dispose(); control.start(); expect(shown).toBe(false);
});

test('web outside-release, cancellation, keyboard, blur and visibility listeners mask and detach', () => {
  const win = new EventTarget(), doc = new EventTarget();
  let shown = false, calls = 0;
  const mask = () => { shown = false; calls++; };
  const detach = bindPasswordRevealInterruptions(mask, win, doc);
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture', 'mouseup', 'touchend', 'touchcancel', 'keyup', 'blur', 'pagehide']) {
    shown = true; win.dispatchEvent(new Event(event)); expect(shown, event).toBe(false);
  }
  shown = true; doc.dispatchEvent(new Event('visibilitychange')); expect(shown).toBe(false);
  detach(); const afterDetach = calls;
  win.dispatchEvent(new Event('keyup')); doc.dispatchEvent(new Event('visibilitychange'));
  expect(calls).toBe(afterDetach);
});
test('native AppState background/inactive mask; returning active does not reveal; listener cleans up', () => {
  let shown = true, removed = false;
  let change: (state: string) => void = () => {};
  const detach = bindPasswordRevealAppState(() => { shown = false; }, {
    addEventListener: (_event, listener) => { change = listener; return { remove: () => { removed = true; } }; },
  });
  for (const state of ['inactive', 'background']) {
    shown = true; change(state); expect(shown).toBe(false);
    change('active'); expect(shown).toBe(false);
  }
  detach(); expect(removed).toBe(true); expect(shown).toBe(false);
});
