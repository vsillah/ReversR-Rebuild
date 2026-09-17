export type ReviewState = 'not-tested' | 'pass' | 'issue';
export type ReviewChecks = Record<string, ReviewState>;
export const REVIEW_CHECKS: readonly { id: string; label: string; instruction: string }[];
export const REVIEW_STATES: readonly ReviewState[];
export const STORAGE_KEY: string;
export function normalizeReview(input: unknown): ReviewChecks;
export function createReviewReceipt(input: unknown): {
  schema: string; fixture: string; source: { file: string; sha256: string; bytes: number };
  displayMeshSha256: string; references: { label: string; sha256: string }[];
  importedExtents: { axes: string; values: readonly number[]; units: string };
  checks: ReviewChecks; counts: Record<ReviewState, number>; outcome: string;
  exclusions: string[]; scope: string;
};
export function restoreReview(serialized: string | null): ReviewChecks;
