// Run only through the Codex CUA REPL, passing its existing local QA tab.
// Precondition: signed in with the synthetic fixture. No viewport changes.
export async function checkRecoveryMessages(tab) {
  const button = name => tab.playwright.getByRole('button', { name, exact: true });
  const assert = (condition, message) => { if (!condition) throw Error(message); };
  const results = [];
  for (const action of ['Manage billing', 'Start Pro Shop checkout']) {
    await button('Recover API').click();
    await button('Refresh account').click();
    await tab.getAXState();
    await button(action).click();
    await tab.getAXState();
    assert(await tab.playwright.getByRole('alert').innerText() === 'Provider checkout is disabled in this local QA fixture.', `${action}: fixture denial missing`);
    await button('Expire API session').click();
    await button('Refresh account').click();
    await tab.getAXState();
    assert(await tab.playwright.getByRole('alert').innerText() === 'Your session expired. Sign in again.', `${action}: current session error hidden`);
    assert(await tab.playwright.getByText('Provider checkout is disabled in this local QA fixture.', { exact: true }).count() === 0, `${action}: stale billing message remains`);
    assert(await tab.playwright.getByText('Credit balance unavailable', { exact: true }).isVisible(), `${action}: stale credits remain`);
    await button('Recover API').click();
    await button('Refresh account').click();
    await tab.getAXState();
    assert(await tab.playwright.getByRole('alert').count() === 0, `${action}: old message returned after recovery`);
    results.push(`${action}: denial → expiry → recovery passed`);
  }
  return results;
}
