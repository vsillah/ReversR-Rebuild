export const costs: Record<string, number> = { analyze: 1, 'match-machine': 0, 'technical-spec': 0,
  'generate-3d': 0, 'generate-2d': 0, 'generate-2d-single-angle': 0, 'generate-2d-angles': 0,
  'generate-bom': 0, 'export-packet': 0 };
export function credits(planId: 'free' | 'pro_shop' | 'team', now = Date.now()) {
  const date = new Date(now);
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const weekly = planId === 'free';
  if (weekly) start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  const key = weekly ? `week_${start.toISOString().slice(0, 10)}` : date.toISOString().slice(0, 7);
  const reset = weekly ? start.getTime() + 7 * 86400000 : Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
  return { key, reset, period: weekly ? 'week' as const : 'month' as const,
    limit: planId === 'free' ? 5 : planId === 'pro_shop' ? 100 : 500 };
}
