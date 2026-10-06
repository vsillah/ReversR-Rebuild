import { test, expect } from 'vitest';
import { commercialSession, releaseCommercialAuth } from '../../utils/commercialSession';
test('logout invalidates in-flight work and repeated tokens never restore an old generation', async () => {
  commercialSession.set('synthetic-first');
  const pending = commercialSession.get();
  commercialSession.clear();
  expect(commercialSession.get().token).toBeNull();
  expect(commercialSession.isCurrent(pending.generation)).toBe(false);
  commercialSession.set('synthetic-second');
  expect(commercialSession.isCurrent(pending.generation)).toBe(false);
  commercialSession.set('synthetic-first');
  expect(commercialSession.isCurrent(pending.generation)).toBe(false);
  commercialSession.clear();
});
test('provider disposal closes the client and invalidates all pending account requests', () => {
  let closed = 0;
  commercialSession.set('synthetic-provider-token');
  const pending = commercialSession.get();
  releaseCommercialAuth({ close: async () => { closed++; } });
  expect(closed).toBe(1);
  expect(commercialSession.get().token).toBeNull();
  expect(commercialSession.isCurrent(pending.generation)).toBe(false);
  commercialSession.set('synthetic-replacement');
  releaseCommercialAuth(null);
  expect(commercialSession.get().token).toBeNull();
});
