import type { ImpactSummary, InventoryBatch, TransferRecord } from '../types/domain';
import { FACILITIES, PRODUCTS } from './dataset';
import { forecastFacilitySku } from './forecasting';
import { computeIntelligentMatches } from './matchmaking';
import { DEFAULT_SCENARIO_PARAMS, runPrescriptiveOptimisation } from './optimisation';
import { assessBatchWasteRisks } from './wasteRisk';

/**
 * Engine E — Environmental & Economic Impact Intelligence
 * Strictly distinguishes:
 *   1. Observed Ledger results (actual completed transfers & current ledger totals)
 *   2. Model-Generated Predictions (forecast shortages & expiry risks)
 *   3. Simulated Operational Outcomes (LP optimised network deltas)
 *   4. Estimated Environmental Benefits (transparent emission factors & assumptions)
 */
export function computeImpactSummary(
  batches: InventoryBatch[],
  transfers: TransferRecord[]
): ImpactSummary {
  const totalInventoryValueUsd =
    Math.round(batches.reduce((sum, b) => sum + b.quantityOnHand * b.unitCostUsd, 0) * 100) / 100;
  const totalUnitsOnHand = batches.reduce((sum, b) => sum + b.quantityOnHand, 0);

  const completedOrApproved = transfers.filter(
    (t) => t.status === 'Approved' || t.status === 'In Transit' || t.status === 'Completed'
  );
  const completedUnitsTransferred = completedOrApproved.reduce((s, t) => s + t.quantity, 0);
  const completedNetSavingsUsd =
    Math.round(completedOrApproved.reduce((s, t) => s + t.netSavingsUsd, 0) * 100) / 100;
  const completedWasteDivertedKg =
    Math.round(completedOrApproved.reduce((s, t) => s + t.wasteDivertedKg, 0) * 100) / 100;
  const completedAvoidedCo2eKg =
    Math.round(completedOrApproved.reduce((s, t) => s + t.avoidedCo2eKg, 0) * 100) / 100;

  const wasteRisks = assessBatchWasteRisks(batches);
  const inventoryAtRiskUsd =
    Math.round(wasteRisks.reduce((s, r) => s + r.financialExposureUsd, 0) * 100) / 100;
  const unitsAtRiskOfExpiry = wasteRisks.reduce((s, r) => s + r.predictedUnusedUnits, 0);

  let predictedShortageSeriesCount = 0;
  let totalPredictedShortageUnits = 0;
  for (const fac of FACILITIES) {
    for (const prod of PRODUCTS) {
      const fc = forecastFacilitySku(fac.id, prod.sku, batches);
      if (fc.recommendedReorderQty >= 10 && (fc.predictedDepletionWeeks < 4.5 || fc.stockoutProbabilityPct >= 35)) {
        predictedShortageSeriesCount++;
        totalPredictedShortageUnits += fc.recommendedReorderQty;
      }
    }
  }

  const { matches } = computeIntelligentMatches(batches);
  const opt = runPrescriptiveOptimisation(batches, DEFAULT_SCENARIO_PARAMS);

  return {
    observed: {
      totalInventoryValueUsd,
      totalUnitsOnHand,
      activeFacilities: FACILITIES.length,
      verifiedFacilities: FACILITIES.filter((f) => f.verified).length,
      completedTransfersCount: completedOrApproved.length,
      completedUnitsTransferred,
      completedNetSavingsUsd,
      completedWasteDivertedKg,
      completedAvoidedCo2eKg,
    },
    predicted: {
      inventoryAtRiskUsd,
      unitsAtRiskOfExpiry,
      predictedShortageSeriesCount,
      totalPredictedShortageUnits,
      activeEligibleMatchesCount: matches.length,
    },
    simulatedOptimised: {
      potentialProcurementSavingsUsd: opt.deltas.avoidedProcurementUsd,
      potentialNetSavingsUsd: opt.deltas.netSavingsUsd,
      potentialWasteDivertedKg: opt.deltas.wasteDivertedKg,
      potentialAvoidedCo2eKg: opt.deltas.avoidedCo2eKg,
      potentialWasteReductionPct: opt.deltas.wasteReductionPct,
      potentialStockoutReductionPct: opt.deltas.stockoutReductionPct,
      potentialPatientEpisodesSupported: opt.deltas.patientEpisodesSupported,
      resourceUtilisationDeltaPct:
        Math.round((opt.optimised.resourceUtilisationPct - opt.baseline.resourceUtilisationPct) * 10) / 10,
    },
    methodologyNotes: {
      emissionFactorRange: '2.20 – 2.90 kg CO2e per kg medical consumable (cradle-to-gate polymer + clinical disposal avoidance)',
      primaryEmissionFactor: 'SKU-specific factors based on published EPA WARM & Healthcare Without Harm polymer/sterile waste ranges',
      transportEmissionAdjustment: 'Net CO2e deducts 0.12 kg CO2e per corridor km for regional courier dispatch',
      serviceCapacityNote:
        'Patient care episodes represent supply-availability capacity proxies (units × consumables per episode), not clinical outcome claims',
      syntheticDataDisclosure:
        'All facility stock quantities, consumption logs, and savings projections use a reproducible seeded synthetic demonstration dataset (seed 20261012)',
    },
  };
}
