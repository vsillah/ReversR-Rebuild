// Mirrors the current Convex Auth Password minimum; this is not a strength score.
export function commercialPasswordFeedback(length: number) {
  if (length === 0) return { state: 'empty' as const, text: 'Use at least 8 characters.' };
  if (length < 8) {
    const remaining = 8 - length;
    return { state: 'unmet' as const, text: `Minimum length not met. Add ${remaining} more ${remaining === 1 ? 'character' : 'characters'}.` };
  }
  return { state: 'met' as const, text: 'Minimum length met (8 characters).' };
}

export function canSubmitCommercialLogin(email: string, passwordLength: number, busy: boolean) {
  return Boolean(email.trim()) && passwordLength >= 8 && !busy;
}
