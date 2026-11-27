import type {
  IneligibleAuditItem,
  InventoryBatch,
  MatchScoreFactor,
  ResourceMatch,
} from '../types/domain';
import {
  FACILITIES,
  PRODUCTS,
  getFacilityById,
  getProductBySku,
  haversineDistanceKm,
} from './dataset';
import { forecastFacilitySku } from './forecasting';
import { assessBatchWasteRisks } from './wasteRisk';

export interface MatchmakingOutput {
  matches: ResourceMatch[];
  ineligibleAudit: IneligibleAuditItem[];
}

export function computeTransportCostUsd(
  distanceKm: number,
  totalWeightKg: number,
  isTempControlled: boolean
): number {
  // Base dispatch fee $24 + $0.85/km + $0.18/kg; 1.35x multiplier for temperature-controlled courier
  const base = 24 + distanceKm * 0.85 + totalWeightKg * 0.18;
  const multiplier = isTempControlled ? 1.35 : 1.0;
  return Math.round(base * multiplier * 100) / 100;
}

export function computeIntelligentMatches(
  batches: InventoryBatch[],
  maxRadiusKm = 180,
  demandMultiplier = 1.0,
  safetyStockMultiplier = 1.0
): MatchmakingOutput {
  const wasteRisks = assessBatchWasteRisks(batches, demandMultiplier);

  // Audit all ineligible batches that would otherwise appear as unused stock
  const ineligibleAudit: IneligibleAuditItem[] = wasteRisks
    .filter((r) => !r.eligibleForTransfer && r.quantityOnHand > 0)
    .map((r) => ({
      batchId: r.batchId,
      facilityName: r.facilityName,
      sku: r.sku,
      productName: r.productName,
      quantity: r.quantityOnHand,
      reasons: r.ineligibilityReasons,
    }));

  // Step 1: Hard Eligibility Gate — ONLY verified, non-expired, non-recalled, non-damaged, non-restricted consumables with >=14d shelf life and predicted surplus!
  const eligibleSurplus = wasteRisks.filter(
    (r) => r.eligibleForTransfer && r.predictedUnusedUnits >= 5
  );

  // Step 2: Identify facilities experiencing predicted shortages per SKU
  const shortagesBySku = new Map<
    string,
    Array<{
      facilityId: string;
      shortageUnits: number;
      stockoutProb: number;
      depletionWeeks: number;
      weeklyDemand: number;
    }>
  >();

  for (const fac of FACILITIES) {
    if (!fac.verified) continue;
    for (const prod of PRODUCTS) {
      const fc = forecastFacilitySku(fac.id, prod.sku, batches, demandMultiplier, safetyStockMultiplier);
      // Facility has an actionable shortage if it needs reorder AND has low depletion coverage or high stockout probability
      if (fc.recommendedReorderQty >= 10 && (fc.predictedDepletionWeeks < 4.5 || fc.stockoutProbabilityPct >= 35)) {
        const list = shortagesBySku.get(prod.sku) ?? [];
        list.push({
          facilityId: fac.id,
          shortageUnits: fc.recommendedReorderQty,
          stockoutProb: fc.stockoutProbabilityPct,
          depletionWeeks: fc.predictedDepletionWeeks,
          weeklyDemand: fc.avgWeeklyDemand,
        });
        shortagesBySku.set(prod.sku, list);
      }
    }
  }

  const matches: ResourceMatch[] = [];

  for (const donor of eligibleSurplus) {
    const donorFacility = getFacilityById(donor.facilityId);
    const product = getProductBySku(donor.sku);
    if (!donorFacility || !product) continue;

    const candidates = shortagesBySku.get(donor.sku) ?? [];
    for (const recipient of candidates) {
      if (recipient.facilityId === donor.facilityId) continue;
      const recipientFacility = getFacilityById(recipient.facilityId);
      if (!recipientFacility || !recipientFacility.verified) continue;

      // Storage condition compatibility gate
      const storageCompatible = recipientFacility.storageCapabilities.includes(product.storageCondition);
      if (!storageCompatible) continue;

      const distanceKm = haversineDistanceKm(
        donorFacility.lat,
        donorFacility.lon,
        recipientFacility.lat,
        recipientFacility.lon
      );
      if (distanceKm > maxRadiusKm) continue;

      // Ensure recipient can realistically consume transferred quantity before expiry (allowing 2 days transit)
      const usableDaysAtRecipient = Math.max(0, donor.daysToExpiry - 2);
      const maxConsumableAtRecipient = Math.floor((usableDaysAtRecipient / 7) * recipient.weeklyDemand);
      if (maxConsumableAtRecipient < 5) continue;

      const recommendedTransferQty = Math.min(
        donor.predictedUnusedUnits,
        recipient.shortageUnits,
        maxConsumableAtRecipient
      );
      if (recommendedTransferQty < 5) continue;

      const weightKg = Math.round(recommendedTransferQty * product.unitWeightKg * 100) / 100;
      const isTempControlled = product.storageCondition === 'temp_4_25C';
      const estimatedTransportCostUsd = computeTransportCostUsd(distanceKm, weightKg, isTempControlled);
      const avoidedProcurementUsd = Math.round(recommendedTransferQty * product.unitCostUsd * 100) / 100;
      const netFinancialSavingsUsd =
        Math.round((avoidedProcurementUsd - estimatedTransportCostUsd) * 100) / 100;

      // Reject economically negative transfers unless critical emergency stockout
      if (netFinancialSavingsUsd <= 0 && recipient.stockoutProb < 80) continue;

      // Calculate transparent 0-100 Matching Score
      // 1. Supply & Specification Compatibility (25 pts)
      const compatScore = 25;

      // 2. Shelf-Life Adequacy vs Recipient Consumption Rate (20 pts)
      const weeksNeededToConsume = recommendedTransferQty / Math.max(0.5, recipient.weeklyDemand);
      const shelfLifeMarginRatio = Math.min(
        1,
        (usableDaysAtRecipient / 7 - weeksNeededToConsume) / Math.max(1, weeksNeededToConsume) + 0.55
      );
      const shelfScore = Math.max(6, Math.min(20, Math.round(shelfLifeMarginRatio * 20)));

      // 3. Geographic Proximity & Logistics Feasibility (20 pts)
      const proximityScore = Math.max(4, Math.min(20, Math.round((1 - distanceKm / (maxRadiusKm * 1.15)) * 20)));

      // 4. Recipient Shortage Urgency (20 pts)
      const urgencyScore = Math.max(
        5,
        Math.min(20, Math.round((recipient.stockoutProb / 100) * 14 + (recipient.depletionWeeks < 2 ? 6 : 3)))
      );

      // 5. Net Financial & Environmental Value Ratio (15 pts)
      const netMarginRatio = avoidedProcurementUsd > 0 ? netFinancialSavingsUsd / avoidedProcurementUsd : 0;
      const valueScore = Math.max(3, Math.min(15, Math.round(Math.max(0, netMarginRatio) * 15)));

      const matchScore = Math.min(100, compatScore + shelfScore + proximityScore + urgencyScore + valueScore);

      // Transport carbon debit: ~0.12 kg CO2e per km for regional medical courier van
      const transportCo2e = distanceKm * 0.12;
      const grossAvoidedCo2e = weightKg * product.emissionFactorKgCo2PerKg;
      const avoidedCo2eKg = Math.max(0, Math.round((grossAvoidedCo2e - transportCo2e) * 100) / 100);
      const patientEpisodesSupported = recommendedTransferQty * product.patientEpisodesPerUnit;

      const factors: MatchScoreFactor[] = [
        {
          criterion: 'Supply & Storage Compatibility',
          score: compatScore,
          maxScore: 25,
          explanation: `Exact SKU match (${product.sku}) with verified ${product.storageCondition} storage compliance`,
        },
        {
          criterion: 'Shelf-Life Adequacy',
          score: shelfScore,
          maxScore: 20,
          explanation: `${donor.daysToExpiry}d remaining; recipient absorbs ${recommendedTransferQty} units in ~${weeksNeededToConsume.toFixed(
            1
          )} wks`,
        },
        {
          criterion: 'Geographic Proximity',
          score: proximityScore,
          maxScore: 20,
          explanation: `${distanceKm} km corridor distance ($${estimatedTransportCostUsd.toFixed(
            2
          )} courier cost)`,
        },
        {
          criterion: 'Recipient Shortage Urgency',
          score: urgencyScore,
          maxScore: 20,
          explanation: `${recipient.stockoutProb}% stockout risk (${recipient.depletionWeeks} wks stock left)`,
        },
        {
          criterion: 'Economic & Circular Value',
          score: valueScore,
          maxScore: 15,
          explanation: `$${netFinancialSavingsUsd.toLocaleString()} net savings (${Math.round(
            netMarginRatio * 100
          )}% cost recovery) & ${weightKg} kg diverted`,
        },
      ];

      const reasoningSummary =
        `${donorFacility.name} holds ${donor.predictedUnusedUnits} projected-unused units of ${product.name} expiring in ${donor.daysToExpiry} days. ` +
        `${recipientFacility.name} (${distanceKm} km away) faces a ${recipient.stockoutProb}% stockout probability with ${recipient.depletionWeeks} weeks of stock left. ` +
        `Redistributing ${recommendedTransferQty} units avoids $${avoidedProcurementUsd.toLocaleString()} in new procurement and diverts ${weightKg} kg from expiry waste.`;

      matches.push({
        matchId: `MCH-${donor.batchId.slice(-4)}-${recipient.facilityId.slice(-3)}`,
        donorFacilityId: donor.facilityId,
        donorFacilityName: donorFacility.name,
        recipientFacilityId: recipient.facilityId,
        recipientFacilityName: recipientFacility.name,
        batchId: donor.batchId,
        sku: donor.sku,
        productName: product.name,
        availableSurplusUnits: donor.predictedUnusedUnits,
        recipientShortageUnits: recipient.shortageUnits,
        recommendedTransferQty,
        distanceKm,
        donorDaysToExpiry: donor.daysToExpiry,
        recipientWeeklyDemand: recipient.weeklyDemand,
        matchScore,
        factors,
        estimatedTransportCostUsd,
        avoidedProcurementUsd,
        netFinancialSavingsUsd,
        wasteDivertedKg: weightKg,
        avoidedCo2eKg,
        patientEpisodesSupported,
        reasoningSummary,
        eligibilityVerified: true,
        storageCompatible: true,
      });
    }
  }

  return {
    matches: matches.sort((a, b) => b.matchScore - a.matchScore),
    ineligibleAudit,
  };
}
