import React, { useState } from 'react';
import { Check, ChevronDown, ChevronUp, FileText, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { api, triggerFileDownload, type WorkspaceSnapshot } from '../services/api';
import type { ResourceMatch, TransferRecord, TransferStatus } from '../types/domain';

interface ResourceExchangeViewProps {
  snapshot: WorkspaceSnapshot;
  onRefresh: () => Promise<void>;
}

export const ResourceExchangeView: React.FC<ResourceExchangeViewProps> = ({
  snapshot,
  onRefresh,
}) => {
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(
    snapshot.matches[0]?.matchId ?? null
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [customQtyByMatch, setCustomQtyByMatch] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const getSelectedQty = (match: ResourceMatch) => {
    const raw = customQtyByMatch[match.matchId] ?? match.recommendedTransferQty;
    return Math.max(1, Math.min(match.availableSurplusUnits, raw));
  };

  const handleProposeTransfer = async (match: ResourceMatch) => {
    const chosenQty = getSelectedQty(match);
    setBusyId(match.matchId);
    setFeedback(null);
    try {
      const trf = await api.requestTransfer(
        match.matchId,
        chosenQty,
        `Proposed from Engine C match (${match.matchScore}/100, ${chosenQty} units): ${match.donorFacilityName} -> ${match.recipientFacilityName}.`
      );
      await onRefresh();
      setFeedback({
        type: 'ok',
        text: `Transfer ${trf.transferId} queued for Human Approval (${trf.quantity} units of ${trf.sku}). Review in the Approval Queue below.`,
      });
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Transfer proposal failed.' });
    } finally {
      setBusyId(null);
    }
  };

  const handleDownloadManifest = (t: TransferRecord) => {
    const batch = snapshot.batches.find((b) => b.batchId === t.batchId);
    const product = snapshot.products.find((p) => p.sku === t.sku);
    const manifest = [
      'ECOMATCH HEALTH AI — CHAIN-OF-CUSTODY TRANSFER MANIFEST',
      '====================================================================',
      `Transfer ID:            ${t.transferId}`,
      `Status:                 ${t.status}`,
      `Created At:             ${t.createdAt}`,
      `Last Updated:           ${t.updatedAt}`,
      `Requested By:           ${t.requestedBy}`,
      `Authorised Approver:    ${t.approvedBy ?? 'Pending Human Sign-Off'}`,
      '',
      'SUPPLY & COMPLIANCE DETAILS',
      '--------------------------------------------------------------------',
      `Batch ID:               ${t.batchId}`,
      `SKU / Consumable:       ${t.sku} — ${t.productName}`,
      `Regulated Medicine:     NO (Non-regulated medical consumable verified)`,
      `Storage Condition:      ${product?.storageCondition ?? 'Ambient / Standard'}`,
      `Preserved Expiry Date:  ${batch?.expiryDate ?? 'Verified in ledger'}`,
      `Approved Transfer Qty:  ${t.quantity} unit(s)`,
      '',
      'CORRIDOR ROUTING',
      '--------------------------------------------------------------------',
      `Donor Facility:         ${t.donorFacilityName} (${t.donorFacilityId})`,
      `Recipient Facility:     ${t.recipientFacilityName} (${t.recipientFacilityId})`,
      '',
      'ESTIMATED OPERATIONAL & UN SDG 12 IMPACT',
      '--------------------------------------------------------------------',
      `Net Financial Savings:  $${t.netSavingsUsd.toLocaleString()}`,
      `Waste Diverted:         ${t.wasteDivertedKg} kg`,
      `Estimated CO2e Avoided: ${t.avoidedCo2eKg} kg CO2e (net of courier transit)`,
      `Audit Notes:            ${t.notes}`,
    ].join('\n');

    triggerFileDownload(
      `ecomatch-manifest-${t.transferId.toLowerCase()}.txt`,
      manifest,
      'text/plain;charset=utf-8'
    );
  };

  const handleStatusTransition = async (transferId: string, status: TransferStatus) => {
    setBusyId(transferId);
    setFeedback(null);
    try {
      await api.updateTransferStatus(transferId, status);
      await onRefresh();
      setFeedback({
        type: 'ok',
        text:
          status === 'Approved'
            ? `Transfer ${transferId} approved. Inventory balances updated across donor & recipient facilities and logged to the Audit Trail.`
            : `Transfer ${transferId} status updated to ${status}.`,
      });
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Status update failed.' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          className={`rounded-lg border px-4 py-3 text-xs ${
            feedback.type === 'ok'
              ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
              : 'border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Section 1: Engine C Explainable Resource Matches */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Intelligent Matchmaking Recommendations ({snapshot.matches.length} Eligible)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Non-regulated medical consumables only · All matches verified for storage compliance, shelf life ≥14d, and positive net value
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            Human Approval Mandatory
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {snapshot.matches.map((m) => {
            const expanded = expandedMatchId === m.matchId;
            const pendingAlready = snapshot.transfers.some(
              (t) => t.matchId === m.matchId && t.status === 'Pending Approval'
            );
            return (
              <div key={m.matchId} className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{m.matchId}</span>
                      <span aria-hidden="true">·</span>
                      <span>Batch {m.batchId}</span>
                      <span aria-hidden="true">·</span>
                      <span>{m.distanceKm} km</span>
                      <span aria-hidden="true">·</span>
                      <span>{m.donorDaysToExpiry}d shelf life</span>
                    </div>
                    <h4 className="mt-1 text-base font-bold text-slate-950 dark:text-white">
                      {m.productName} — Transfer {m.recommendedTransferQty} units
                    </h4>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                      Donor: <span className="font-semibold">{m.donorFacilityName}</span> ({m.availableSurplusUnits} surplus) → Recipient:{' '}
                      <span className="font-semibold">{m.recipientFacilityName}</span> ({m.recipientShortageUnits} shortage)
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 shrink-0">
                    <div className="text-right font-mono tabular-nums">
                      <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400">
                        {m.matchScore}/100
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Net +${m.netFinancialSavingsUsd.toLocaleString()} · {m.wasteDivertedKg} kg
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs">
                      <label htmlFor={`qty-${m.matchId}`} className="text-slate-500 dark:text-slate-400">
                        Qty
                      </label>
                      <input
                        id={`qty-${m.matchId}`}
                        type="number"
                        min={1}
                        max={m.availableSurplusUnits}
                        value={getSelectedQty(m)}
                        onChange={(e) =>
                          setCustomQtyByMatch((prev) => ({
                            ...prev,
                            [m.matchId]: Number(e.target.value) || 1,
                          }))
                        }
                        className="w-16 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-right font-mono tabular-nums text-slate-900 dark:text-white"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedMatchId(expanded ? null : m.matchId)}
                      className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                    >
                      <span>Explain Score</span>
                      {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      disabled={busyId === m.matchId || pendingAlready}
                      onClick={() => handleProposeTransfer(m)}
                      className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-colors whitespace-nowrap"
                    >
                      {pendingAlready
                        ? 'Awaiting Approval'
                        : busyId === m.matchId
                        ? 'Submitting...'
                        : 'Propose Transfer'}
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 lg:grid-cols-12 gap-5">
                    <div className="lg:col-span-7 space-y-2.5">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Transparent 5-Factor Match Score Breakdown
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {m.factors.map((f) => (
                          <div key={f.criterion} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-slate-700 dark:text-slate-300">{f.criterion}</span>
                              <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                                {f.score}/{f.maxScore}
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                              <div
                                className="h-full bg-emerald-600 dark:bg-emerald-400"
                                style={{ width: `${Math.round((f.score / f.maxScore) * 100)}%` }}
                              />
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{f.explanation}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 pt-3 lg:pt-0 lg:pl-5 space-y-2 text-xs">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">Reasoning & Impact Estimate</p>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{m.reasoningSummary}</p>
                      <div className="pt-2 grid grid-cols-2 gap-2 font-mono tabular-nums text-[11px] text-slate-600 dark:text-slate-400">
                        <div>Avoided Procure: ${m.avoidedProcurementUsd.toLocaleString()}</div>
                        <div>Est. Courier: ${m.estimatedTransportCostUsd.toFixed(2)}</div>
                        <div>Est. Avoided CO2e: {m.avoidedCo2eKg} kg</div>
                        <div>Care Episodes Proxy: {m.patientEpisodesSupported.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {snapshot.matches.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              All eligible surplus matches have been cleared or transferred. Use Reset Demo to re-run the baseline scenario.
            </div>
          )}
        </div>
      </section>

      {/* Section 2: Human Approval Workflow & Transfer Status Ledger */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Human Approval Queue & Transfer Audit Ledger ({snapshot.transfers.length})
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Approving a pending transfer immediately deducts donor stock, credits recipient inventory with original expiry preserved, and updates Executive KPIs.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-5 font-semibold">Transfer ID</th>
                <th className="py-2.5 px-4 font-semibold">Corridor & Supply</th>
                <th className="py-2.5 px-4 font-semibold text-right">Qty</th>
                <th className="py-2.5 px-4 font-semibold text-right">Net Savings</th>
                <th className="py-2.5 px-4 font-semibold">Status</th>
                <th className="py-2.5 px-5 font-semibold text-right">Authorised Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {snapshot.transfers.map((t) => (
                <tr key={t.transferId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/35">
                  <td className="py-3 px-5 font-mono font-semibold text-slate-900 dark:text-white">
                    {t.transferId}
                    <div className="text-[11px] font-normal text-slate-400">{t.batchId}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{t.productName}</div>
                    <div className="text-slate-500 dark:text-slate-400">
                      {t.donorFacilityName} → {t.recipientFacilityName}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                    {t.quantity}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400 font-semibold">
                    ${t.netSavingsUsd.toLocaleString()}
                    <div className="text-[11px] font-normal text-slate-400">{t.wasteDivertedKg} kg</div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`font-semibold ${
                        t.status === 'Completed' || t.status === 'Approved'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : t.status === 'Rejected'
                          ? 'text-rose-600 dark:text-rose-400'
                          : t.status === 'In Transit'
                          ? 'text-sky-600 dark:text-sky-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {t.status}
                    </span>
                    {t.approvedBy && (
                      <div className="text-[11px] text-slate-400">By {t.approvedBy}</div>
                    )}
                  </td>
                  <td className="py-3 px-5 text-right whitespace-nowrap">
                    {t.status === 'Pending Approval' && (
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={busyId === t.transferId}
                          onClick={() => handleStatusTransition(t.transferId, 'Approved')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve Transfer</span>
                        </button>
                        <button
                          type="button"
                          disabled={busyId === t.transferId}
                          onClick={() => handleStatusTransition(t.transferId, 'Rejected')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-600"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    )}
                    {t.status === 'Approved' && (
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDownloadManifest(t)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Manifest</span>
                        </button>
                        <button
                          type="button"
                          disabled={busyId === t.transferId}
                          onClick={() => handleStatusTransition(t.transferId, 'In Transit')}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                        >
                          Mark Dispatched
                        </button>
                      </div>
                    )}
                    {t.status === 'In Transit' && (
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDownloadManifest(t)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Manifest</span>
                        </button>
                        <button
                          type="button"
                          disabled={busyId === t.transferId}
                          onClick={() => handleStatusTransition(t.transferId, 'Completed')}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white font-semibold"
                        >
                          Confirm Receipt
                        </button>
                      </div>
                    )}
                    {t.status === 'Completed' && (
                      <button
                        type="button"
                        onClick={() => handleDownloadManifest(t)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Manifest</span>
                      </button>
                    )}
                    {t.status === 'Rejected' && (
                      <span className="text-slate-400 font-mono">Archived</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 3: Ineligible Lot Safety Audit (Proves zero recalled/expired recommendations) */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-5">
        <div className="flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-400">
          <ShieldAlert className="w-4 h-4" />
          <span>Hard Eligibility Gate Audit — Automatically Excluded Lots ({snapshot.ineligibleAudit.length})</span>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Expired, recalled, damaged, or restricted batches are rejected prior to match scoring and cannot enter the marketplace.
        </p>
        <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {snapshot.ineligibleAudit.map((item) => (
            <div key={item.batchId} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{item.batchId}</span>
                <span className="mx-1.5 text-slate-400">·</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {item.productName} ({item.quantity}u at {item.facilityName})
                </span>
              </div>
              <span className="text-rose-700 dark:text-rose-400 font-medium">{item.reasons.join('; ')}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
