export type PhaseState = 'complete' | 'active' | 'locked' | 'skipped';
export const PHASE_NAMES: readonly string[];
export const PHASE_STATES: readonly PhaseState[];
export function getWorkflowPhaseStates(input?: {currentPhase?: number; qualifiedCad?: boolean; skippedPhases?: number[]}): PhaseState[];
export function getCadReviewPhase(search?: string): number;
