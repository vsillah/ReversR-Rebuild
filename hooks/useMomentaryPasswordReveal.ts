import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { bindPasswordRevealAppState, bindPasswordRevealInterruptions, createMomentaryPasswordReveal } from '../utils/momentaryPasswordReveal';

export function useMomentaryPasswordReveal(empty: boolean, busy: boolean, authStatus: string) {
  const [revealed, setRevealed] = useState(false);
  const controller = useRef<ReturnType<typeof createMomentaryPasswordReveal> | null>(null);
  const enabled = !empty && !busy && authStatus === 'signed-out';
  useLayoutEffect(() => {
    const current = createMomentaryPasswordReveal(setRevealed);
    controller.current = current;
    return () => { current.dispose(); controller.current = null; };
  }, []);
  useLayoutEffect(() => { controller.current?.configure(enabled); }, [enabled, authStatus]);
  useEffect(() => {
    const mask = () => controller.current?.mask();
    const removeNative = bindPasswordRevealAppState(mask, AppState);
    const removeWeb = Platform.OS === 'web' ? bindPasswordRevealInterruptions(mask, window, document) : undefined;
    return () => { removeWeb?.(); removeNative(); };
  }, []);
  return { revealed: enabled && revealed, disabled: !enabled,
    start: () => controller.current?.start(), mask: () => controller.current?.mask() };
}
