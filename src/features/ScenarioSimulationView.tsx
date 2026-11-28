import React, { useEffect, useState } from 'react';
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
import { Download, RotateCcw } from 'lucide-react';
import { DEFAULT_SCENARIO_PARAMS } from '../engines/optimisation';
import { api, triggerFileDownload, type WorkspaceSnapshot } from '../services/api';
import type { OptimisationComparison, ScenarioParameters } from '../types/domain';

interface ScenarioSimulationViewProps {
  snapshot: WorkspaceSnapshot;
}

export const ScenarioSimulationView: React.FC<ScenarioSimulationViewProps> = ({ snapshot }) => {
  const [params, setParams] = useState<ScenarioParameters>(DEFAULT_SCENARIO_PARAMS);
  const [activePreset, setActivePreset] = useState<'baseline' | 'surge' | 'budget_cut' | 'disruption' | 'custom'>('baseline');
  const [result, setResult] = useState<OptimisationComparison>(snapshot.optimisation);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setRunning(true);
      api
        .runSimulation(params)
        .then((res) => setResult(res))
        .catch(() => {
          // Keep previous valid result on transient cancel
        })
        .finally(() => setRunning(false));
    }, 150);
    return () => clearTimeout(timer);
  }, [params, snapshot.batches]);

  const applyPreset = (preset: 'baseline' | 'surge' | 'budget_cut' | 'disruption') => {
    setActivePreset(preset);
    if (preset === 'baseline') setParams(DEFAULT_SCENARIO_PARAMS);
    if (preset === 'surge')
      setParams({
        demandSurgePct: 35,
        procurementBudgetCutPct: 10,
        supplyDisruptionWeeks: 2,
        maxTransferRadiusKm: 200,
        safetyStockMultiplier: 1.25,
      });
    if (preset === 'budget_cut')
      setParams({
        demandSurgePct: 5,
        procurementBudgetCutPct: 30,
        supplyDisruptionWeeks: 1,
        maxTransferRadiusKm: 220,
        safetyStockMultiplier: 1.0,
      });
    if (preset === 'disruption')
      setParams({
        demandSurgePct: 15,
        procurementBudgetCutPct: 5,
        supplyDisruptionWeeks: 5,
        maxTransferRadiusKm: 250,
        safetyStockMultiplier: 1.4,
      });
  };

  const updateCustomParam = (patch: Partial<ScenarioParameters>) => {
    setActivePreset('custom');
    setParams((prev) => ({ ...prev, ...patch }));
  };

  const handleExportAllocationCsv = () => {
    const header = [
      'batchId',
      'sku',
      'productName',
      'donorFacility',
      'recipientFacility',
      'unitsAllocated',
      'transportCostUsd',
      'procurementSavedUsd',
      'netBenefitUsd',
      'wasteDivertedKg',
    ];
    const rows = [
      header.join(','),
      ...result.allocations.map((a) =>
        [
          a.batchId,
          a.sku,
          `"${a.productName}"`,
          `"${a.donorFacilityName}"`,
          `"${a.recipientFacilityName}"`,
          a.unitsAllocated,
          a.transportCostUsd.toFixed(2),
          a.procurementSavedUsd,
          a.netBenefitUsd,
          a.wasteDivertedKg,
        ].join(',')
      ),
    ];
    triggerFileDownload(
      `ecomatch-greedy-allocation-plan-${activePreset}.csv`,
      rows.join('\n'),
      'text/csv;charset=utf-8'
    );
  };

  const chartData = [
    {
      name: 'Procurement ($)',
      Baseline: Math.round(result.baseline.procurementCostUsd),
      Optimised: Math.round(result.optimised.procurementCostUsd),
    },
    {
      name: 'Waste Cost ($)',
      Baseline: Math.round(result.baseline.expiryWasteCostUsd),
      Optimised: Math.round(result.optimised.expiryWasteCostUsd),
    },
    {
      name: 'Total Cost ($)',
      Baseline: Math.round(result.baseline.totalOperationalCostUsd),
      Optimised: Math.round(result.optimised.totalOperationalCostUsd),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Stress-Test Presets */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900">
          {(
            [
              ['baseline', 'Nominal Baseline'],
              ['surge', 'Respiratory Surge (+35%)'],
              ['budget_cut', 'Budget Austerity (-30%)'],
              ['disruption', '5-Week Supplier Disruption'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => applyPreset(id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activePreset === id
                  ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-800/70 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => applyPreset('baseline')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Sliders</span>
        </button>
      </div>

      {/* Controls + Output Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sliders Panel */}
        <section className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-5 space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Stress-Test Parameters (Live greedy allocation Re-Optimisation)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {running ? 'Recalculating capacitated network flow...' : 'Adjust operational shocks to compare isolated vs. redistributed resilience'}
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between mb-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">
                  Unexpected Demand Surge / Drop
                </label>
                <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                  {params.demandSurgePct >= 0 ? `+${params.demandSurgePct}%` : `${params.demandSurgePct}%`}
                </span>
              </div>
              <input
                type="range"
                min={-20}
                max={60}
                step={5}
                value={params.demandSurgePct}
                onChange={(e) => updateCustomParam({ demandSurgePct: Number(e.target.value) })}
                className="w-full accent-emerald-600"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">
                  Procurement Budget Reduction
                </label>
                <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                  -{params.procurementBudgetCutPct}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={40}
                step={5}
                value={params.procurementBudgetCutPct}
                onChange={(e) => updateCustomParam({ procurementBudgetCutPct: Number(e.target.value) })}
                className="w-full accent-emerald-600"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">
                  External Supply Chain Disruption Delay
                </label>
                <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                  +{params.supplyDisruptionWeeks} weeks
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={6}
                step={1}
                value={params.supplyDisruptionWeeks}
                onChange={(e) => updateCustomParam({ supplyDisruptionWeeks: Number(e.target.value) })}
                className="w-full accent-emerald-600"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">
                  Maximum Transfer Corridor Radius
                </label>
                <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                  {params.maxTransferRadiusKm} km
                </span>
              </div>
              <input
                type="range"
                min={25}
                max={300}
                step={15}
                value={params.maxTransferRadiusKm}
                onChange={(e) => updateCustomParam({ maxTransferRadiusKm: Number(e.target.value) })}
                className="w-full accent-emerald-600"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">
                  Safety Stock Policy Multiplier
                </label>
                <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                  {params.safetyStockMultiplier.toFixed(2)}×
                </span>
              </div>
              <input
                type="range"
                min={0.8}
                max={2.0}
                step={0.1}
                value={params.safetyStockMultiplier}
                onChange={(e) => updateCustomParam({ safetyStockMultiplier: Number(e.target.value) })}
                className="w-full accent-emerald-600"
              />
            </div>
          </div>
        </section>

        {/* Live Outcome Chart & Delta Summary */}
        <section className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-5 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono tabular-nums">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60">
              <p className="font-sans text-slate-500 dark:text-slate-400">Net Savings</p>
              <p className="mt-1 text-base font-bold text-emerald-700 dark:text-emerald-400">
                ${result.deltas.netSavingsUsd.toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60">
              <p className="font-sans text-slate-500 dark:text-slate-400">Waste Reduced</p>
              <p className="mt-1 text-base font-bold text-slate-950 dark:text-white">
                {result.deltas.wasteReductionPct}%
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60">
              <p className="font-sans text-slate-500 dark:text-slate-400">Utilisation Gain</p>
              <p className="mt-1 text-base font-bold text-slate-950 dark:text-white">
                {result.baseline.resourceUtilisationPct}% → {result.optimised.resourceUtilisationPct}%
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60">
              <p className="font-sans text-slate-500 dark:text-slate-400">Unmet Shortage</p>
              <p className="mt-1 text-base font-bold text-amber-600 dark:text-amber-400">
                {result.baseline.unmetShortageUnits} → {result.optimised.unmetShortageUnits}u
              </p>
            </div>
          </div>

          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.18} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} />
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
                <Bar dataKey="Baseline" fill="#64748B" radius={[4, 4, 0, 0]} name="Isolated Baseline" />
                <Bar dataKey="Optimised" fill="#10B981" radius={[4, 4, 0, 0]} name="Optimised Redistribution" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Optimal greedy allocation Allocation Plan Table */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Prescriptive Multi-Facility Allocation Plan ({result.allocations.length} Optimal Transfers)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Minimum-cost redistribution corridors selected under active scenario constraints
            </p>
          </div>
          {result.allocations.length > 0 && (
            <button
              type="button"
              onClick={handleExportAllocationCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Plan (.csv)</span>
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-5 font-semibold">Batch & SKU</th>
                <th className="py-2.5 px-4 font-semibold">Donor → Recipient</th>
                <th className="py-2.5 px-4 font-semibold text-right">Units</th>
                <th className="py-2.5 px-4 font-semibold text-right">Courier Cost</th>
                <th className="py-2.5 px-4 font-semibold text-right">Procure Saved</th>
                <th className="py-2.5 px-5 font-semibold text-right">Net Benefit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {result.allocations.map((a) => (
                <tr key={`${a.batchId}-${a.recipientFacilityId}`}>
                  <td className="py-3 px-5">
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">{a.batchId}</span>
                    <div className="text-slate-500 dark:text-slate-400">{a.productName}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                    {a.donorFacilityName} → {a.recipientFacilityName}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900 dark:text-white">
                    {a.unitsAllocated}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                    ${a.transportCostUsd.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                    ${a.procurementSavedUsd.toLocaleString()}
                  </td>
                  <td className="py-3 px-5 text-right font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                    +${a.netBenefitUsd.toLocaleString()}
                  </td>
                </tr>
              ))}
              {result.allocations.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No economically positive transfers remain under this scenario radius/demand configuration.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
