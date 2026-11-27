import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { WorkspaceSnapshot } from '../services/api';
import type { WorkspaceTab } from '../pages/WorkspaceLayout';

interface CommandCentreViewProps {
  snapshot: WorkspaceSnapshot;
  onNavigate: (tab: WorkspaceTab) => void;
}

export const CommandCentreView: React.FC<CommandCentreViewProps> = ({ snapshot, onNavigate }) => {
  const { impact, wasteRisks, matches, transfers, facilities, batches } = snapshot;

  // Per-facility rollup metrics computed directly from current ledger + risk engine
  const facilityPerformance = facilities.map((fac) => {
    const facBatches = batches.filter((b) => b.facilityId === fac.id);
    const totalValue = facBatches.reduce((s, b) => s + b.quantityOnHand * b.unitCostUsd, 0);
    const facRisks = wasteRisks.filter((r) => r.facilityId === fac.id);
    const riskUsd = facRisks.reduce((s, r) => s + r.financialExposureUsd, 0);
    const criticalCount = facRisks.filter((r) => r.urgency === 'Critical').length;
    const outboundMatches = matches.filter((m) => m.donorFacilityId === fac.id).length;
    const inboundMatches = matches.filter((m) => m.recipientFacilityId === fac.id).length;
    return {
      fac,
      totalValue: Math.round(totalValue),
      riskUsd: Math.round(riskUsd),
      criticalCount,
      outboundMatches,
      inboundMatches,
    };
  });

  const criticalAlerts = wasteRisks.filter((r) => r.urgency === 'Critical').slice(0, 5);
  const pendingApprovals = transfers.filter((t) => t.status === 'Pending Approval');

  return (
    <div className="space-y-6">
      {pendingApprovals.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-800 dark:text-slate-200">
            <span className="font-semibold text-amber-800 dark:text-amber-300 tabular-nums">
              {pendingApprovals.length} transfer proposal{pendingApprovals.length > 1 ? 's' : ''} awaiting authorised human approval
            </span>{' '}
            — review compliance details and sign off in the Resource Exchange queue.
          </div>
          <button
            type="button"
            onClick={() => onNavigate('exchange')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-emerald-600 text-white hover:bg-slate-800 dark:hover:bg-emerald-700 transition-colors whitespace-nowrap"
          >
            <span>Review Approval Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {/* Primary KPI Grid (Single-Elevation flat hairline cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Inventory Value · Observed</p>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-950 dark:text-white">
            ${impact.observed.totalInventoryValueUsd.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {impact.observed.totalUnitsOnHand.toLocaleString()} units across {impact.observed.activeFacilities} facilities
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Inventory at Expiry Risk · Predicted</p>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
            ${impact.predicted.inventoryAtRiskUsd.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {impact.predicted.unitsAtRiskOfExpiry.toLocaleString()} projected unused units · {impact.predicted.predictedShortageSeriesCount} shortage alerts
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Potential Procurement Savings · Simulated</p>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
            ${impact.simulatedOptimised.potentialProcurementSavingsUsd.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            ${impact.simulatedOptimised.potentialNetSavingsUsd.toLocaleString()} net savings · {impact.predicted.activeEligibleMatchesCount} active matches
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">SDG 12 Sustainability · Simulated + Observed</p>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-950 dark:text-white">
            {(impact.simulatedOptimised.potentialWasteDivertedKg + impact.observed.completedWasteDivertedKg).toFixed(1)} kg
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {(impact.simulatedOptimised.potentialAvoidedCo2eKg + impact.observed.completedAvoidedCo2eKg).toFixed(1)} kg CO2e est. avoided
          </p>
        </div>
      </div>

      {/* Operational Alerts + Priority Matches */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Intelligent Operational Alerts */}
        <section className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-5">
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Intelligent Operational Alerts
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Highest FEFO waste-risk and compliance exceptions requiring review
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('inventory')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap"
            >
              <span>Inspect Inventory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {criticalAlerts.map((alert) => (
              <button
                key={alert.batchId}
                type="button"
                onClick={() => onNavigate('inventory')}
                className="w-full text-left py-3.5 px-2 -mx-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {alert.batchId}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{alert.facilityName}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        alert.eligibleForTransfer
                          ? 'text-amber-700 dark:text-amber-400 font-medium'
                          : 'text-rose-700 dark:text-rose-400 font-medium'
                      }
                    >
                      {alert.eligibleForTransfer
                        ? `${alert.daysToExpiry}d to expiry`
                        : 'Quarantined / Ineligible'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {alert.productName}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                    {alert.recommendedIntervention}
                  </p>
                </div>
                <div className="text-right shrink-0 font-mono tabular-nums">
                  <div className="text-sm font-bold text-rose-600 dark:text-rose-400">
                    {alert.wasteRiskScore}/100
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    ${alert.financialExposureUsd.toLocaleString()}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Right: Top Matchmaking Recommendations & Recent Exchange Activity */}
        <section className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-5 flex flex-col justify-between gap-6">
          <div>
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Top Redistribution Matches
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Safety-gated corridors awaiting human transfer approval
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('exchange')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap"
              >
                <span>Open Marketplace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {matches.slice(0, 3).map((m) => (
                <button
                  key={m.matchId}
                  type="button"
                  onClick={() => onNavigate('exchange')}
                  className="w-full text-left py-3.5 px-2 -mx-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex items-start justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {m.matchId} · {m.distanceKm} km · {m.donorDaysToExpiry}d shelf life
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {m.productName} ({m.recommendedTransferQty} units)
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 truncate">
                      {m.donorFacilityName} → {m.recipientFacilityName}
                    </p>
                  </div>
                  <div className="text-right shrink-0 font-mono tabular-nums">
                    <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                      {m.matchScore}/100
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      +${m.netFinancialSavingsUsd.toLocaleString()}
                    </div>
                  </div>
                </button>
              ))}
              {matches.length === 0 && (
                <p className="py-6 text-xs text-slate-500 dark:text-slate-400">
                  All currently identified surplus matches have been redistributed.
                </p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Recent Resource Exchange Activity ({transfers.length})
            </h4>
            <div className="mt-2 space-y-2">
              {transfers.slice(0, 3).map((t) => (
                <div
                  key={t.transferId}
                  className="flex items-center justify-between gap-3 text-xs py-1.5"
                >
                  <div className="min-w-0 truncate text-slate-700 dark:text-slate-300">
                    <span className="font-mono font-medium text-slate-900 dark:text-white">
                      {t.transferId}
                    </span>{' '}
                    · {t.quantity}u {t.sku} → {t.recipientFacilityName}
                  </div>
                  <span
                    className={`shrink-0 font-medium ${
                      t.status === 'Completed' || t.status === 'Approved'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : t.status === 'Rejected'
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Facility Performance Table */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Facility Network Performance Ledger
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Real-time stock valuation, expiry exposure, and active redistribution balance
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('network')}
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap"
          >
            View Network Map →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-5 font-semibold">Facility</th>
                <th className="py-2.5 px-4 font-semibold">Region · Type</th>
                <th className="py-2.5 px-4 font-semibold text-right">Stock Value</th>
                <th className="py-2.5 px-4 font-semibold text-right">At-Risk Exposure</th>
                <th className="py-2.5 px-4 font-semibold text-right">Critical Lots</th>
                <th className="py-2.5 px-5 font-semibold text-right">Match Corridors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {facilityPerformance.map(({ fac, totalValue, riskUsd, criticalCount, outboundMatches, inboundMatches }) => (
                <tr key={fac.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-5 font-semibold text-slate-900 dark:text-slate-100">
                    {fac.name}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                    {fac.region} · {fac.type}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                    ${totalValue.toLocaleString()}
                  </td>
                  <td
                    className={`py-3 px-4 text-right font-mono tabular-nums font-semibold ${
                      riskUsd > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    ${riskUsd.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                    {criticalCount}
                  </td>
                  <td className="py-3 px-5 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                    {outboundMatches} donor / {inboundMatches} need
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
