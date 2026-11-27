export type UserRole =
  | 'founder_admin'
  | 'facility_manager'
  | 'inventory_manager'
  | 'procurement_officer'
  | 'sustainability_analyst'
  | 'read_only_reviewer'
  | 'judge_demo';

export type StorageCondition = 'ambient_15_25C' | 'controlled_2_30C' | 'temp_4_25C' | 'sterile_dry';

export type BatchCondition = 'sealed_nominal' | 'recalled' | 'damaged' | 'restricted';

export type UrgencyLevel = 'Critical' | 'High' | 'Moderate' | 'Low';

export type TransferStatus = 'Pending Approval' | 'Approved' | 'In Transit' | 'Completed' | 'Rejected';

export type DataProvenance = 'Observed Ledger' | 'Model Prediction' | 'Simulated Outcome' | 'Estimated Impact';

export interface Organisation {
  id: string;
  name: string;
  region: string;
  tier: 'Public Health Network' | 'Regional Hospital Group' | 'Community Health Consortium';
}

export interface Facility {
  id: string;
  orgId: string;
  name: string;
  type: 'Tertiary Hospital' | 'Regional Medical Centre' | 'Community Clinic' | 'Surgical Institute' | 'Specialty Hub';
  region: string;
  city: string;
  lat: number;
  lon: number;
  mapX: number; // Normalized SVG coordinate 0-1000
  mapY: number; // Normalized SVG coordinate 0-520
  bedCount: number;
  verified: boolean;
  storageCapabilities: StorageCondition[];
  leadTimeWeeks: number;
  avgMonthlyBudgetUsd: number;
}

export interface Product {
  sku: string;
  name: string;
  category:
    | 'PPE & Barrier'
    | 'Infusion & Vascular'
    | 'Wound & Surgical'
    | 'Diagnostics & Lab'
    | 'Airway & Emergency';
  unitLabel: string;
  unitCostUsd: number;
  unitWeightKg: number;
  storageCondition: StorageCondition;
  shelfLifeMonths: number;
  regulatedMedicine: boolean; // Always false for competition consumables scope
  emissionFactorKgCo2PerKg: number; // Documented polymer/medical consumable cradle-to-disposal factor
  patientEpisodesPerUnit: number; // Supply-availability proxy (e.g., procedures/visits supported)
}

export interface InventoryBatch {
  batchId: string;
  facilityId: string;
  sku: string;
  quantityOnHand: number;
  unitCostUsd: number;
  receivedDate: string; // ISO YYYY-MM-DD
  expiryDate: string;   // ISO YYYY-MM-DD
  condition: BatchCondition;
  storageLocation: string;
  dataTag: 'Synthetic Demonstration Dataset' | 'User Entry';
}

export interface WeeklyConsumptionPoint {
  weekIndex: number; // 1..104
  weekStart: string; // ISO YYYY-MM-DD
  facilityId: string;
  sku: string;
  unitsConsumed: number;
}

export interface ModelEvaluationMetric {
  modelId: 'moving_avg_4w' | 'holt_winters' | 'ridge_lag_fourier' | 'gbdt_stumps';
  modelName: string;
  role: 'Baseline' | 'Candidate ML';
  valMae: number;
  valRMSE: number;
  valWape: number; // %
  testMae: number;
  testRMSE: number;
  testWape: number; // %
  selected: boolean;
}

export interface FeatureImportanceItem {
  feature: string;
  importancePct: number;
  description: string;
}

export interface ForecastPoint {
  weekIndex: number;
  weekLabel: string;
  actual?: number;
  predicted: number;
  lower95?: number;
  upper95?: number;
  isForecast: boolean;
}

export interface SeriesForecastResult {
  facilityId: string;
  sku: string;
  selectedModelId: ModelEvaluationMetric['modelId'];
  selectedModelName: string;
  modelComparison: ModelEvaluationMetric[];
  featureImportance: FeatureImportanceItem[];
  trainWeeks: number;
  valWeeks: number;
  testWeeks: number;
  avgWeeklyDemand: number;
  forecast12WeeksTotal: number;
  residualStdDev: number;
  currentUsableStock: number;
  predictedDepletionWeeks: number;
  stockoutProbabilityPct: number;
  recommendedReorderQty: number;
  safetyStockQty: number;
  expectedSurplusUnits: number;
  series: ForecastPoint[];
}

export interface WasteRiskFactor {
  label: string;
  points: number;
  maxPoints: number;
  detail: string;
}

export interface BatchWasteRisk {
  batchId: string;
  facilityId: string;
  facilityName: string;
  sku: string;
  productName: string;
  category: Product['category'];
  quantityOnHand: number;
  daysToExpiry: number;
  expiryDate: string;
  condition: BatchCondition;
  eligibleForTransfer: boolean;
  ineligibilityReasons: string[];
  fefoPriorityRank: number;
  predictedConsumedBeforeExpiry: number;
  predictedUnusedUnits: number;
  financialExposureUsd: number;
  weightAtRiskKg: number;
  wasteRiskScore: number; // 0-100
  urgency: UrgencyLevel;
  factors: WasteRiskFactor[];
  recommendedIntervention: string;
}

