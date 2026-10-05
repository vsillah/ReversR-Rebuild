export function configuration() {
  const issuer = process.env.COMMERCIAL_AUTH_ISSUER;
  if (process.env.COMMERCIAL_ASSEMBLY !== 'ordinary-customers-v1'
      || !issuer || !/^https:\/\/[a-z0-9-]+\.convex\.site$/.test(issuer)
      || process.env.CONVEX_SITE_URL !== issuer) return null;
  return { issuer };
}
