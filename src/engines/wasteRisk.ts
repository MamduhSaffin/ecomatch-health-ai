import type { BatchWasteRisk, InventoryBatch, UrgencyLevel, WasteRiskFactor } from '../types/domain';
import {
  SIMULATION_REFERENCE_DATE,
  diffDaysBetweenIso,
  getFacilityById,
  getProductBySku,
} from './dataset';
import { forecastFacilitySku } from './forecasting';

export const MIN_TRANSFER_SHELF_LIFE_DAYS = 14;

export function assessBatchWasteRisks(
  batches: InventoryBatch[],
  demandMultiplier = 1.0
): BatchWasteRisk[] {
  // Group batches by (facilityId, sku) and sort FEFO (earliest expiry first)
  const grouped = new Map<string, InventoryBatch[]>();
  for (const batch of batches) {
    const key = `${batch.facilityId}::${batch.sku}`;
    const list = grouped.get(key) ?? [];
    list.push(batch);
    grouped.set(key, list);
  }

  const results: BatchWasteRisk[] = [];

  for (const [, groupBatches] of grouped.entries()) {
    const sortedFefo = [...groupBatches].sort((a, b) =>
      a.expiryDate.localeCompare(b.expiryDate)
    );
    const { facilityId, sku } = sortedFefo[0];
    const facility = getFacilityById(facilityId);
    const product = getProductBySku(sku);
    const forecast = forecastFacilitySku(facilityId, sku, batches, demandMultiplier);
    const dailyDemand = Math.max(0.1, forecast.avgWeeklyDemand / 7);

    // FEFO allocation: earlier-expiring eligible batches absorb local facility demand first
    let cumulativeConsumedDays = 0;

    sortedFefo.forEach((batch, idx) => {
      const daysToExpiry = diffDaysBetweenIso(SIMULATION_REFERENCE_DATE, batch.expiryDate);
      const ineligibilityReasons: string[] = [];

      if (daysToExpiry <= 0) {
        ineligibilityReasons.push(`Expired (${Math.abs(daysToExpiry)} days past expiry)`);
      } else if (daysToExpiry < MIN_TRANSFER_SHELF_LIFE_DAYS) {
        ineligibilityReasons.push(
          `Remaining shelf life (${daysToExpiry}d) below ${MIN_TRANSFER_SHELF_LIFE_DAYS}-day redistribution minimum`
        );
      }
      if (batch.condition === 'recalled') {
        ineligibilityReasons.push('Manufacturer safety recall — quarantined');
      }
      if (batch.condition === 'damaged') {
        ineligibilityReasons.push('Packaging compromised — ineligible for clinical transfer');
      }
      if (batch.condition === 'restricted') {
        ineligibilityReasons.push('Regulatory transfer restriction active');
      }
      if (product?.regulatedMedicine) {
        ineligibilityReasons.push('Regulated pharmaceutical excluded from consumables exchange');
      }
      if (facility && !facility.verified) {
        ineligibilityReasons.push('Origin facility pending network verification');
      }

      const eligibleForTransfer = ineligibilityReasons.length === 0;

      // Predict units consumed locally under strict FEFO before batch expires
      let predictedConsumed = 0;
      if (batch.condition === 'sealed_nominal' && daysToExpiry > 0) {
        const effectiveWindowDays = Math.max(0, daysToExpiry - cumulativeConsumedDays);
        predictedConsumed = Math.min(
          batch.quantityOnHand,
          Math.round(effectiveWindowDays * dailyDemand)
        );
        cumulativeConsumedDays += predictedConsumed / dailyDemand;
      }

      const predictedUnusedUnits = Math.max(0, batch.quantityOnHand - predictedConsumed);
      const financialExposureUsd = Math.round(predictedUnusedUnits * batch.unitCostUsd * 100) / 100;
      const weightAtRiskKg =
        Math.round(predictedUnusedUnits * (product?.unitWeightKg ?? 0.5) * 100) / 100;

      // Explainable 0-100 Waste Risk Score decomposed into 4 transparent factors
      // Factor 1: Expiry Proximity (0-35)
      let expiryPoints = 0;
      if (daysToExpiry <= 0) expiryPoints = 35;
      else if (daysToExpiry <= 30) expiryPoints = 32;
      else if (daysToExpiry <= 60) expiryPoints = Math.round(32 - ((daysToExpiry - 30) / 30) * 10);
      else if (daysToExpiry <= 120) expiryPoints = Math.round(22 - ((daysToExpiry - 60) / 60) * 14);
      else expiryPoints = Math.max(0, Math.round(8 - ((daysToExpiry - 120) / 240) * 8));

      // Factor 2: Projected Unused Ratio (0-35)
      const unusedRatio = batch.quantityOnHand > 0 ? predictedUnusedUnits / batch.quantityOnHand : 0;
      const unusedPoints = Math.round(unusedRatio * 35);

      // Factor 3: Financial Exposure Severity (0-15) — saturates at $5,000 exposure
      const financialPoints = Math.min(15, Math.round((financialExposureUsd / 5000) * 15));

      // Factor 4: Demand Velocity Deficit / Quarantine Flag (0-15)
      let velocityPoints = 0;
      if (batch.condition !== 'sealed_nominal') {
        velocityPoints = 15;
      } else if (daysToExpiry > 0) {
        const weeksToClear = batch.quantityOnHand / Math.max(0.5, forecast.avgWeeklyDemand);
        const weeksRemaining = daysToExpiry / 7;
        const overhangRatio = Math.max(0, (weeksToClear - weeksRemaining) / Math.max(1, weeksRemaining));
        velocityPoints = Math.min(15, Math.round(overhangRatio * 15));
      } else {
        velocityPoints = 15;
      }

      const wasteRiskScore = Math.min(100, expiryPoints + unusedPoints + financialPoints + velocityPoints);

      let urgency: UrgencyLevel = 'Low';
      if (wasteRiskScore >= 70 || (predictedUnusedUnits > 0 && daysToExpiry <= 45)) {
        urgency = 'Critical';
      } else if (wasteRiskScore >= 45 || predictedUnusedUnits > 0) {
        urgency = 'High';
      } else if (wasteRiskScore >= 25) {
        urgency = 'Moderate';
      }

      const factors: WasteRiskFactor[] = [
        {
          label: 'Expiry Proximity',
          points: expiryPoints,
          maxPoints: 35,
          detail:
            daysToExpiry <= 0
              ? `Batch expired ${Math.abs(daysToExpiry)} days ago`
              : `${daysToExpiry} days remaining until ${batch.expiryDate}`,
        },
        {
          label: 'Projected Unused Ratio',
          points: unusedPoints,
          maxPoints: 35,
          detail: `${predictedUnusedUnits} of ${batch.quantityOnHand} units (${Math.round(
            unusedRatio * 100
          )}%) projected unused under FEFO`,
        },
        {
          label: 'Financial Exposure',
          points: financialPoints,
          maxPoints: 15,
          detail: `$${financialExposureUsd.toLocaleString()} capital at risk of write-off`,
        },
        {
          label: 'Demand Velocity Deficit',
          points: velocityPoints,
          maxPoints: 15,
          detail:
            batch.condition !== 'sealed_nominal'
              ? `Lot status '${batch.condition}' blocks local clinical consumption`
              : `Local burn rate ${forecast.avgWeeklyDemand} units/wk vs ${batch.quantityOnHand} on hand`,
        },
      ];

      let recommendedIntervention = 'Maintain standard FEFO rotation';
      if (batch.condition === 'recalled' || daysToExpiry <= 0) {
        recommendedIntervention = 'Isolate in quarantine and follow clinical waste compliance protocol';
      } else if (predictedUnusedUnits > 0 && eligibleForTransfer) {
        recommendedIntervention = `Redistribute ${predictedUnusedUnits} surplus units via Exchange Marketplace & pause reorders`;
      } else if (daysToExpiry <= 65 && idx === 0) {
        recommendedIntervention = 'Prioritise FEFO dispensing across wards before newer batches';
      }

      results.push({
        batchId: batch.batchId,
        facilityId,
        facilityName: facility?.name ?? facilityId,
        sku,
        productName: product?.name ?? sku,
        category: product?.category ?? 'PPE & Barrier',
        quantityOnHand: batch.quantityOnHand,
        daysToExpiry,
        expiryDate: batch.expiryDate,
        condition: batch.condition,
        eligibleForTransfer,
        ineligibilityReasons,
        fefoPriorityRank: idx + 1,
        predictedConsumedBeforeExpiry: predictedConsumed,
        predictedUnusedUnits,
        financialExposureUsd,
        weightAtRiskKg,
        wasteRiskScore,
        urgency,
        factors,
        recommendedIntervention,
      });
    });
  }

  return results.sort((a, b) => b.wasteRiskScore - a.wasteRiskScore);
}
