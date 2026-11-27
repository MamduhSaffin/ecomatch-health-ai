import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SCENARIO_PARAMS,
  FACILITIES,
  PRODUCTS,
  assessBatchWasteRisks,
  computeImpactSummary,
  computeIntelligentMatches,
  createInitialInventoryBatches,
  forecastFacilitySku,
  getNetworkModelBenchmark,
  runPrescriptiveOptimisation,
} from '../src/engines/index';
import {
  isClinicalQuery,
  runDeterministicOperationalQuery,
} from '../server/services/aiAgent';
import {
  authenticateUser,
  claimFirstRunAdmin,
  issueSessionToken,
  registerFacilityAccount,
  verifySessionToken,
} from '../server/services/authService';

describe('Engine A — Predictive Demand Intelligence', () => {
  it('enforces strict chronological train/val/test splits without leakage and computes real metrics', () => {
    const batches = createInitialInventoryBatches();
    const res = forecastFacilitySku('FAC-001', 'SKU-IVS-020', batches);

    expect(res.trainWeeks).toBe(72);
    expect(res.valWeeks).toBe(16);
    expect(res.testWeeks).toBe(16);
    expect(res.modelComparison).toHaveLength(4);
    expect(res.modelComparison.filter((m) => m.selected)).toHaveLength(1);

    // Selected model must be the exact minimum validation WAPE candidate
    const selected = res.modelComparison.find((m) => m.selected)!;
    const minValWape = Math.min(...res.modelComparison.map((m) => m.valWape));
    expect(selected.valWape).toBe(minValWape);

    // Every 12-week forecast point must maintain lower95 <= predicted <= upper95
    const futurePoints = res.series.filter((p) => p.isForecast);
    expect(futurePoints).toHaveLength(12);
    for (const pt of futurePoints) {
      expect(pt.lower95!).toBeLessThanOrEqual(pt.predicted);
      expect(pt.upper95!).toBeGreaterThanOrEqual(pt.predicted);
    }
  });

  it('evaluates all 80 facility-SKU series in network benchmark', () => {
    const bench = getNetworkModelBenchmark();
    expect(bench.totalSeriesEvaluated).toBe(FACILITIES.length * PRODUCTS.length);
    const totalWins = bench.models.reduce((s, m) => s + m.winCount, 0);
    expect(totalWins).toBe(80);
  });
});

describe('Engine B — Waste & Expiry Risk Intelligence', () => {
  it('computes explainable 0-100 risk scores whose 4 factor points match the total score', () => {
    const batches = createInitialInventoryBatches();
    const risks = assessBatchWasteRisks(batches);
    expect(risks.length).toBe(batches.length);

    for (const r of risks) {
      expect(r.wasteRiskScore).toBeGreaterThanOrEqual(0);
      expect(r.wasteRiskScore).toBeLessThanOrEqual(100);
      const factorSum = r.factors.reduce((s, f) => s + f.points, 0);
      expect(Math.min(100, factorSum)).toBe(r.wasteRiskScore);
    }

    // Hero surplus batch BCH-IVS-2601 must show predicted unused units before expiry
    const heroBatch = risks.find((r) => r.batchId === 'BCH-IVS-2601')!;
    expect(heroBatch.eligibleForTransfer).toBe(true);
    expect(heroBatch.predictedUnusedUnits).toBeGreaterThan(20);
    expect(heroBatch.fefoPriorityRank).toBe(1);
  });
});

describe('Engine C — Intelligent Resource Matchmaking & Hard Eligibility Gates', () => {
  it('blocks recalled and expired lots BEFORE scoring and explains valid matches', () => {
    const batches = createInitialInventoryBatches();
    const { matches, ineligibleAudit } = computeIntelligentMatches(batches);

    // Recalled BCH-REC-9901 and Expired BCH-EXP-9902 MUST appear in ineligible audit and NEVER in matches
    const auditIds = ineligibleAudit.map((i) => i.batchId);
    expect(auditIds).toContain('BCH-REC-9901');
    expect(auditIds).toContain('BCH-EXP-9902');

    const matchBatchIds = matches.map((m) => m.batchId);
    expect(matchBatchIds).not.toContain('BCH-REC-9901');
    expect(matchBatchIds).not.toContain('BCH-EXP-9902');

    expect(matches.length).toBeGreaterThan(0);
    for (const m of matches) {
      expect(m.eligibilityVerified).toBe(true);
      expect(m.storageCompatible).toBe(true);
      expect(m.matchScore).toBeGreaterThanOrEqual(0);
      expect(m.matchScore).toBeLessThanOrEqual(100);
      const sumScore = m.factors.reduce((s, f) => s + f.score, 0);
      expect(Math.min(100, sumScore)).toBe(m.matchScore);
    }
  });
});

