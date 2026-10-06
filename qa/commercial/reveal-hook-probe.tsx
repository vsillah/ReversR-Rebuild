import React from 'react';
import { useMomentaryPasswordReveal } from '../../hooks/useMomentaryPasswordReveal';
type State = { empty: boolean; busy: boolean; auth: string };
type Control = ReturnType<typeof useMomentaryPasswordReveal>;
const Probe = React.forwardRef<Control, State>((state, ref) => {
  const control = useMomentaryPasswordReveal(state.empty, state.busy, state.auth);
  React.useImperativeHandle(ref, () => control);
  return null;
});
export function RevealHookProbe() {
  const [state, setState] = React.useState<State>({ empty: false, busy: false, auth: 'signed-out' });
  const [mounted, setMounted] = React.useState(true);
  const [result, setResult] = React.useState('');
  const control = React.useRef<Control>(null);
  const run = async () => {
    const tick = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    const assert = (ok: boolean, label: string) => { if (!ok) throw Error(label); };
    setMounted(true); await tick();
    for (const blocked of [{ empty: true, busy: false, auth: 'signed-out' }, { empty: false, busy: true, auth: 'signed-out' }, { empty: false, busy: false, auth: 'loading' }, { empty: false, busy: false, auth: 'signed-in' }]) {
      setState({ empty: false, busy: false, auth: 'signed-out' }); await tick();
      control.current!.start(); await tick(); assert(control.current!.revealed, 'Hook hold did not reveal');
      setState(blocked); await tick(); control.current!.start(); await tick();
      assert(!control.current!.revealed && control.current!.disabled, 'Hook blocked state revealed');
    }
    setState({ empty: false, busy: false, auth: 'signed-out' }); await tick();
    control.current!.start(); await tick(); control.current!.mask(); await tick();
    assert(!control.current!.revealed, 'Submit reset did not mask');
    control.current!.start(); await tick(); setMounted(false); await tick();
    assert(control.current === null, 'Hook probe did not unmount');
    setResult('Hook empty/busy/auth/submit/unmount checks passed; no auth submitted.');
  };
  return <div>{mounted && <Probe {...state} ref={control} />}<button onClick={() => { void run().catch(() => setResult('Hook lifecycle check failed.')); }}>Run reveal hook lifecycle checks</button><output>{result}</output></div>;
}