export interface MatchScoreFactor {
  criterion: string;
  score: number;
  maxScore: number;
  explanation: string;
}

export interface ResourceMatch {
  matchId: string;
  donorFacilityId: string;
  donorFacilityName: string;
  recipientFacilityId: string;
  recipientFacilityName: string;
  batchId: string;
  sku: string;
  productName: string;
  availableSurplusUnits: number;
  recipientShortageUnits: number;
  recommendedTransferQty: number;
  distanceKm: number;
  donorDaysToExpiry: number;
  recipientWeeklyDemand: number;
  matchScore: number; // 0-100
  factors: MatchScoreFactor[];
  estimatedTransportCostUsd: number;
  avoidedProcurementUsd: number;
  netFinancialSavingsUsd: number;
  wasteDivertedKg: number;
  avoidedCo2eKg: number;
  patientEpisodesSupported: number;
  reasoningSummary: string;
  eligibilityVerified: boolean;
  storageCompatible: boolean;
}

export interface IneligibleAuditItem {
  batchId: string;
  facilityName: string;
  sku: string;
  productName: string;
  quantity: number;
  reasons: string[];
}

export interface TransferRecord {
  transferId: string;
  matchId: string;
  donorFacilityId: string;
  donorFacilityName: string;
  recipientFacilityId: string;
  recipientFacilityName: string;
  batchId: string;
  sku: string;
  productName: string;
  quantity: number;
  matchScore: number;
  status: TransferStatus;
  requestedBy: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
  netSavingsUsd: number;
  wasteDivertedKg: number;
  avoidedCo2eKg: number;
  notes: string;
  isDemoSandbox: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  role: UserRole;
  action: string;
  target: string;
  outcome: 'Allowed' | 'Denied' | 'Completed';
  details: string;
}

export interface ScenarioParameters {
  demandSurgePct: number;          // -20 to +60
  procurementBudgetCutPct: number; // 0 to 40
  supplyDisruptionWeeks: number;   // 0 to 6
  maxTransferRadiusKm: number;     // 25 to 300
  safetyStockMultiplier: number;   // 0.8 to 2.0
}

export interface OptimisationAllocation {
  donorFacilityId: string;
  donorFacilityName: string;
  recipientFacilityId: string;
  recipientFacilityName: string;
  sku: string;
  productName: string;
  batchId: string;
  unitsAllocated: number;
  transportCostUsd: number;
  procurementSavedUsd: number;
  netBenefitUsd: number;
  wasteDivertedKg: number;
}

export interface OptimisationComparison {
  scenarioParams: ScenarioParameters;
  baseline: {
    procurementCostUsd: number;
    expiryWasteCostUsd: number;
    transportCostUsd: number;
    totalOperationalCostUsd: number;
    unmetShortageUnits: number;
    expiryWasteUnits: number;
    wasteWeightKg: number;
    resourceUtilisationPct: number;
  };
  optimised: {
    procurementCostUsd: number;
    expiryWasteCostUsd: number;
    transportCostUsd: number;
    totalOperationalCostUsd: number;
    unmetShortageUnits: number;
    expiryWasteUnits: number;
    wasteWeightKg: number;
    resourceUtilisationPct: number;
  };
  deltas: {
    unitsRescued: number;
    wasteReductionPct: number;
    avoidedProcurementUsd: number;
    netSavingsUsd: number;
    stockoutReductionPct: number;
    wasteDivertedKg: number;
    avoidedCo2eKg: number;
    patientEpisodesSupported: number;
  };
  allocations: OptimisationAllocation[];
}

export interface ImpactSummary {
  observed: {
    totalInventoryValueUsd: number;
    totalUnitsOnHand: number;
    activeFacilities: number;
    verifiedFacilities: number;
    completedTransfersCount: number;
    completedUnitsTransferred: number;
    completedNetSavingsUsd: number;
    completedWasteDivertedKg: number;
    completedAvoidedCo2eKg: number;
  };
  predicted: {
    inventoryAtRiskUsd: number;
    unitsAtRiskOfExpiry: number;
    predictedShortageSeriesCount: number;
    totalPredictedShortageUnits: number;
    activeEligibleMatchesCount: number;
  };
  simulatedOptimised: {
    potentialProcurementSavingsUsd: number;
    potentialNetSavingsUsd: number;
    potentialWasteDivertedKg: number;
    potentialAvoidedCo2eKg: number;
    potentialWasteReductionPct: number;
    potentialStockoutReductionPct: number;
    potentialPatientEpisodesSupported: number;
    resourceUtilisationDeltaPct: number;
  };
  methodologyNotes: {
    emissionFactorRange: string;
    primaryEmissionFactor: string;
    transportEmissionAdjustment: string;
    serviceCapacityNote: string;
    syntheticDataDisclosure: string;
  };
}
