// CUA-only check of the rendered local mock harness. Never submits auth.
// Report lengths/states only; generated masked input is never returned or logged.
export async function checkPasswordFeedback(tab) {
  const input = tab.playwright.getByLabel('Account password', { exact: true });
  const email = tab.playwright.getByLabel('Login email', { exact: true });
  const status = tab.playwright.getByRole('status');
  const buttons = ['Sign in', 'Create account'].map(name => tab.playwright.getByRole('button', { name, exact: true }));
  const assert = (condition, message) => { if (!condition) throw Error(message); };
  await email.fill('fixture@synthetic.invalid');
  const results = [];
  for (const length of [0, 1, 7, 8, 9, 7, 0]) {
    await input.fill(String.fromCharCode(120).repeat(length));
    const expected = length === 0 ? 'Use at least 8 characters.' : length < 8
      ? `Minimum length not met. Add ${8 - length} more ${length === 7 ? 'character' : 'characters'}.`
      : 'Minimum length met (8 characters).';
    assert(await status.innerText() === expected, `Incorrect feedback at length ${length}`);
    for (const button of buttons) assert(await button.isEnabled() === (length >= 8), `Incorrect action state at length ${length}`);
    results.push({ length, enabled: length >= 8 });
  }
  await email.fill('');
  await input.fill(String.fromCharCode(120).repeat(9));
  for (const button of buttons) assert(!await button.isEnabled(), 'Missing email must disable actions');
  assert(await input.getAttribute('type') === 'password', 'Password must remain masked');
  assert(await input.getAttribute('aria-describedby') === await status.getAttribute('id'), 'Requirement must describe the input');
  assert(await status.getAttribute('aria-live') === 'polite', 'Feedback must be announced politely');
  await input.fill('');
  return results;
}
