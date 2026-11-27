import React, { useEffect, useState } from 'react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download } from 'lucide-react';
import { api, triggerFileDownload, type WorkspaceSnapshot } from '../services/api';
import type { SeriesForecastResult } from '../types/domain';

interface PredictiveAnalyticsViewProps {
  snapshot: WorkspaceSnapshot;
}

export const PredictiveAnalyticsView: React.FC<PredictiveAnalyticsViewProps> = ({ snapshot }) => {
  const [facilityId, setFacilityId] = useState('FAC-001');
  const [sku, setSku] = useState('SKU-IVS-020');
  const [forecast, setForecast] = useState<SeriesForecastResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .getForecast(facilityId, sku)
      .then((res) => {
        if (active) setForecast(res);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Forecast failed.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [facilityId, sku, snapshot.batches]);

  const chartData =
    forecast?.series.map((pt) => ({
      weekLabel: pt.weekLabel,
      actual: pt.actual ?? null,
      predicted: pt.predicted,
      intervalBand:
        pt.isForecast && pt.lower95 !== undefined && pt.upper95 !== undefined
          ? [pt.lower95, pt.upper95]
          : null,
      lower95: pt.lower95,
      upper95: pt.upper95,
    })) ?? [];

  const handleDownloadResults = () => {
    if (!forecast) return;
    const payload = {
      generatedAt: new Date().toISOString(),
      dataProvenance: 'Synthetic Demonstration Dataset (seed 20261012)',
      splitProtocol: {
        trainWeeks: forecast.trainWeeks,
        validationWeeks: forecast.valWeeks,
        holdoutTestWeeks: forecast.testWeeks,
        leakagePrevention: 'Strict chronological split; model selected solely on Validation WAPE',
      },
      seriesSelection: {
        facilityId: forecast.facilityId,
        sku: forecast.sku,
        selectedModel: forecast.selectedModelName,
      },
      modelComparison: forecast.modelComparison,
      featureImportance: forecast.featureImportance,
      operationalForecast: {
        avgWeeklyDemand: forecast.avgWeeklyDemand,
        forecast12WeeksTotal: forecast.forecast12WeeksTotal,
        currentUsableStock: forecast.currentUsableStock,
        predictedDepletionWeeks: forecast.predictedDepletionWeeks,
        stockoutProbabilityPct: forecast.stockoutProbabilityPct,
        safetyStockQty: forecast.safetyStockQty,
        recommendedReorderQty: forecast.recommendedReorderQty,
        expectedSurplusUnits: forecast.expectedSurplusUnits,
      },
      forecastSeries: forecast.series,
    };
    triggerFileDownload(
      `ecomatch-forecast-${facilityId}-${sku}.json`,
      JSON.stringify(payload, null, 2),
      'application/json;charset=utf-8'
    );
  };

  return (
    <div className="space-y-6">
      {/* Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={facilityId}
            onChange={(e) => setFacilityId(e.target.value)}
            aria-label="Select facility for forecasting"
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0D192B] px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {snapshot.facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.id} — {f.name}
              </option>
            ))}
          </select>

          <select
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            aria-label="Select consumable SKU for forecasting"
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0D192B] px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {snapshot.products.map((p) => (
              <option key={p.sku} value={p.sku}>
                {p.sku} — {p.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          disabled={!forecast}
          onClick={handleDownloadResults}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0D192B] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Analytical JSON</span>
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-4 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {loading || !forecast ? (
        <div className="h-80 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] animate-pulse" />
      ) : (
        <>
          {/* Operational Forecast KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">Selected Model</p>
              <p className="mt-1.5 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                {forecast.selectedModelName}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400 font-mono">
                Train {forecast.trainWeeks}w · Val {forecast.valWeeks}w · Test {forecast.testWeeks}w
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">Forecast Avg Demand</p>
              <p className="mt-1.5 text-xl font-bold font-mono tabular-nums text-slate-950 dark:text-white">
                {forecast.avgWeeklyDemand} / wk
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400 font-mono tabular-nums">
                12w total: {forecast.forecast12WeeksTotal} units
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">Usable Stock & Depletion</p>
              <p className="mt-1.5 text-xl font-bold font-mono tabular-nums text-slate-950 dark:text-white">
                {forecast.predictedDepletionWeeks} wks
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400 font-mono tabular-nums">
                {forecast.currentUsableStock} usable units on hand
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">Stockout Probability (4w)</p>
              <p
                className={`mt-1.5 text-xl font-bold font-mono tabular-nums ${
                  forecast.stockoutProbabilityPct >= 50
                    ? 'text-rose-600 dark:text-rose-400'
                    : forecast.stockoutProbabilityPct >= 20
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-700 dark:text-emerald-400'
                }`}
              >
                {forecast.stockoutProbabilityPct}%
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400 font-mono tabular-nums">
                Safety stock: {forecast.safetyStockQty}u
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">Recommended Action</p>
              <p className="mt-1.5 text-xl font-bold font-mono tabular-nums text-slate-950 dark:text-white">
                {forecast.recommendedReorderQty > 0
                  ? `+${forecast.recommendedReorderQty} reorder`
                  : forecast.expectedSurplusUnits > 0
                  ? `${forecast.expectedSurplusUnits} surplus`
                  : 'Balanced'}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400 font-mono tabular-nums">
                σ residual: ±{forecast.residualStdDev}u/wk
              </p>
            </div>
          </div>

          {/* Main Time-Series Forecast Chart with 95% Uncertainty Interval */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Historical Consumption, Holdout Fit & 12-Week Demand Forecast (95% Prediction Interval)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Last 24 observed weeks + 12 forward weeks · Synthetic Demonstration Dataset (seed 20261012)
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-slate-900 dark:bg-slate-200 inline-block" /> Observed
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-emerald-500 inline-block" /> Predicted / Forecast
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-2.5 bg-emerald-500/20 border border-emerald-500/40 inline-block rounded-xs" /> 95% Interval
                </span>
              </div>
            </div>

            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.18} />
                  <XAxis dataKey="weekLabel" tick={{ fontSize: 11, fill: '#94A3B8' }} />
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
                  <Area
                    type="monotone"
                    dataKey="intervalBand"
                    stroke="none"
                    fill="#10B981"
                    fillOpacity={0.18}
                    name="95% Prediction Band"
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#64748B"
                    strokeWidth={2}
                    dot={{ r: 2.5 }}
                    connectNulls={false}
                    name="Observed Units"
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    dot={false}
                    name="Model Forecast"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Model Comparison Table + Feature Importance Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Chronological Model Evaluation ({facilityId} · {sku})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Winner selected strictly by lowest Validation WAPE; Holdout Test metrics measure unseen generalisation
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                      <th className="py-2.5 px-5 font-semibold">Model</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Val WAPE</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Test MAE</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Test RMSE</th>
                      <th className="py-2.5 px-5 font-semibold text-right">Test WAPE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono tabular-nums">
                    {forecast.modelComparison.map((m) => (
                      <tr
                        key={m.modelId}
                        className={m.selected ? 'bg-emerald-50/60 dark:bg-emerald-950/25' : ''}
                      >
                        <td className="py-3 px-5 font-sans">
                          <span className="font-semibold text-slate-900 dark:text-white">{m.modelName}</span>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {m.role} {m.selected ? '· Selected' : ''}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right text-slate-700 dark:text-slate-300">
                          {m.valWape}%
                        </td>
                        <td className="py-3 px-3 text-right text-slate-700 dark:text-slate-300">
                          {m.testMae}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-700 dark:text-slate-300">
                          {m.testRMSE}
                        </td>
                        <td
                          className={`py-3 px-5 text-right font-bold ${
                            m.selected ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {m.testWape}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Feature Importance */}
            <section className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                GBDT Feature Importance (%)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Variance reduction attribution across lag and Fourier seasonal predictors
              </p>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={forecast.featureImportance}
                    layout="vertical"
                    margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94A3B8' }} unit="%" />
                    <YAxis
                      type="category"
                      dataKey="feature"
                      width={135}
                      tick={{ fontSize: 10.5, fill: '#94A3B8' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#F8FAFC',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="importancePct" fill="#0D9488" radius={[0, 4, 4, 0]} name="Importance %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          {/* Network-Wide 80-Series Model Benchmark */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D192B] p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Network-Wide Holdout Benchmark ({snapshot.modelBenchmark.totalSeriesEvaluated} Facility-SKU Series)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Aggregate out-of-sample test performance computed directly from the 104-week chronological pipeline
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono tabular-nums">
              {snapshot.modelBenchmark.models.map((m) => (
                <div
                  key={m.modelId}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/70 dark:bg-slate-900/40"
                >
                  <p className="text-xs font-sans font-semibold text-slate-900 dark:text-white">
                    {m.modelName}
                  </p>
                  <p className="text-[11px] font-sans text-slate-500 dark:text-slate-400">
                    {m.role} · Selected in {m.winCount}/{snapshot.modelBenchmark.totalSeriesEvaluated} series
                  </p>
                  <div className="mt-3 flex items-baseline justify-between text-xs">
                    <span className="text-slate-500">Avg Test WAPE</span>
                    <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                      {m.avgTestWape}%
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between text-[11px] text-slate-500">
                    <span>Avg MAE / RMSE</span>
                    <span>
                      {m.avgTestMae} / {m.avgTestRMSE}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};
