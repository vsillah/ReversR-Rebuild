import { expect, test } from 'vitest';
import { canSubmitCommercialLogin, commercialPasswordFeedback } from '../../utils/commercialPasswordFeedback';

test('minimum-length feedback handles empty, short, met and replacement/deletion transitions', () => {
  const lengths = [0, 1, 7, 8, 9, 7, 1, 0, 9, 0];
  const expected = ['empty', 'unmet', 'unmet', 'met', 'met', 'unmet', 'unmet', 'empty', 'met', 'empty'];
  lengths.forEach((length, index) => expect(commercialPasswordFeedback(length).state).toBe(expected[index]));
  expect(commercialPasswordFeedback(0).text).toBe('Use at least 8 characters.');
  expect(commercialPasswordFeedback(1).text).toBe('Minimum length not met. Add 7 more characters.');
  expect(commercialPasswordFeedback(7).text).toBe('Minimum length not met. Add 1 more character.');
  for (const length of [8, 9]) expect(commercialPasswordFeedback(length).text).toBe('Minimum length met (8 characters).');
});

test('both login actions require an email, at least eight characters and no pending request', () => {
  for (const length of [0, 1, 7, 8, 9]) {
    for (const email of ['', '   ', 'fixture@synthetic.invalid']) {
      for (const busy of [false, true]) {
        expect(canSubmitCommercialLogin(email, length, busy)).toBe(Boolean(email.trim()) && length >= 8 && !busy);
      }
    }
  }
});
