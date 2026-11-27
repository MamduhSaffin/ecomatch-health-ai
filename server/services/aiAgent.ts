import { GoogleGenAI, Type } from '@google/genai';
import type {
  BatchWasteRisk,
  ImpactSummary,
  OptimisationComparison,
  ResourceMatch,
  TransferRecord,
} from '../../src/types/domain';

export interface AgentEvidenceItem {
  label: string;
  value: string;
  source: string;
}

export interface AgentProposedAction {
  actionType: 'propose_transfer' | 'review_waste_risk' | 'run_simulation' | 'export_report';
  title: string;
  rationale: string;
  matchId?: string;
  requiresHumanApproval: boolean;
}

export interface AgentResponsePayload {
  mode: 'gemini_ai' | 'deterministic_analytics';
  modelUsed: string;
  answer: string;
  evidenceItems: AgentEvidenceItem[];
  proposedActions: AgentProposedAction[];
  guardrailNotice: string;
}

export interface OperationalContextSnapshot {
  wasteRisks: BatchWasteRisk[];
  matches: ResourceMatch[];
  optimisation: OptimisationComparison;
  impact: ImpactSummary;
  transfers: TransferRecord[];
}

const CLINICAL_KEYWORDS = [
  'diagnose',
  'diagnosis',
  'prescribe',
  'prescription',
  'dosage',
  'dose',
  'treatment plan',
  'symptom',
  'chemotherapy regimen',
  'antibiotic course',
  'clinical advice',
];

export function isClinicalQuery(query: string): boolean {
  const lower = query.toLowerCase();
  return CLINICAL_KEYWORDS.some((kw) => lower.includes(kw));
}

export function buildClinicalRefusalResponse(): AgentResponsePayload {
  return {
    mode: 'deterministic_analytics',
    modelUsed: 'Operational Policy Guardrail',
    answer:
      'EcoMatch Health AI is strictly a healthcare supply-chain and resource optimisation platform. It does not provide clinical diagnosis, prescribing guidance, or patient treatment advice. Please consult a licensed clinician for medical decisions. I can assist with inventory waste risk, demand forecasting, resource redistribution matches, and sustainability impact analysis.',
    evidenceItems: [
      {
        label: 'Scope Policy',
        value: 'Non-clinical medical consumables operations only',
        source: 'Governance Policy §5.F',
      },
    ],
    proposedActions: [],
    guardrailNotice: 'Clinical diagnosis and treatment guidance are strictly prohibited by platform safety policy.',
  };
}

/**
 * Deterministic evidence-backed analytical query responder (explicitly labeled as rule-based data query,
 * never masquerading as an LLM).
 */
