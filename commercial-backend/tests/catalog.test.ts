import { test, expect } from 'vitest';
import { createRequire } from 'node:module';
import { credits, costs } from '../convex/catalog';
import { PLAN_CATALOG as fixture } from '../../qa/commercial/mockCatalog';
const require = createRequire(import.meta.url);
const { PLAN_CATALOG, CREDIT_COSTS } = require('../../server/commercialization.js');
test('Convex limits, costs and UI fixture retain the existing commercial catalog', () => {
  expect(costs).toEqual(CREDIT_COSTS);
  for (const id of ['free', 'pro_shop', 'team'] as const) {
    const current = PLAN_CATALOG[id];
    expect(credits(id)).toMatchObject({ limit: current.monthlyCredits, period: current.creditPeriod });
    expect(current).toMatchObject(fixture[id]);
  }
});
