import React, { createContext, useContext, useState } from 'react';
import { commercialSession } from '../../utils/commercialSession';
type Status = 'unavailable' | 'loading' | 'signed-out' | 'signed-in';
const Context = createContext({ status: 'signed-out' as Status, signIn: async (_email: string, _password: string, _create: boolean) => {}, signOut: async () => {} });
export const useCommercialAuth = () => useContext(Context);
export function MockAuth({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('signed-out');
  return <Context.Provider value={{ status,
    signIn: async (email, password) => { if (password === 'wrong-password') throw Error('Synthetic login failure'); commercialSession.set(`synthetic-${email}`); setStatus('signed-in'); },
    signOut: async () => { commercialSession.clear(); setStatus('signed-out'); },
  }}>
    <nav style={{ padding: 12, display: 'flex', flexWrap: 'wrap', gap: 8, background: '#dde7ef' }} aria-label="Local QA states">
      <strong>Local mocks only</strong>
      {(['signed-out', 'unavailable', 'loading'] as Status[]).map(next => <button key={next} onClick={() => { commercialSession.clear(); setStatus(next); }}>{next}</button>)}
      <button onClick={() => { window.dispatchEvent(new Event('qa-expire')); }}>Expire API session</button>
      <button onClick={() => { window.dispatchEvent(new Event('qa-recover')); }}>Recover API</button>
      <button onClick={() => { window.dispatchEvent(new Event('qa-fail-save')); }}>Fail next save</button>
      <button onClick={() => { window.dispatchEvent(new Event('qa-slow-refresh')); }}>Delay next refresh</button>
    </nav>{children}
  </Context.Provider>;
}