export function runDeterministicOperationalQuery(
  query: string,
  ctx: OperationalContextSnapshot
): AgentResponsePayload {
  if (isClinicalQuery(query)) {
    return buildClinicalRefusalResponse();
  }

  const lower = query.toLowerCase();
  const topRisks = ctx.wasteRisks.filter((r) => r.predictedUnusedUnits > 0).slice(0, 4);
  const topMatches = ctx.matches.slice(0, 4);

  if (lower.includes('waste') || lower.includes('expir') || lower.includes('risk')) {
    const lines = topRisks
      .map(
        (r, i) =>
          `${i + 1}. ${r.productName} (${r.batchId} at ${r.facilityName}): Risk Score ${r.wasteRiskScore}/100 — ${r.predictedUnusedUnits} projected unused units expiring in ${r.daysToExpiry} days ($${r.financialExposureUsd.toLocaleString()} exposure, ${r.weightAtRiskKg} kg).`
      )
      .join(' ');

    return {
      mode: 'deterministic_analytics',
      modelUsed: 'Deterministic Engine B & E Ledger Query',
      answer: `Across the active network, $${ctx.impact.predicted.inventoryAtRiskUsd.toLocaleString()} (${ctx.impact.predicted.unitsAtRiskOfExpiry.toLocaleString()} units) faces projected expiry waste. Highest-risk batches under strict FEFO consumption: ${lines}`,
      evidenceItems: topRisks.map((r) => ({
        label: `${r.batchId} (${r.facilityName})`,
        value: `Score ${r.wasteRiskScore}/100 · $${r.financialExposureUsd.toLocaleString()} at risk`,
        source: 'Engine B FEFO Risk Model',
      })),
      proposedActions: topMatches.slice(0, 2).map((m) => ({
        actionType: 'propose_transfer',
        title: `Approve ${m.recommendedTransferQty} units of ${m.sku}: ${m.donorFacilityName} -> ${m.recipientFacilityName}`,
        rationale: `Match score ${m.matchScore}/100 recovers $${m.netFinancialSavingsUsd.toLocaleString()} net savings and diverts ${m.wasteDivertedKg} kg.`,
        matchId: m.matchId,
        requiresHumanApproval: true,
      })),
      guardrailNotice: 'All operational changes require authorised human approval. Data reflects synthetic demonstration ledger.',
    };
  }

  if (lower.includes('match') || lower.includes('transfer') || lower.includes('priorit') || lower.includes('shortage')) {
    const summary = topMatches
      .map(
        (m, i) =>
          `${i + 1}. [${m.matchScore}/100] ${m.recommendedTransferQty} units of ${m.productName} from ${m.donorFacilityName} to ${m.recipientFacilityName} (${m.distanceKm} km, saves $${m.netFinancialSavingsUsd.toLocaleString()} net, diverts ${m.wasteDivertedKg} kg).`
      )
      .join(' ');

    return {
      mode: 'deterministic_analytics',
      modelUsed: 'Deterministic Engine C & D Matchmaking Query',
      answer: `Engine C verified ${ctx.matches.length} eligible redistribution matches after excluding recalled, expired, and storage-incompatible lots. Priority transfers: ${summary}`,
      evidenceItems: topMatches.map((m) => ({
        label: `${m.matchId} (${m.sku})`,
        value: `Score ${m.matchScore}/100 · ${m.recommendedTransferQty} units · $${m.netFinancialSavingsUsd.toLocaleString()} net`,
        source: 'Engine C Explainable Matcher',
      })),
      proposedActions: topMatches.slice(0, 2).map((m) => ({
        actionType: 'propose_transfer',
        title: `Queue Human Approval for ${m.matchId} (${m.recommendedTransferQty} units)`,
        rationale: m.reasoningSummary,
        matchId: m.matchId,
        requiresHumanApproval: true,
      })),
      guardrailNotice: 'Human authorisation is mandatory prior to dispatching any inter-facility consumables transfer.',
    };
  }

  if (lower.includes('environment') || lower.includes('co2') || lower.includes('carbon') || lower.includes('impact') || lower.includes('financ') || lower.includes('saving') || lower.includes('procure')) {
    const opt = ctx.optimisation;
    return {
      mode: 'deterministic_analytics',
      modelUsed: 'Deterministic Engine D & E Impact Query',
      answer: `Prescriptive network optimisation reduces total operational spend from $${opt.baseline.totalOperationalCostUsd.toLocaleString()} (conventional isolated procurement) to $${opt.optimised.totalOperationalCostUsd.toLocaleString()} — yielding $${opt.deltas.netSavingsUsd.toLocaleString()} in simulated net savings ($${opt.deltas.avoidedProcurementUsd.toLocaleString()} avoided procurement). Environmentally, redistributing ${opt.deltas.unitsRescued.toLocaleString()} eligible units diverts ${opt.deltas.wasteDivertedKg} kg of medical consumables from expiry disposal and avoids an estimated ${opt.deltas.avoidedCo2eKg} kg CO2e (net of courier transport emissions).`,
      evidenceItems: [
        {
          label: 'Avoided Procurement (Simulated)',
          value: `$${opt.deltas.avoidedProcurementUsd.toLocaleString()}`,
          source: 'Engine D LP Solver',
        },
        {
          label: 'Net Operational Savings (Simulated)',
          value: `$${opt.deltas.netSavingsUsd.toLocaleString()}`,
          source: 'Engine D Baseline vs Optimised',
        },
        {
          label: 'Waste Diverted by Weight (Simulated)',
          value: `${opt.deltas.wasteDivertedKg} kg (${opt.deltas.wasteReductionPct}% reduction)`,
          source: 'Engine E Product Weight Ledger',
        },
        {
          label: 'Estimated Avoided Emissions',
          value: `${opt.deltas.avoidedCo2eKg} kg CO2e`,
          source: 'Engine E (2.20–2.90 kg CO2e/kg minus 0.12 kg/km transit)',
        },
      ],
      proposedActions: [
        {
          actionType: 'export_report',
          title: 'Export SDG 12 Sustainability & Financial Impact Report',
          rationale: 'Includes full observed vs. simulated provenance breakdown and documented emission factors.',
          requiresHumanApproval: false,
        },
      ],
      guardrailNotice: 'Environmental estimates use conservative published polymer/disposal ranges on synthetic demonstration data.',
    };
  }

  // Default executive overview answer
  const bestMatch = topMatches[0];
  return {
    mode: 'deterministic_analytics',
    modelUsed: 'Deterministic Multi-Engine Operational Query',
    answer: `Network overview across ${ctx.impact.observed.activeFacilities} verified facilities: Total inventory value is $${ctx.impact.observed.totalInventoryValueUsd.toLocaleString()}, with $${ctx.impact.predicted.inventoryAtRiskUsd.toLocaleString()} at projected expiry risk and ${ctx.impact.predicted.predictedShortageSeriesCount} facility-SKU series facing near-term shortages. Engine D identifies $${ctx.optimisation.deltas.netSavingsUsd.toLocaleString()} in simulated net savings and ${ctx.optimisation.deltas.wasteDivertedKg} kg of avoidable waste through ${ctx.optimisation.allocations.length} optimised transfers.`,
    evidenceItems: [
      {
        label: 'Inventory at Risk (Predicted)',
        value: `$${ctx.impact.predicted.inventoryAtRiskUsd.toLocaleString()} (${ctx.impact.predicted.unitsAtRiskOfExpiry} units)`,
        source: 'Engine B FEFO Model',
      },
      {
        label: 'Top Recommended Match',
        value: bestMatch
          ? `${bestMatch.matchId}: ${bestMatch.recommendedTransferQty} units (Score ${bestMatch.matchScore}/100)`
          : 'No active surplus matches',
        source: 'Engine C Matchmaker',
      },
      {
        label: 'Simulated Network Savings',
        value: `$${ctx.optimisation.deltas.netSavingsUsd.toLocaleString()} · ${ctx.optimisation.deltas.avoidedCo2eKg} kg CO2e`,
        source: 'Engine D & E',
      },
    ],
    proposedActions: bestMatch
      ? [
          {
            actionType: 'propose_transfer',
            title: `Review Top Match ${bestMatch.matchId} (${bestMatch.sku})`,
            rationale: bestMatch.reasoningSummary,
            matchId: bestMatch.matchId,
            requiresHumanApproval: true,
          },
        ]
      : [],
    guardrailNotice: 'Deterministic analytical summary derived directly from active application engines; requires human approval for any transfer.',
  };
}

