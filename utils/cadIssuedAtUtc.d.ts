export const CANONICAL_UTC_PATTERN: RegExp;
export function parseCanonicalIssuedAtUtc(value: unknown): number;
export function formatCanonicalIssuedAtUtc(milliseconds: number): string;
export function isCanonicalIssuedAtUtc(value: unknown): value is string;
