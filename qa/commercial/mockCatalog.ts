export const PLAN_CATALOG = {
  free: { id: 'free', label: 'Free', monthlyCredits: 5, creditPeriod: 'week', seats: 1, priceMonthly: 0, features: ['Five reconstruction journeys/week', 'Demo/public inventory', 'Basic preview exports'] },
  pro_shop: { id: 'pro_shop', label: 'Pro Shop', monthlyCredits: 100, creditPeriod: 'month', seats: 1, priceMonthly: 49, features: ['Full BOM/spec export', 'Quote packet export', 'Cloud-ready shop history', 'Reviewer approval records'] },
  team: { id: 'team', label: 'Team', monthlyCredits: 500, creditPeriod: 'month', seats: 3, priceMonthly: 149, features: ['Shared shop history', 'Inventory connectors', 'Admin controls', 'Team seat management'] },
};
export const CREDIT_COSTS = { analyze: 1 };
