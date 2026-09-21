export type CadCostWorkbookBucket = {
  id: string;
  label: string;
  readiness: string;
  meters: readonly string[];
};

export type CadCostWorkbook = {
  schemaVersion: 1;
  packet: 'cad-per-run-cost-workbook';
  status: 'source_only_workbook_ready';
  unit: 'one CAD run';
  sourceOnly: true;
  currentPricingClaims: false;
  pricingEvidenceRequired: true;
  approvedDevelopmentCeilingUsd: 50;
  feePerRunReady: false;
  customerFeeReady: false;
  buckets: readonly CadCostWorkbookBucket[];
};

export type CadBuildReadiness = {
  headline: string;
  userSteps: readonly {
    label: string;
    state: string;
    detail: string;
    tone: 'success' | 'warning' | 'muted';
    icon: 'document-text-outline' | 'cube-outline' | 'construct-outline';
  }[];
  summaryCards: readonly {
    label: string;
    value: string;
    tone: 'success' | 'warning' | 'muted';
  }[];
  productReady: readonly string[];
  costEvidenceNeeded: readonly string[];
  blockedOutputs: readonly string[];
  commercializationGates: readonly {
    label: string;
    state: string;
    detail: string;
    tone: 'warning' | 'muted';
  }[];
};

export const CAD_COST_WORKBOOK: Readonly<CadCostWorkbook>;
export const CAD_BUILD_READINESS: Readonly<CadBuildReadiness>;
