import { test, expect } from 'vitest';
import { commercialAuthStorageNamespace } from '../../utils/commercialAuthStorage';

test('deployment and issuer changes isolate access and refresh token custody after SDK escaping', () => {
  const namespace = (url: string, issuer: string) => commercialAuthStorageNamespace(url, issuer).replace(/[^a-zA-Z0-9]/g, '');
  const dev = namespace('https://synthetic-dev.convex.cloud', 'https://synthetic-dev.convex.site');
  const prod = namespace('https://synthetic-prod.convex.cloud', 'https://synthetic-prod.convex.site');
  const punctuationVariant = namespace('https://syntheticdev.convex.cloud', 'https://syntheticdev.convex.site');
  const otherIssuer = namespace('https://synthetic-dev.convex.cloud', 'https://other-synthetic.convex.site');
  expect(new Set([dev, prod, punctuationVariant, otherIssuer]).size).toBe(4);
  expect(dev).toBe(commercialAuthStorageNamespace('https://synthetic-dev.convex.cloud', 'https://synthetic-dev.convex.site'));
  const storage = new Map<string, string>();
  for (const key of ['__convexAuthJWT', '__convexAuthRefreshToken']) {
    storage.set(`${key}_${dev}`, 'synthetic-only');
    expect(storage.get(`${key}_${prod}`)).toBeUndefined();
    expect(storage.get(`${key}_${punctuationVariant}`)).toBeUndefined();
    expect(storage.get(`${key}_${otherIssuer}`)).toBeUndefined();
    expect(storage.get(`${key}_reversrCommercial`)).toBeUndefined();
  }
});
