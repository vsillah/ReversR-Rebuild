import { createSyntheticProfileInputChecker } from '../../scripts/commercial-browser-input-checker.mjs';
const full = { emit:false, disableDiffing:true };
const modes = ['plain','scroll','controlled','replace','blur'];

// CUA REPL entry point. No browser creation, network clients, logs or field extraction.
export async function runFixtureCase(tab, mode, field) {
  if (!modes.includes(mode) || !['name','shop'].includes(field)) return {ok:false,reason:'INVALID_FIXTURE_CASE'};
  if (new URL(await tab.url()).origin !== 'http://127.0.0.1:5194') return {ok:false,reason:'NOT_LOCAL_FIXTURE'};
  let stage = 'FIXTURE_SETUP_FAILED';
  const observations = [];
  let fills = 0;
  const label = field === 'name' ? 'Profile name' : 'Shop name';
  const diagnostic = () => tab.playwright.evaluate(label => {
    const node = document.querySelector(`[aria-label="${label}"]`);
    const counters = document.querySelector('#diagnostics').dataset;
    return {strictFocus:document.activeElement===node,activeInput:document.activeElement?.tagName==='INPUT',
      focusEvents:Number(counters.focus),blurEvents:Number(counters.blur),inputEvents:Number(counters.input),replacements:Number(counters.replacement),renders:Number(counters.renders||0),captureEvents:Number(counters.capture||0),nodesStable:counters.nodesStable==='true',
      trace:(counters.trace||'').split(',').filter(item=>['focus','blur','input','replacement','capture','scheduled-scroll','inner-scroll','outer-scroll'].includes(item))};
  },label);
  try {
    await tab.playwright.getByLabel('Fixture mode',{exact:true}).selectOption(mode);
    await tab.getAXState(full);
    await tab.playwright.getByRole('button',{name:'Reset synthetic fixture',exact:true}).click();
    await tab.getAXState(full);
    stage = 'DIAGNOSTIC_UNCONFIRMED';
    const wrapped = {
      getAXState: async options => {
        const before = await diagnostic();
        await tab.getAXState(options);
        observations.push({before,after:await diagnostic()});
      },
      playwright: {
        evaluate: (...args) => tab.playwright.evaluate(...args),
        getByLabel: (...args) => {
          const locator = tab.playwright.getByLabel(...args);
          return {count:()=>locator.count(),isVisible:()=>locator.isVisible(),isEnabled:()=>locator.isEnabled(),
            click:()=>locator.click(),fill:async value=>{fills++;await locator.fill(value);}};
        },
      },
    };
    const checker = createSyntheticProfileInputChecker(wrapped);
    const result = await checker({account:'A',field,phase:'edit'});
    // No next action on failure. The consumed closure remains retained in this result
    // handle; only report is suitable for serialization.
    return {checker, report:{mode,field,...result,fillDispatches:fills,observations}};
  } catch { return {ok:false,reason:stage}; }
}
