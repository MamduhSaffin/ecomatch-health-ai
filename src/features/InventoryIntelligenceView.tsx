import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Download, Plus, Search, Trash2, Upload } from 'lucide-react';
import { api, triggerFileDownload, type WorkspaceSnapshot } from '../services/api';
import type { BatchCondition, UrgencyLevel } from '../types/domain';

interface InventoryIntelligenceViewProps {
  snapshot: WorkspaceSnapshot;
  onRefresh: () => Promise<void>;
}

export const InventoryIntelligenceView: React.FC<InventoryIntelligenceViewProps> = ({
  snapshot,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [facilityFilter, setFacilityFilter] = useState('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState<'ALL' | UrgencyLevel>('ALL');
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>('BCH-IVS-2601');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [csvText, setCsvText] = useState(
    'batchId,facilityId,sku,quantityOnHand,unitCostUsd,receivedDate,expiryDate,condition,storageLocation\nBCH-CSV-3001,FAC-001,SKU-GLV-100,140,11.50,2026-06-01,2027-01-15,sealed_nominal,Central PPE Zone A4'
  );
  const [statusMessage, setStatusMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Add batch form state
  const [newBatchId, setNewBatchId] = useState(`BCH-NEW-${Math.floor(1000 + Math.random() * 9000)}`);
  const [newFacilityId, setNewFacilityId] = useState(snapshot.facilities[0]?.id ?? 'FAC-001');
  const [newSku, setNewSku] = useState(snapshot.products[0]?.sku ?? 'SKU-IVS-020');
  const [newQty, setNewQty] = useState(120);
  const [newExpiry, setNewExpiry] = useState('2027-01-20');
  const [newCondition, setNewCondition] = useState<BatchCondition>('sealed_nominal');
  const [newLocation, setNewLocation] = useState('Central Sterile Shelf C2');

  const filteredRisks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return snapshot.wasteRisks.filter((r) => {
      if (facilityFilter !== 'ALL' && r.facilityId !== facilityFilter) return false;
      if (urgencyFilter !== 'ALL' && r.urgency !== urgencyFilter) return false;
      if (!q) return true;
      return (
        r.batchId.toLowerCase().includes(q) ||
        r.productName.toLowerCase().includes(q) ||
        r.sku.toLowerCase().includes(q) ||
        r.facilityName.toLowerCase().includes(q)
      );
    });
  }, [snapshot.wasteRisks, search, facilityFilter, urgencyFilter]);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setStatusMessage(null);
    try {
      const prod = snapshot.products.find((p) => p.sku === newSku);
      await api.createBatch({
        batchId: newBatchId.trim(),
        facilityId: newFacilityId,
        sku: newSku,
        quantityOnHand: Number(newQty),
        unitCostUsd: prod?.unitCostUsd ?? 20,
        receivedDate: '2026-11-27',
        expiryDate: newExpiry,
        condition: newCondition,
        storageLocation: newLocation.trim(),
      });
      await onRefresh();
      setStatusMessage({ type: 'ok', text: `Batch ${newBatchId} added and scored by Engine B.` });
      setNewBatchId(`BCH-NEW-${Math.floor(1000 + Math.random() * 9000)}`);
      setShowAddForm(false);
    } catch (err) {
      setStatusMessage({ type: 'err', text: err instanceof Error ? err.message : 'Failed to create batch.' });
    } finally {
      setBusy(false);
    }
  };

  const handleAdjustQuantity = async (batchId: string, nextQty: number) => {
    if (nextQty < 0) return;
    setBusy(true);
    setStatusMessage(null);
    try {
      await api.updateBatch(batchId, { quantityOnHand: nextQty });
      await onRefresh();
      setStatusMessage({ type: 'ok', text: `Updated ${batchId} stock on hand to ${nextQty} units.` });
    } catch (err) {
      setStatusMessage({ type: 'err', text: err instanceof Error ? err.message : 'Update failed.' });
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    setBusy(true);
    setStatusMessage(null);
    try {
      await api.deleteBatch(batchId);
      await onRefresh();
      setStatusMessage({ type: 'ok', text: `Removed batch ${batchId} from ledger.` });
    } catch (err) {
      setStatusMessage({ type: 'err', text: err instanceof Error ? err.message : 'Delete failed.' });
    } finally {
      setBusy(false);
    }
  };

  const handleExportCsv = () => {
    const header = [
      'batchId',
      'facilityId',
      'facilityName',
      'sku',
      'productName',
      'quantityOnHand',
      'expiryDate',
      'daysToExpiry',
      'condition',
      'eligibleForTransfer',
      'predictedUnusedUnits',
      'financialExposureUsd',
      'wasteRiskScore',
      'urgency',
    ];
    const lines = [
      header.join(','),
      ...filteredRisks.map((r) =>
        [
          r.batchId,
          r.facilityId,
          `"${r.facilityName}"`,
          r.sku,
          `"${r.productName}"`,
          r.quantityOnHand,
          r.expiryDate,
          r.daysToExpiry,
          r.condition,
          r.eligibleForTransfer,
          r.predictedUnusedUnits,
          r.financialExposureUsd,
          r.wasteRiskScore,
          r.urgency,
        ].join(',')
      ),
    ];
    triggerFileDownload('ecomatch-inventory-waste-risk.csv', lines.join('\n'), 'text/csv;charset=utf-8');
  };

  const handleImportCsv = async () => {
    setBusy(true);
    setStatusMessage(null);
    try {
      const rawLines = csvText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (rawLines.length < 2) {
        throw new Error('CSV must contain a header row and at least one data row.');
      }
      const rows = rawLines.slice(1).map((line) => {
        const cols = line.split(',').map((c) => c.trim());
        return {
          batchId: cols[0],
          facilityId: cols[1],
          sku: cols[2],
          quantityOnHand: Number(cols[3]),
          unitCostUsd: Number(cols[4]),
          receivedDate: cols[5],
          expiryDate: cols[6],
          condition: cols[7] as BatchCondition,
          storageLocation: cols[8] || 'Imported Bay',
        };
      });
      const res = await api.importBatchesCsv(rows);
      await onRefresh();
      setStatusMessage({
        type: 'ok',
        text: `Imported ${res.importedCount} validated batch(es).${
          res.skipped.length ? ` Skipped: ${res.skipped.join('; ')}` : ''
        }`,
      });
      setShowImportPanel(false);
    } catch (err) {
      setStatusMessage({ type: 'err', text: err instanceof Error ? err.message : 'CSV import failed.' });
    } finally {
      setBusy(false);
    }
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      if (content.trim()) {
        setCsvText(content.trim());
        setStatusMessage({
          type: 'ok',
          text: `Loaded ${file.name} (${Math.max(0, content.trim().split(/\r?\n/).length - 1)} data row(s)). Review and click Validate & Import Rows.`,
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDownloadCsvTemplate = () => {
    const template = [
      'batchId,facilityId,sku,quantityOnHand,unitCostUsd,receivedDate,expiryDate,condition,storageLocation',
      'BCH-TPL-4001,FAC-001,SKU-GLV-100,160,11.50,2026-07-01,2027-01-18,sealed_nominal,Central PPE Zone A4',
      'BCH-TPL-4002,FAC-002,SKU-IVS-020,90,22.00,2026-07-15,2027-01-25,sealed_nominal,Ward Infusion Shelf B2',
    ].join('\n');
    triggerFileDownload('ecomatch-batch-import-template.csv', template, 'text/csv;charset=utf-8');
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search batch, SKU, facility..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0D192B] pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <select
            value={facilityFilter}
            onChange={(e) => setFacilityFilter(e.target.value)}
            aria-label="Filter by facility"
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0D192B] px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Facilities</option>
            {snapshot.facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900">
            {(['ALL', 'Critical', 'High', 'Moderate', 'Low'] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setUrgencyFilter(level)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  urgencyFilter === level
                    ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {level === 'ALL' ? 'All Risk' : level}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setShowImportPanel((v) => !v);
              setShowAddForm(false);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0D192B] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0D192B] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setShowAddForm((v) => !v);
              setShowImportPanel(false);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Batch</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`rounded-lg border px-4 py-2.5 text-xs ${
            statusMessage.type === 'ok'
              ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
              : 'border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Add Batch Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateBatch}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-5 space-y-4"
        >
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Register New Consumable Batch (Zod Validated)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1">Batch ID</label>
              <input
                type="text"
                required
                value={newBatchId}
                onChange={(e) => setNewBatchId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 font-mono text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1">Facility</label>
              <select
                value={newFacilityId}
                onChange={(e) => setNewFacilityId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100"
              >
                {snapshot.facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1">Consumable SKU</label>
              <select
                value={newSku}
                onChange={(e) => setNewSku(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100"
              >
                {snapshot.products.map((p) => (
                  <option key={p.sku} value={p.sku}>
                    {p.sku} — {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1">Quantity On Hand</label>
              <input
                type="number"
                min={1}
                max={50000}
                required
                value={newQty}
                onChange={(e) => setNewQty(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 font-mono text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1">Expiry Date</label>
              <input
                type="date"
                required
                value={newExpiry}
                onChange={(e) => setNewExpiry(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 font-mono text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1">Batch Condition</label>
              <select
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value as BatchCondition)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100"
              >
                <option value="sealed_nominal">Sealed Nominal (Eligible)</option>
                <option value="recalled">Recalled (Quarantined)</option>
                <option value="damaged">Damaged (Ineligible)</option>
                <option value="restricted">Restricted (Ineligible)</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-600 dark:text-slate-400 mb-1">Storage Location</label>
              <input
                type="text"
                required
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
            >
              {busy ? 'Saving...' : 'Save Batch & Recalculate Risk'}
            </button>
          </div>
        </form>
      )}

      {/* CSV Import Panel */}
      {showImportPanel && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Validated CSV Batch Import (ERP / Spreadsheet Sync)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload a .csv file or paste comma-separated rows. Every row is Zod-validated before Engine B rescores expiry risk.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadCsvTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Template</span>
              </button>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload .csv File</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvFileUpload}
                  className="sr-only"
                />
              </label>
            </div>
          </div>
          <textarea
            rows={4}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3 font-mono text-xs text-slate-900 dark:text-slate-100"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {Math.max(0, csvText.split(/\r?\n/).filter((l) => l.trim()).length - 1)} data row(s) ready
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowImportPanel(false)}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleImportCsv}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
              >
                {busy ? 'Importing...' : 'Validate & Import Rows'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Batch Ledger Table with Expandable Explainable Waste Risk Breakdown */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-4 font-semibold">Batch · FEFO</th>
                <th className="py-2.5 px-4 font-semibold">Facility & Product</th>
                <th className="py-2.5 px-4 font-semibold text-right">On Hand</th>
                <th className="py-2.5 px-4 font-semibold text-right">Expiry</th>
                <th className="py-2.5 px-4 font-semibold text-right">Unused Est.</th>
                <th className="py-2.5 px-4 font-semibold text-right">Exposure</th>
                <th className="py-2.5 px-4 font-semibold text-right">Risk Score</th>
                <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRisks.map((r) => {
                const isExpanded = expandedBatchId === r.batchId;
                return (
                  <React.Fragment key={r.batchId}>
                    <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/35 transition-colors">
                      <td className="py-3 px-4 font-mono">
                        <button
                          type="button"
                          onClick={() => setExpandedBatchId(isExpanded ? null : r.batchId)}
                          className="inline-flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          <span>{r.batchId}</span>
                        </button>
                        <div className="text-[11px] text-slate-400 pl-5">FEFO #{r.fefoPriorityRank}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{r.productName}</div>
                        <div className="text-slate-500 dark:text-slate-400">
                          {r.facilityName} · <span className="font-mono">{r.sku}</span>
                          {!r.eligibleForTransfer && (
                            <span className="text-rose-600 dark:text-rose-400 font-medium"> · Ineligible ({r.condition})</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900 dark:text-slate-100">
                        {r.quantityOnHand.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        <div className="text-slate-800 dark:text-slate-200">{r.expiryDate}</div>
                        <div
                          className={`text-[11px] ${
                            r.daysToExpiry <= 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : r.daysToExpiry <= 50
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {r.daysToExpiry <= 0 ? `Expired (${r.daysToExpiry}d)` : `${r.daysToExpiry}d left`}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                        {r.predictedUnusedUnits.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                        ${r.financialExposureUsd.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        <span
                          className={`font-bold ${
                            r.urgency === 'Critical'
                              ? 'text-rose-600 dark:text-rose-400'
                              : r.urgency === 'High'
                              ? 'text-amber-600 dark:text-amber-400'
                              : r.urgency === 'Moderate'
                              ? 'text-sky-600 dark:text-sky-400'
                              : 'text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {r.wasteRiskScore}/100
                        </span>
                        <div className="text-[11px] text-slate-400">{r.urgency}</div>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleAdjustQuantity(r.batchId, Math.max(0, r.quantityOnHand - 10))}
                            className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-mono"
                            title="Consume 10 units"
                          >
                            -10
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleAdjustQuantity(r.batchId, r.quantityOnHand + 10)}
                            className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-mono"
                            title="Add 10 units"
                          >
                            +10
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleDeleteBatch(r.batchId)}
                            className="p-1.5 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                            aria-label={`Delete batch ${r.batchId}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Explainable Engine B Risk Breakdown Row */}
                    {isExpanded && (
                      <tr className="bg-slate-50/80 dark:bg-slate-900/40">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                            <div className="lg:col-span-8">
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                Explainable Waste Risk Decomposition ({r.wasteRiskScore}/100)
                              </p>
                              <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {r.factors.map((f) => (
                                  <div key={f.label} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="font-medium text-slate-700 dark:text-slate-300">{f.label}</span>
                                      <span className="font-mono tabular-nums text-slate-900 dark:text-white font-semibold">
                                        {f.points}/{f.maxPoints}
                                      </span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                      <div
                                        className="h-full bg-emerald-600 dark:bg-emerald-400"
                                        style={{ width: `${Math.round((f.points / f.maxPoints) * 100)}%` }}
                                      />
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{f.detail}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 pt-3 lg:pt-0 lg:pl-5 space-y-2">
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                Recommended Intervention
                              </p>
                              <p className="text-xs text-slate-600 dark:text-slate-300">
                                {r.recommendedIntervention}
                              </p>
                              {!r.eligibleForTransfer && (
                                <div className="pt-2 text-xs text-rose-700 dark:text-rose-400">
                                  <span className="font-semibold">Eligibility Gate Blocked:</span>{' '}
                                  {r.ineligibilityReasons.join('; ')}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {filteredRisks.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                    No inventory batches match your active search or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
