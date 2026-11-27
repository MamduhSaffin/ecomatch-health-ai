import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { ResourceNetworkMap } from '../components/ResourceNetworkMap';
import type { WorkspaceSnapshot } from '../services/api';
import type { WorkspaceTab } from '../pages/WorkspaceLayout';

interface FacilityNetworkViewProps {
  snapshot: WorkspaceSnapshot;
  onNavigate: (tab: WorkspaceTab) => void;
}

export const FacilityNetworkView: React.FC<FacilityNetworkViewProps> = ({ snapshot, onNavigate }) => {
  const [selectedOrgId, setSelectedOrgId] = useState<string>('ALL');
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(
    snapshot.facilities[0]?.id ?? 'FAC-001'
  );

  const visibleFacilities =
    selectedOrgId === 'ALL'
      ? snapshot.facilities
      : snapshot.facilities.filter((f) => f.orgId === selectedOrgId);

  const selectedFacility =
    visibleFacilities.find((f) => f.id === selectedFacilityId) ?? visibleFacilities[0];

  const facBatches = snapshot.batches.filter((b) => b.facilityId === selectedFacility?.id);
  const facRisks = snapshot.wasteRisks.filter((r) => r.facilityId === selectedFacility?.id);
  const facMatches = snapshot.matches.filter(
    (m) =>
      m.donorFacilityId === selectedFacility?.id || m.recipientFacilityId === selectedFacility?.id
  );

  const orgName =
    snapshot.organisations.find((o) => o.id === selectedFacility?.orgId)?.name ?? 'Regional Network';

  return (
    <div className="space-y-6">
      {/* Organisation filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setSelectedOrgId('ALL')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              selectedOrgId === 'ALL'
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            All Organisations ({snapshot.facilities.length})
          </button>
          {snapshot.organisations.map((org) => (
            <button
              key={org.id}
              type="button"
              onClick={() => setSelectedOrgId(org.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                selectedOrgId === org.id
                  ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {org.name.split(' ').slice(0, 2).join(' ')}
            </button>
          ))}
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          {snapshot.facilities.filter((f) => f.verified).length} of {snapshot.facilities.length} facilities verified for inter-facility exchange
        </p>
      </div>

      {/* Interactive Geographic Corridor Map */}
      <ResourceNetworkMap
        facilities={visibleFacilities}
        matches={snapshot.matches}
        selectedFacilityId={selectedFacility?.id}
        onSelectFacility={(id) => setSelectedFacilityId(id)}
        onSelectMatch={() => onNavigate('exchange')}
      />

      {/* Split: Facility Directory + Selected Facility Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] divide-y divide-slate-100 dark:divide-slate-800">
          {visibleFacilities.map((fac) => {
            const active = fac.id === selectedFacility?.id;
            const riskSum = snapshot.wasteRisks
              .filter((r) => r.facilityId === fac.id)
              .reduce((s, r) => s + r.financialExposureUsd, 0);
            return (
              <button
                key={fac.id}
                type="button"
                onClick={() => setSelectedFacilityId(fac.id)}
                className={`w-full text-left px-5 py-3.5 transition-colors flex items-center justify-between gap-3 ${
                  active
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {fac.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {fac.city} · {fac.type} · {fac.bedCount} beds
                  </p>
                </div>
                <div className="text-right shrink-0 font-mono tabular-nums text-xs">
                  <div className={riskSum > 0 ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-emerald-700 dark:text-emerald-400'}>
                    {riskSum > 0 ? `$${Math.round(riskSum).toLocaleString()} risk` : 'Nominal'}
                  </div>
                  <div className="text-slate-400">{fac.leadTimeWeeks}w lead</div>
                </div>
              </button>
            );
          })}
        </div>

        {selectedFacility && (
          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-6 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{selectedFacility.verified ? 'Verified Network Facility' : 'Pending Verification'}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{selectedFacility.id}</span>
                </div>
                <h3 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                  {selectedFacility.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {orgName} · {selectedFacility.region} · {selectedFacility.city} ({selectedFacility.lat.toFixed(3)}, {selectedFacility.lon.toFixed(3)})
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('inventory')}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-emerald-600 text-white hover:bg-slate-800 dark:hover:bg-emerald-700 transition-colors whitespace-nowrap"
              >
                Manage Inventory
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-slate-500 dark:text-slate-400">Capacity</p>
                <p className="mt-1 text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                  {selectedFacility.bedCount} beds
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Supplier Lead Time</p>
                <p className="mt-1 text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                  {selectedFacility.leadTimeWeeks} weeks
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Active Batches</p>
                <p className="mt-1 text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                  {facBatches.length}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Monthly Supply Budget</p>
                <p className="mt-1 text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                  ${selectedFacility.avgMonthlyBudgetUsd.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Certified Storage Capabilities
              </h4>
              <p className="mt-1.5 text-xs font-mono text-slate-600 dark:text-slate-400">
                {selectedFacility.storageCapabilities.join(' · ')}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Active Corridors Involving {selectedFacility.name} ({facMatches.length})
              </h4>
              {facMatches.length === 0 ? (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  No open redistribution corridors for this facility under current inventory levels.
                </p>
              ) : (
                <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
                  {facMatches.map((m) => {
                    const isDonor = m.donorFacilityId === selectedFacility.id;
                    return (
                      <div key={m.matchId} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <span className={isDonor ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-amber-600 dark:text-amber-400 font-semibold'}>
                            {isDonor ? 'Outbound Surplus' : 'Inbound Shortage'}
                          </span>
                          <span className="mx-1.5 text-slate-400">·</span>
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {m.productName} ({m.recommendedTransferQty}u)
                          </span>
                          <p className="text-slate-500 dark:text-slate-400 truncate">
                            {isDonor ? `To ${m.recipientFacilityName}` : `From ${m.donorFacilityName}`} · {m.distanceKm} km
                          </p>
                        </div>
                        <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white shrink-0">
                          {m.matchScore}/100
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                High-Risk Batches at Facility ({facRisks.filter((r) => r.wasteRiskScore >= 45).length})
              </h4>
              <div className="mt-2 space-y-1.5 text-xs">
                {facRisks.slice(0, 4).map((r) => (
                  <div key={r.batchId} className="flex items-center justify-between gap-3">
                    <span className="truncate text-slate-700 dark:text-slate-300">
                      <span className="font-mono">{r.batchId}</span> · {r.productName}
                    </span>
                    <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400 shrink-0">
                      {r.quantityOnHand}u · Risk {r.wasteRiskScore}/100
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
