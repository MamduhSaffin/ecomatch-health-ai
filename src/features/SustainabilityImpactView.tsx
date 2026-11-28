import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download } from 'lucide-react';
import { triggerFileDownload, type WorkspaceSnapshot } from '../services/api';

interface SustainabilityImpactViewProps {
  snapshot: WorkspaceSnapshot;
}

export const SustainabilityImpactView: React.FC<SustainabilityImpactViewProps> = ({ snapshot }) => {
  const { impact, optimisation } = snapshot;

  const comparisonChartData = [
    {
      metric: 'Procurement Spend ($)',
      Baseline: Math.round(optimisation.baseline.procurementCostUsd),
      Optimised: Math.round(optimisation.optimised.procurementCostUsd),
    },
    {
      metric: 'Expiry Waste Value ($)',
      Baseline: Math.round(optimisation.baseline.expiryWasteCostUsd),
      Optimised: Math.round(optimisation.optimised.expiryWasteCostUsd),
    },
    {
      metric: 'Total Cost ($)',
      Baseline: Math.round(optimisation.baseline.totalOperationalCostUsd),
      Optimised: Math.round(optimisation.optimised.totalOperationalCostUsd),
    },
  ];

  const handleExportReport = () => {
    const md = [
      '# EcoMatch Health AI — Environmental & Economic Impact Assessment (UN SDG 12)',
      '',
      `Generated: ${new Date().toISOString()}`,
      `Data Disclosure: ${impact.methodologyNotes.syntheticDataDisclosure}`,
      '',
      '## 1. Observed Ledger Results (Approved / Completed Transfers)',
      `- Completed / Approved Transfers: ${impact.observed.completedTransfersCount}`,
      `- Units Transferred: ${impact.observed.completedUnitsTransferred}`,
      `- Estimated Net Financial Savings: $${impact.observed.completedNetSavingsUsd.toLocaleString()}`,
      `- Estimated Waste Diversion: ${impact.observed.completedWasteDivertedKg} kg`,
      `- Estimated Avoided Emissions (Observed Transfers): ${impact.observed.completedAvoidedCo2eKg} kg CO2e`,
      '',
      '## 2. Simulated Network Optimisation Outcomes (Baseline vs. EcoMatch greedy allocation)',
      `- Baseline Total Operational Cost: $${optimisation.baseline.totalOperationalCostUsd.toLocaleString()}`,
      `- Optimised Total Operational Cost: $${optimisation.optimised.totalOperationalCostUsd.toLocaleString()}`,
      `- Simulated Avoided Procurement: $${optimisation.deltas.avoidedProcurementUsd.toLocaleString()}`,
      `- Simulated Net Financial Savings: $${optimisation.deltas.netSavingsUsd.toLocaleString()}`,
      `- Units Potentially Rescued: ${optimisation.deltas.unitsRescued}`,
      `- Waste Reduction: ${optimisation.deltas.wasteReductionPct}% (${optimisation.deltas.wasteDivertedKg} kg diverted)`,
      `- Resource Utilisation Improvement: +${impact.simulatedOptimised.resourceUtilisationDeltaPct} percentage points`,
      `- Estimated Avoided Emissions (Net of Transit): ${optimisation.deltas.avoidedCo2eKg} kg CO2e`,
      `- Patient Care Episodes Capacity Proxy: ${optimisation.deltas.patientEpisodesSupported.toLocaleString()}`,
      '',
      '## 3. Transparent Formulas & Assumptions',
      `- Emission Factors: ${impact.methodologyNotes.emissionFactorRange}`,
      `- Source Calibration: ${impact.methodologyNotes.primaryEmissionFactor}`,
      `- Courier Transport Deduction: ${impact.methodologyNotes.transportEmissionAdjustment}`,
      `- Capacity Proxy Note: ${impact.methodologyNotes.serviceCapacityNote}`,
    ].join('\n');

    triggerFileDownload(
      'ecomatch-sdg12-sustainability-impact-report.md',
      md,
      'text/markdown;charset=utf-8'
    );
  };

  const handleExportCsv = () => {
    const rows = [
      ['provenance_tier', 'metric', 'value', 'unit', 'notes'],
      ['Observed Ledger', 'Completed / Approved Transfers', impact.observed.completedTransfersCount, 'transfers', 'Human-approved in active workspace'],
      ['Observed Ledger', 'Units Transferred', impact.observed.completedUnitsTransferred, 'units', 'Preserved original expiry dates'],
      ['Observed Ledger', 'Estimated Net Financial Savings', impact.observed.completedNetSavingsUsd, 'USD', 'Net of courier logistics cost'],
      ['Observed Ledger', 'Estimated Waste Diversion', impact.observed.completedWasteDivertedKg, 'kg', 'Non-regulated consumables rescued'],
      ['Observed Ledger', 'Estimated CO2e Avoided (Observed)', impact.observed.completedAvoidedCo2eKg, 'kg_co2e', 'Net of road transit emissions'],
      ['Simulated greedy allocation Outcome', 'Baseline Total Operational Cost', Math.round(optimisation.baseline.totalOperationalCostUsd), 'USD', 'Conventional isolated purchasing'],
      ['Simulated greedy allocation Outcome', 'Optimised Total Operational Cost', Math.round(optimisation.optimised.totalOperationalCostUsd), 'USD', 'Capacitated Engine D redistribution'],
      ['Simulated greedy allocation Outcome', 'Simulated Avoided Procurement', optimisation.deltas.avoidedProcurementUsd, 'USD', 'Duplicate purchases avoided'],
      ['Simulated greedy allocation Outcome', 'Simulated Net Savings', optimisation.deltas.netSavingsUsd, 'USD', 'After inter-facility courier costs'],
      ['Simulated greedy allocation Outcome', 'Expiry Waste Reduction', optimisation.deltas.wasteReductionPct, 'percent', 'Relative to isolated baseline'],
      ['Simulated greedy allocation Outcome', 'Simulated Waste Diverted', optimisation.deltas.wasteDivertedKg, 'kg', 'Total weight diverted from incineration'],
      ['Estimated Impact', 'Simulated Net CO2e Avoided', optimisation.deltas.avoidedCo2eKg, 'kg_co2e', 'EPA WARM net of 0.12 kg/km transit'],
      ['Service Capacity Proxy', 'Patient Care Episodes Supported', optimisation.deltas.patientEpisodesSupported, 'episodes_proxy', 'Supply availability proxy (not clinical outcome)'],
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    triggerFileDownload('ecomatch-sdg12-impact-audit.csv', csv, 'text/csv;charset=utf-8');
  };

  return (
    <div className="space-y-6">
      {/* Header & Export */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            UN SDG 12 · Responsible Consumption & Production Impact Attribution
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Explicitly distinguishes Observed Ledger transfers, Model Predictions, Simulated greedy allocation Outcomes, and Estimated Environmental Benefits.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0D192B] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Audit CSV</span>
          </button>
          <button
            type="button"
            onClick={handleExportReport}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Impact Report (.md)</span>
          </button>
        </div>
      </div>

      {/* 4-Tier Provenance Metric Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-5">
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400">Observed Ledger</p>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
            ${impact.observed.completedNetSavingsUsd.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 tabular-nums">
            {impact.observed.completedUnitsTransferred} units across {impact.observed.completedTransfersCount} approved/completed transfer(s) · {impact.observed.completedWasteDivertedKg} kg diverted
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-5">
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400">Simulated greedy allocation Outcome</p>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-950 dark:text-white">
            ${impact.simulatedOptimised.potentialNetSavingsUsd.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 tabular-nums">
            {impact.simulatedOptimised.potentialWasteReductionPct}% expiry waste reduction · +{impact.simulatedOptimised.resourceUtilisationDeltaPct}pp resource utilisation
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-5">
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400">Estimated Environmental Benefit</p>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-teal-700 dark:text-teal-400">
            {impact.simulatedOptimised.potentialAvoidedCo2eKg} kg CO2e
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 tabular-nums">
            {impact.simulatedOptimised.potentialWasteDivertedKg} kg diverted (net of 0.12 kg CO2e/km courier transit)
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-5">
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400">Service Capacity Proxy</p>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-950 dark:text-white">
            {impact.simulatedOptimised.potentialPatientEpisodesSupported.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            Estimated clinical care episodes supported by rescued sterile consumables
          </p>
        </div>
      </div>

      {/* Baseline vs Optimised Chart + Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Conventional Isolated Procurement vs. EcoMatch Optimised Network ($)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Simulated financial comparison computed by Engine D greedy allocation solver on current inventory state
          </p>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.18} />
                <XAxis dataKey="metric" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#F8FAFC',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Baseline" fill="#64748B" radius={[4, 4, 0, 0]} name="Conventional Isolated" />
                <Bar dataKey="Optimised" fill="#10B981" radius={[4, 4, 0, 0]} name="EcoMatch Redistributed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Transparent Methodology & Formulas
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              All environmental and financial equations are auditable and conservative
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 font-mono text-[11px] text-slate-700 dark:text-slate-300">
              <div className="font-semibold text-slate-900 dark:text-white mb-1">Net Financial Recovery</div>
              Net Savings = (Units Rescued × Unit Cost) − Courier Cost(distance, weight, temp_mult)
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 font-mono text-[11px] text-slate-700 dark:text-slate-300">
              <div className="font-semibold text-slate-900 dark:text-white mb-1">Net Avoided Emissions</div>
              CO2e_net = max(0, (Units × Weight_kg × EF_sku) − (Distance_km × 0.12 kg/km))
            </div>
            <div className="space-y-1.5 text-slate-600 dark:text-slate-300 pt-1">
              <p>
                <span className="font-semibold text-slate-900 dark:text-white">Emission Factors:</span>{' '}
                {impact.methodologyNotes.emissionFactorRange}. {impact.methodologyNotes.primaryEmissionFactor}.
              </p>
              <p>
                <span className="font-semibold text-slate-900 dark:text-white">Capacity Proxy Disclaimer:</span>{' '}
                {impact.methodologyNotes.serviceCapacityNote}.
              </p>
              <p>
                <span className="font-semibold text-slate-900 dark:text-white">Dataset Disclosure:</span>{' '}
                {impact.methodologyNotes.syntheticDataDisclosure}.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
