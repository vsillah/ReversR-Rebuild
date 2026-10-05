import React, { createContext, useContext, useLayoutEffect, useMemo, useState } from 'react';
import { ConvexAuthProvider, useAuthActions, useAuthToken } from '@convex-dev/auth/react';
import { ConvexReactClient, useConvexAuth } from 'convex/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { commercialSession, releaseCommercialAuth } from '../utils/commercialSession';

type Auth = { status: 'unavailable' | 'loading' | 'signed-out' | 'signed-in';
  signIn: (email: string, password: string, create: boolean) => Promise<void>; signOut: () => Promise<void> };
const unavailable: Auth = { status: 'unavailable', signIn: async () => { throw new Error('Account service is not configured. Contact support.'); }, signOut: async () => { commercialSession.clear(); } };
export const CommercialAuthContext = createContext<Auth>(unavailable);
export const useCommercialAuth = () => useContext(CommercialAuthContext);

export function CommercialAuthProvider({ children }: { children: React.ReactNode }) {
  const url = process.env.EXPO_PUBLIC_COMMERCIAL_CONVEX_URL;
  const issuer = process.env.EXPO_PUBLIC_COMMERCIAL_CONVEX_ISSUER;
  const backend = process.env.EXPO_PUBLIC_COMMERCIAL_BACKEND;
  const client = useMemo(() => {
    if (backend !== 'convex' || !url
        || !/^https:\/\/[a-z0-9-]+\.convex\.cloud$/.test(url)
        || issuer !== url.replace('.convex.cloud', '.convex.site')) return null;
    return new ConvexReactClient(url);
  }, [url, issuer, backend]);
  useLayoutEffect(() => {
    if (!client) commercialSession.clear();
    return () => releaseCommercialAuth(client);
  }, [client]);
  if (!client) return <CommercialAuthContext.Provider value={unavailable}>{children}</CommercialAuthContext.Provider>;
  return <ConvexAuthProvider client={client} storage={AsyncStorage} storageNamespace="reversrCommercial" shouldHandleCode={false}>
    <AuthBridge>{children}</AuthBridge>
  </ConvexAuthProvider>;
}
function AuthBridge({ children }: { children: React.ReactNode }) {
  const token = useAuthToken();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const actions = useAuthActions();
  const [suppressed, setSuppressed] = useState(false);
  useLayoutEffect(() => {
    commercialSession.set(suppressed ? null : token);
    return () => commercialSession.clear();
  }, [token, suppressed]);
  const value: Auth = {
    status: isLoading ? 'loading' : isAuthenticated && !suppressed ? 'signed-in' : 'signed-out',
    signIn: async (email, password, create) => {
      commercialSession.clear();
      await actions.signIn('password', { email, password, flow: create ? 'signUp' : 'signIn' });
      setSuppressed(false);
    },
    signOut: async () => {
      setSuppressed(true);
      commercialSession.clear();
      await actions.signOut();
    },
  };
  return <CommercialAuthContext.Provider value={value}>{children}</CommercialAuthContext.Provider>;
}