describe('Engine D & E — Prescriptive Optimisation & Impact Provenance', () => {
  it('reduces total operational cost and expiry waste compared to conventional isolated baseline', () => {
    const batches = createInitialInventoryBatches();
    const opt = runPrescriptiveOptimisation(batches, DEFAULT_SCENARIO_PARAMS);

    expect(opt.deltas.unitsRescued).toBeGreaterThan(0);
    expect(opt.optimised.totalOperationalCostUsd).toBeLessThan(opt.baseline.totalOperationalCostUsd);
    expect(opt.optimised.expiryWasteUnits).toBeLessThan(opt.baseline.expiryWasteUnits);
    expect(opt.deltas.netSavingsUsd).toBeGreaterThan(0);
    expect(opt.deltas.wasteDivertedKg).toBeGreaterThan(0);
    expect(opt.deltas.avoidedCo2eKg).toBeGreaterThan(0);

    const impact = computeImpactSummary(batches, []);
    expect(impact.observed.totalInventoryValueUsd).toBeGreaterThan(0);
    expect(impact.simulatedOptimised.potentialNetSavingsUsd).toBe(opt.deltas.netSavingsUsd);
  });
});

describe('Engine F & Security Guardrails', () => {
  it('refuses clinical diagnosis queries and answers operational queries with cited evidence', () => {
    expect(isClinicalQuery('Can you diagnose sepsis and prescribe an antibiotic dosage?')).toBe(true);
    expect(isClinicalQuery('Which medical supplies face the highest waste risk?')).toBe(false);

    const batches = createInitialInventoryBatches();
    const ctx = {
      wasteRisks: assessBatchWasteRisks(batches),
      matches: computeIntelligentMatches(batches).matches,
      optimisation: runPrescriptiveOptimisation(batches),
      impact: computeImpactSummary(batches, []),
      transfers: [],
    };

    const refusal = runDeterministicOperationalQuery('Please prescribe a dosage for my patient', ctx);
    expect(refusal.answer.toLowerCase()).toContain('does not provide clinical diagnosis');

    const wasteRes = runDeterministicOperationalQuery('Which medical supplies face the highest waste risk?', ctx);
    expect(wasteRes.evidenceItems.length).toBeGreaterThan(0);
    expect(wasteRes.proposedActions.every((a) => a.requiresHumanApproval)).toBe(true);
  });

  it('enforces scrypt password verification, signed Bearer sessions, and one-time admin claim', () => {
    const claim = claimFirstRunAdmin('founder@ecomatch.test', 'StrongPass2026!');
    expect(claim.ok).toBe(true);
    const secondClaim = claimFirstRunAdmin('attacker@evil.test', 'HackPass2026!');
    expect(secondClaim.ok).toBe(false);

    const reg = registerFacilityAccount({
      email: 'ops@metro.test',
      name: 'Metro Ops Lead',
      password: 'SecurePassword99!',
      role: 'inventory_manager',
      orgId: 'ORG-METRO',
    });
    expect(reg.ok).toBe(true);

    const badLogin = authenticateUser('ops@metro.test', 'WrongPassword');
    expect(badLogin).toBeNull();

    const goodLogin = authenticateUser('ops@metro.test', 'SecurePassword99!');
    expect(goodLogin?.orgId).toBe('ORG-METRO');

    const token = issueSessionToken(goodLogin!);
    const verified = verifySessionToken(token);
    expect(verified?.email).toBe('ops@metro.test');
    expect(verifySessionToken(`${token}tampered`)).toBeNull();
  });
});
