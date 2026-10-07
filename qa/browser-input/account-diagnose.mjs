import {createSyntheticProfileInputChecker} from '../../scripts/commercial-browser-input-checker.mjs';
// Browser entry point: retain checker, serialize report only. No Save or retry.
export async function checkAccountField(tab,account,field) {
  if(!['http://127.0.0.1:5194/account','http://127.0.0.1:5194/account-before'].includes(await tab.url())||!['A','B'].includes(account)||!['name','shop'].includes(field))throw new Error('LOCAL_FIXTURE_ONLY');
  let fills=0;
  const wrapped={getAXState:options=>tab.getAXState(options),playwright:{evaluate:(...args)=>tab.playwright.evaluate(...args),getByLabel:(...args)=>{
    const loc=tab.playwright.getByLabel(...args);
    return {count:()=>loc.count(),isVisible:()=>loc.isVisible(),isEnabled:()=>loc.isEnabled(),click:()=>loc.click(),fill:async value=>{fills++;await loc.fill(value);}};
  }}};
  const checker=createSyntheticProfileInputChecker(wrapped);
  const result=await checker({account,field,phase:'edit'});
  return {checker,report:{account,field,...result,fillDispatches:fills}};
}
