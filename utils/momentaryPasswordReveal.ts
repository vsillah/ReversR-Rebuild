// This controller never receives or stores password text.
export function createMomentaryPasswordReveal(update: (revealed: boolean) => void) {
  let enabled = false;
  let disposed = false;
  const mask = () => { if (!disposed) update(false); };
  return {
    mask,
    configure(allowed: boolean) { enabled = allowed; mask(); },
    start() { if (enabled && !disposed) update(true); },
    dispose() { mask(); enabled = false; disposed = true; },
  };
}

type Target = Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;
export function bindPasswordRevealAppState(mask: () => void, appState: {
  addEventListener(event: 'change', listener: (state: string) => void): { remove(): void };
}) {
  const subscription = appState.addEventListener('change', state => { if (state !== 'active') mask(); });
  return () => { subscription.remove(); mask(); };
}

export function bindPasswordRevealInterruptions(mask: () => void, windowTarget: Target, documentTarget: Target) {
  const bindings: [Target, string][] = [
    [windowTarget, 'blur'], [windowTarget, 'pagehide'],
    [windowTarget, 'pointerup'], [windowTarget, 'pointercancel'],
    [windowTarget, 'lostpointercapture'],
    [windowTarget, 'mouseup'], [windowTarget, 'touchend'], [windowTarget, 'touchcancel'],
    [windowTarget, 'keyup'], [documentTarget, 'visibilitychange'],
  ];
  const options = { capture: true };
  for (const [target, event] of bindings) target.addEventListener(event, mask, options);
  return () => {
    mask();
    for (const [target, event] of bindings) target.removeEventListener(event, mask, options);
  };
}