/**
 * Live Gemini API Operational Agent (Engine F) — strictly server-side via @google/genai.
 * Uses gemini-4-hydrogen with structured JSON output grounded in live operational state.
 */
export async function runGeminiOperationalAgent(
  query: string,
  ctx: OperationalContextSnapshot
): Promise<AgentResponsePayload> {
  if (isClinicalQuery(query)) {
    return buildClinicalRefusalResponse();
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    const err = new Error(
      'GEMINI_API_KEY is not configured on the server. Add a valid key in Settings > Secrets to use the live Gemini AI Agent, or switch to the Deterministic Ledger Query mode.'
    );
    (err as Error & { statusCode?: number }).statusCode = 503;
    throw err;
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Compact grounded operational context payload
  const groundedContext = {
    dataProvenance: 'Synthetic Demonstration Dataset (seed 20261012) — Non-regulated medical consumables only',
    observedSummary: ctx.impact.observed,
    predictedSummary: ctx.impact.predicted,
    simulatedOptimisationSummary: ctx.optimisation.deltas,
    baselineVsOptimised: {
      baseline: ctx.optimisation.baseline,
      optimised: ctx.optimisation.optimised,
    },
    topWasteRiskBatches: ctx.wasteRisks.slice(0, 6).map((r) => ({
      batchId: r.batchId,
      facility: r.facilityName,
      sku: r.sku,
      product: r.productName,
      daysToExpiry: r.daysToExpiry,
      predictedUnusedUnits: r.predictedUnusedUnits,
      financialExposureUsd: r.financialExposureUsd,
      wasteRiskScore: r.wasteRiskScore,
      eligibleForTransfer: r.eligibleForTransfer,
      ineligibilityReasons: r.ineligibilityReasons,
    })),
    topEligibleMatches: ctx.matches.slice(0, 6).map((m) => ({
      matchId: m.matchId,
      donor: m.donorFacilityName,
      recipient: m.recipientFacilityName,
      sku: m.sku,
      product: m.productName,
      recommendedTransferQty: m.recommendedTransferQty,
      matchScore: m.matchScore,
      distanceKm: m.distanceKm,
      netFinancialSavingsUsd: m.netFinancialSavingsUsd,
      wasteDivertedKg: m.wasteDivertedKg,
      avoidedCo2eKg: m.avoidedCo2eKg,
      reasoningSummary: m.reasoningSummary,
    })),
    recentTransfers: ctx.transfers.slice(0, 5).map((t) => ({
      transferId: t.transferId,
      sku: t.sku,
      quantity: t.quantity,
      status: t.status,
      donor: t.donorFacilityName,
      recipient: t.recipientFacilityName,
    })),
  };

  const systemInstruction = `You are Engine F, the EcoMatch Health AI Resource Operations Agent for a multi-facility medical consumables network aligned with UN SDG 12.
STRICT RULES:
1. Ground EVERY quantitative statement exclusively in the provided JSON operational snapshot. Never invent facilities, batch IDs, savings, carbon factors, or clinical statistics.
2. Distinguish clearly between Observed Ledger values, Model Predictions, Simulated LP Outcomes, and Estimated Environmental Benefits.
3. Never provide clinical diagnosis, prescribing advice, or treatment guidance.
4. Every operational recommendation (transfers, reorder freezes) MUST specify requiresHumanApproval: true.
5. Keep your answer concise (3-5 crisp, evidence-backed sentences) suitable for hospital supply-chain directors.`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `OPERATIONAL DATA SNAPSHOT:\n${JSON.stringify(groundedContext)}\n\nUSER OPERATIONAL QUESTION:\n${query}`,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          answer: {
            type: Type.STRING,
            description: 'Concise, evidence-backed operational answer citing real batch IDs, facilities, and figures.',
          },
          evidenceItems: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                value: { type: Type.STRING },
                source: { type: Type.STRING },
              },
              required: ['label', 'value', 'source'],
            },
          },
          proposedActions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                actionType: { type: Type.STRING },
                title: { type: Type.STRING },
                rationale: { type: Type.STRING },
                matchId: { type: Type.STRING },
                requiresHumanApproval: { type: Type.BOOLEAN },
              },
              required: ['actionType', 'title', 'rationale', 'requiresHumanApproval'],
            },
          },
          guardrailNotice: { type: Type.STRING },
        },
        required: ['answer', 'evidenceItems', 'proposedActions', 'guardrailNotice'],
      },
    },
  });

  const rawText = (response.text ?? '').trim();
  const parsed = JSON.parse(rawText) as {
    answer: string;
    evidenceItems: AgentEvidenceItem[];
    proposedActions: AgentProposedAction[];
    guardrailNotice: string;
  };

  return {
    mode: 'gemini_ai',
    modelUsed: 'gemini-4-hydrogen',
    answer: parsed.answer,
    evidenceItems: parsed.evidenceItems ?? [],
    proposedActions: (parsed.proposedActions ?? []).map((a) => ({
      ...a,
      actionType: (['propose_transfer', 'review_waste_risk', 'run_simulation', 'export_report'].includes(
        a.actionType
      )
        ? a.actionType
        : 'review_waste_risk') as AgentProposedAction['actionType'],
      requiresHumanApproval: true,
    })),
    guardrailNotice:
      parsed.guardrailNotice ||
      'AI recommendations are grounded in synthetic demonstration data and require authorised human approval.',
  };
}
