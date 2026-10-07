import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildAccountFixture} from './build-account.mjs';
test('actual account build includes reviewed source and excludes provider/auth/config modules',async()=>{
  const inputs=await buildAccountFixture();
  for(const name of ['app/account.tsx','utils/focusVisibility.ts','hooks/useAndroidKeyboardInset.ts','qa/browser-input/account-stubs.jsx'])assert.ok(inputs.includes(name));
  assert.equal(inputs.some(p=>/convex|CommercialLogin|useCommercialAuth|useCommercialization|useAppTheme|(^|\/)config\//.test(p)),false);
  const baselineInputs=await buildAccountFixture({baseline:true});assert.deepEqual(baselineInputs,inputs);
});
