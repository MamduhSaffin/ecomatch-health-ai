import type {
  FeatureImportanceItem,
  ForecastPoint,
  InventoryBatch,
  ModelEvaluationMetric,
  SeriesForecastResult,
  WeeklyConsumptionPoint,
} from '../types/domain';
import {
  FACILITIES,
  SIMULATION_REFERENCE_DATE,
  addDaysToIso,
  diffDaysBetweenIso,
  getHistoricalConsumption,
} from './dataset';

// Strict chronological splits: 104 weeks total -> 72 Train, 16 Validation, 16 Holdout Test
const TRAIN_END = 72;
const VAL_END = 88;
const TOTAL_WEEKS = 104;
const HORIZON_WEEKS = 12;

function computeErrors(actuals: number[], preds: number[]): { mae: number; rmse: number; wape: number } {
  let absSum = 0;
  let sqSum = 0;
  let actualSum = 0;
  const n = actuals.length;
  for (let i = 0; i < n; i++) {
    const err = actuals[i] - preds[i];
    absSum += Math.abs(err);
    sqSum += err * err;
    actualSum += Math.abs(actuals[i]);
  }
  const mae = absSum / Math.max(1, n);
  const rmse = Math.sqrt(sqSum / Math.max(1, n));
  const wape = (absSum / Math.max(1e-6, actualSum)) * 100;
  return {
    mae: Math.round(mae * 100) / 100,
    rmse: Math.round(rmse * 100) / 100,
    wape: Math.round(wape * 100) / 100,
  };
}

// Standard Normal CDF approximation (Abramowitz & Stegun)
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p =
    d *
    t *
    (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

// Model 1: 4-Week Simple Moving Average (Baseline)
function predictMovingAverage(series: number[], evalStartIdx: number, evalEndIdx: number): number[] {
  const preds: number[] = [];
  for (let i = evalStartIdx; i < evalEndIdx; i++) {
    const start = Math.max(0, i - 4);
    let sum = 0;
    for (let j = start; j < i; j++) sum += series[j];
    preds.push(sum / Math.max(1, i - start));
  }
  return preds;
}

function forecastMovingAverage(series: number[], horizon: number): number[] {
  const window = series.slice(-4);
  const avg = window.reduce((a, b) => a + b, 0) / window.length;
  return Array.from({ length: horizon }, () => avg);
}

// Model 2: Additive Seasonal Holt-Winters Exponential Smoothing (52-week seasonal cycle)
function fitAndPredictHoltWinters(
  series: number[],
  trainEnd: number,
  evalStart: number,
  evalEnd: number,
  horizon = 0
): { evalPreds: number[]; futurePreds: number[] } {
  const period = 52;
  const alpha = 0.28;
  const beta = 0.04;
  const gamma = 0.22;

  const firstYearMean = series.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let level = firstYearMean;
  let trend =
    (series.slice(period, trainEnd).reduce((a, b) => a + b, 0) / Math.max(1, trainEnd - period) -
      firstYearMean) /
    period;

  const seasonal = Array.from({ length: period }, (_, i) => series[i] - firstYearMean);

  const allPreds: number[] = new Array(series.length).fill(firstYearMean);

  for (let t = 1; t < evalEnd; t++) {
    const seasonIdx = t % period;
    const forecast = Math.max(1, level + trend + seasonal[seasonIdx]);
    allPreds[t] = forecast;

    const obs = series[t];
    const prevLevel = level;
    level = alpha * (obs - seasonal[seasonIdx]) + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    seasonal[seasonIdx] = gamma * (obs - level) + (1 - gamma) * seasonal[seasonIdx];
  }

  const futurePreds: number[] = [];
  for (let h = 1; h <= horizon; h++) {
    const seasonIdx = (series.length + h - 1) % period;
    futurePreds.push(Math.max(1, level + h * trend + seasonal[seasonIdx]));
  }

  return {
    evalPreds: allPreds.slice(evalStart, evalEnd),
    futurePreds,
  };
}

// Feature builder strictly using past observations (t-1, t-4, t-52, rolling4, trend, Fourier harmonics)
function buildFeatures(history: number[], t: number): number[] {
  const lag1 = history[Math.max(0, t - 1)];
  const lag4 = history[Math.max(0, t - 4)];
  const lag52 = t >= 52 ? history[t - 52] : lag4;
  let rollSum = 0;
  const start = Math.max(0, t - 4);
  for (let j = start; j < t; j++) rollSum += history[j];
  const roll4 = rollSum / Math.max(1, t - start);
  const angle = (2 * Math.PI * t) / 52;
  return [
    1, // intercept
    t / 104, // normalized time trend
    lag1,
    lag4,
    lag52,
    roll4,
    Math.cos(angle),
    Math.sin(angle),
    Math.cos(2 * angle),
    Math.sin(2 * angle),
  ];
}

// Solve linear system A * x = b via Gaussian elimination with partial pivoting
function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivotRow][col])) pivotRow = r;
    }
    [M[col], M[pivotRow]] = [M[pivotRow], M[col]];
    const pivot = M[col][col];
    if (Math.abs(pivot) < 1e-10) continue;
    for (let j = col; j <= n; j++) M[col][j] /= pivot;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col];
      for (let j = col; j <= n; j++) M[r][j] -= factor * M[col][j];
    }
  }
  return M.map((row) => row[n]);
}

// Model 3: Ridge Regression with Lag & Fourier Seasonal Features (closed-form L2 regularized normal equations)
function fitRidgeRegression(series: number[], trainEnd: number, lambda = 2.5): number[] {
  const p = 10;
  const XtX: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
  const Xty: number[] = new Array(p).fill(0);

  // Start at week 52 to prevent missing lag-52 distortion; also include weeks 8..51 with lag fallback
  for (let t = 8; t < trainEnd; t++) {
    const x = buildFeatures(series, t);
    const y = series[t];
    for (let i = 0; i < p; i++) {
      Xty[i] += x[i] * y;
      for (let j = 0; j < p; j++) {
        XtX[i][j] += x[i] * x[j];
      }
    }
  }
  // L2 regularization (do not penalize intercept)
  for (let i = 1; i < p; i++) XtX[i][i] += lambda;
  return solveLinearSystem(XtX, Xty);
}

function predictRidge(series: number[], weights: number[], startIdx: number, endIdx: number): number[] {
  const preds: number[] = [];
  for (let t = startIdx; t < endIdx; t++) {
    const x = buildFeatures(series, t);
    let yHat = 0;
    for (let i = 0; i < weights.length; i++) yHat += weights[i] * x[i];
    preds.push(Math.max(1, yHat));
  }
  return preds;
}

function forecastRidge(series: number[], weights: number[], horizon: number): number[] {
  const extended = [...series];
  const preds: number[] = [];
  for (let h = 0; h < horizon; h++) {
    const t = extended.length;
    const x = buildFeatures(extended, t);
    let yHat = 0;
    for (let i = 0; i < weights.length; i++) yHat += weights[i] * x[i];
    const clamped = Math.max(1, yHat);
    preds.push(clamped);
    extended.push(clamped);
  }
  return preds;
}

// Model 4: Gradient Boosted Decision Stumps (real additive boosting on lag + seasonal features)
interface Stump {
  featureIdx: number;
  threshold: number;
  leftVal: number;
  rightVal: number;
}

function fitGradientBoostedStumps(
  series: number[],
  trainEnd: number,
  nEstimators = 28,
  learningRate = 0.14
): { basePred: number; stumps: Stump[]; featureGains: number[] } {
  const X: number[][] = [];
  const y: number[] = [];
  for (let t = 8; t < trainEnd; t++) {
    X.push(buildFeatures(series, t));
    y.push(series[t]);
  }

  const n = y.length;
  const basePred = y.reduce((a, b) => a + b, 0) / Math.max(1, n);
  const currentPred = new Array(n).fill(basePred);
  const stumps: Stump[] = [];
  const featureGains = new Array(10).fill(0);

  for (let m = 0; m < nEstimators; m++) {
    const residuals = y.map((yi, i) => yi - currentPred[i]);
    const totalVar = residuals.reduce((acc, r) => acc + r * r, 0);

    let bestStump: Stump = { featureIdx: 1, threshold: 0, leftVal: 0, rightVal: 0 };
    let bestLoss = Infinity;

    for (let f = 1; f < 10; f++) {
      const vals = X.map((row) => row[f]);
      const sorted = [...vals].sort((a, b) => a - b);
      // Evaluate 6 quantile thresholds for speed and generalization
      for (let q = 1; q <= 6; q++) {
        const thresh = sorted[Math.floor((q / 7) * (sorted.length - 1))];
        let lSum = 0;
        let lCnt = 0;
        let rSum = 0;
        let rCnt = 0;
        for (let i = 0; i < n; i++) {
          if (vals[i] <= thresh) {
            lSum += residuals[i];
            lCnt++;
          } else {
            rSum += residuals[i];
            rCnt++;
          }
        }
        if (lCnt < 3 || rCnt < 3) continue;
        const lMean = lSum / lCnt;
        const rMean = rSum / rCnt;
        let loss = 0;
        for (let i = 0; i < n; i++) {
          const pred = vals[i] <= thresh ? lMean : rMean;
          const diff = residuals[i] - pred;
          loss += diff * diff;
        }
        if (loss < bestLoss) {
          bestLoss = loss;
          bestStump = { featureIdx: f, threshold: thresh, leftVal: lMean, rightVal: rMean };
        }
      }
    }

    stumps.push(bestStump);
    featureGains[bestStump.featureIdx] += Math.max(0, totalVar - bestLoss);

    for (let i = 0; i < n; i++) {
      const delta =
        X[i][bestStump.featureIdx] <= bestStump.threshold ? bestStump.leftVal : bestStump.rightVal;
      currentPred[i] += learningRate * delta;
    }
  }

  return { basePred, stumps, featureGains };
}

function evalGbdtPoint(
  x: number[],
  model: { basePred: number; stumps: Stump[] },
  learningRate = 0.14
): number {
  let pred = model.basePred;
  for (const s of model.stumps) {
    pred += learningRate * (x[s.featureIdx] <= s.threshold ? s.leftVal : s.rightVal);
  }
  return Math.max(1, pred);
}

function predictGbdt(
  series: number[],
  model: { basePred: number; stumps: Stump[] },
  startIdx: number,
  endIdx: number
): number[] {
  const preds: number[] = [];
  for (let t = startIdx; t < endIdx; t++) {
    preds.push(evalGbdtPoint(buildFeatures(series, t), model));
  }
  return preds;
}

function forecastGbdt(
  series: number[],
  model: { basePred: number; stumps: Stump[] },
  horizon: number
): number[] {
  const extended = [...series];
  const preds: number[] = [];
  for (let h = 0; h < horizon; h++) {
    const t = extended.length;
    const p = evalGbdtPoint(buildFeatures(extended, t), model);
    preds.push(p);
    extended.push(p);
  }
  return preds;
}

const FEATURE_META: { name: string; desc: string }[] = [
  { name: 'Intercept', desc: 'Baseline scale term' },
  { name: 'Time Trend', desc: 'Long-term linear patient volume growth' },
  { name: 'Lag-1 Week Consumption', desc: 'Immediate prior week clinical utilisation' },
  { name: 'Lag-4 Week Consumption', desc: 'Monthly operational cycle momentum' },
  { name: 'Lag-52 Week (YoY)', desc: 'Same week previous year seasonal anchor' },
  { name: '4-Week Rolling Mean', desc: 'Smoothed recent facility run-rate' },
  { name: 'Annual Seasonality (Cos)', desc: 'Primary winter/summer clinical harmonic' },
  { name: 'Annual Seasonality (Sin)', desc: 'Phase-shifted annual clinical harmonic' },
  { name: 'Semi-Annual Cycle (Cos)', desc: 'Elective procedure biannual harmonic' },
  { name: 'Semi-Annual Cycle (Sin)', desc: 'Secondary biannual demand harmonic' },
];

// Memoized forecast cache per (facilityId, sku) for historical model training
const modelCache = new Map<
  string,
  {
    modelComparison: ModelEvaluationMetric[];
    selectedModelId: ModelEvaluationMetric['modelId'];
    selectedModelName: string;
    featureImportance: FeatureImportanceItem[];
    future12: number[];
    testPreds: number[];
    residualStdDev: number;
    avgWeeklyDemand: number;
    historyPoints: WeeklyConsumptionPoint[];
  }
>();

function getOrTrainSeries(facilityId: string, sku: string) {
  const key = `${facilityId}::${sku}`;
  const cached = modelCache.get(key);
  if (cached) return cached;

  const allHistory = getHistoricalConsumption();
  const points = allHistory
    .filter((p) => p.facilityId === facilityId && p.sku === sku)
    .sort((a, b) => a.weekIndex - b.weekIndex);

  const values = points.map((p) => p.unitsConsumed);
  const valActuals = values.slice(TRAIN_END, VAL_END);
  const testActuals = values.slice(VAL_END, TOTAL_WEEKS);

  // 1. Moving Average Baseline
  const maVal = predictMovingAverage(values, TRAIN_END, VAL_END);
  const maTest = predictMovingAverage(values, VAL_END, TOTAL_WEEKS);
  const maValErr = computeErrors(valActuals, maVal);
  const maTestErr = computeErrors(testActuals, maTest);

  // 2. Holt-Winters Seasonal Smoothing
  const hwVal = fitAndPredictHoltWinters(values, TRAIN_END, TRAIN_END, VAL_END, 0).evalPreds;
  const hwFull = fitAndPredictHoltWinters(values, VAL_END, VAL_END, TOTAL_WEEKS, HORIZON_WEEKS);
  const hwValErr = computeErrors(valActuals, hwVal);
  const hwTestErr = computeErrors(testActuals, hwFull.evalPreds);

  // 3. Ridge Regression (Lag + Fourier)
  const ridgeTrainWeights = fitRidgeRegression(values, TRAIN_END);
  const ridgeVal = predictRidge(values, ridgeTrainWeights, TRAIN_END, VAL_END);
  const ridgeValErr = computeErrors(valActuals, ridgeVal);
  const ridgeFullWeights = fitRidgeRegression(values, VAL_END);
  const ridgeTest = predictRidge(values, ridgeFullWeights, VAL_END, TOTAL_WEEKS);
  const ridgeTestErr = computeErrors(testActuals, ridgeTest);
  const ridgeFinalWeights = fitRidgeRegression(values, TOTAL_WEEKS);
  const ridgeFuture = forecastRidge(values, ridgeFinalWeights, HORIZON_WEEKS);

  // 4. Gradient Boosted Decision Stumps
  const gbdtTrain = fitGradientBoostedStumps(values, TRAIN_END);
  const gbdtVal = predictGbdt(values, gbdtTrain, TRAIN_END, VAL_END);
  const gbdtValErr = computeErrors(valActuals, gbdtVal);
  const gbdtFull = fitGradientBoostedStumps(values, VAL_END);
  const gbdtTest = predictGbdt(values, gbdtFull, VAL_END, TOTAL_WEEKS);
  const gbdtTestErr = computeErrors(testActuals, gbdtTest);
  const gbdtFinal = fitGradientBoostedStumps(values, TOTAL_WEEKS);
  const gbdtFuture = forecastGbdt(values, gbdtFinal, HORIZON_WEEKS);

  const candidates: ModelEvaluationMetric[] = [
    {
      modelId: 'moving_avg_4w',
      modelName: '4-Week Moving Average',
      role: 'Baseline',
      valMae: maValErr.mae,
      valRMSE: maValErr.rmse,
      valWape: maValErr.wape,
      testMae: maTestErr.mae,
      testRMSE: maTestErr.rmse,
      testWape: maTestErr.wape,
      selected: false,
    },
    {
      modelId: 'holt_winters',
      modelName: 'Holt-Winters Seasonal Smoothing',
      role: 'Candidate ML',
      valMae: hwValErr.mae,
      valRMSE: hwValErr.rmse,
      valWape: hwValErr.wape,
      testMae: hwTestErr.mae,
      testRMSE: hwTestErr.rmse,
      testWape: hwTestErr.wape,
      selected: false,
    },
    {
      modelId: 'ridge_lag_fourier',
      modelName: 'Ridge Regression (Lag + Fourier)',
      role: 'Candidate ML',
      valMae: ridgeValErr.mae,
      valRMSE: ridgeValErr.rmse,
      valWape: ridgeValErr.wape,
      testMae: ridgeTestErr.mae,
      testRMSE: ridgeTestErr.rmse,
      testWape: ridgeTestErr.wape,
      selected: false,
    },
    {
      modelId: 'gbdt_stumps',
      modelName: 'Gradient Boosted Decision Ensemble',
      role: 'Candidate ML',
      valMae: gbdtValErr.mae,
      valRMSE: gbdtValErr.rmse,
      valWape: gbdtValErr.wape,
      testMae: gbdtTestErr.mae,
      testRMSE: gbdtTestErr.rmse,
      testWape: gbdtTestErr.wape,
      selected: false,
    },
  ];

  // Select strictly based on lowest Validation WAPE (zero test-set leakage!)
  let bestIdx = 0;
  for (let i = 1; i < candidates.length; i++) {
    if (candidates[i].valWape < candidates[bestIdx].valWape) bestIdx = i;
  }
  candidates[bestIdx].selected = true;
  const winner = candidates[bestIdx];

  const futureByModel: Record<ModelEvaluationMetric['modelId'], number[]> = {
    moving_avg_4w: forecastMovingAverage(values, HORIZON_WEEKS),
    holt_winters: hwFull.futurePreds,
    ridge_lag_fourier: ridgeFuture,
    gbdt_stumps: gbdtFuture,
  };

  const testPredsByModel: Record<ModelEvaluationMetric['modelId'], number[]> = {
    moving_avg_4w: maTest,
    holt_winters: hwFull.evalPreds,
    ridge_lag_fourier: ridgeTest,
    gbdt_stumps: gbdtTest,
  };

  const selectedTestPreds = testPredsByModel[winner.modelId];
  const residuals = testActuals.map((a, i) => a - selectedTestPreds[i]);
  const resVar = residuals.reduce((acc, r) => acc + r * r, 0) / Math.max(1, residuals.length - 1);
  const residualStdDev = Math.max(1.2, Math.sqrt(resVar));

  // Normalize GBDT variance-reduction feature importance
  const gainSum = gbdtFinal.featureGains.reduce((a, b) => a + b, 0) || 1;
  const featureImportance: FeatureImportanceItem[] = gbdtFinal.featureGains
    .map((gain, idx) => ({
      feature: FEATURE_META[idx].name,
      importancePct: Math.round((gain / gainSum) * 1000) / 10,
      description: FEATURE_META[idx].desc,
    }))
    .filter((_, idx) => idx > 0)
    .sort((a, b) => b.importancePct - a.importancePct)
    .slice(0, 6);

  const avgWeeklyDemand =
    Math.round((futureByModel[winner.modelId].reduce((a, b) => a + b, 0) / HORIZON_WEEKS) * 10) / 10;

  const result = {
    modelComparison: candidates,
    selectedModelId: winner.modelId,
    selectedModelName: winner.modelName,
    featureImportance,
    future12: futureByModel[winner.modelId],
    testPreds: selectedTestPreds,
    residualStdDev: Math.round(residualStdDev * 100) / 100,
    avgWeeklyDemand,
    historyPoints: points,
  };

  modelCache.set(key, result);
  return result;
}

export function forecastFacilitySku(
  facilityId: string,
  sku: string,
  batches: InventoryBatch[],
  demandMultiplier = 1.0,
  safetyStockMultiplier = 1.0
): SeriesForecastResult {
  const trained = getOrTrainSeries(facilityId, sku);
  const facility = FACILITIES.find((f) => f.id === facilityId);
  const leadTimeWeeks = facility?.leadTimeWeeks ?? 2;

  // Sum only usable, non-expired, non-recalled stock for supply adequacy
  const usableBatches = batches.filter(
    (b) =>
      b.facilityId === facilityId &&
      b.sku === sku &&
      b.condition === 'sealed_nominal' &&
      diffDaysBetweenIso(SIMULATION_REFERENCE_DATE, b.expiryDate) > 0
  );
  const currentUsableStock = usableBatches.reduce((sum, b) => sum + b.quantityOnHand, 0);

  const scaledFuture = trained.future12.map((v) => Math.max(1, Math.round(v * demandMultiplier * 10) / 10));
  const forecast12WeeksTotal = Math.round(scaledFuture.reduce((a, b) => a + b, 0));
  const avgWeeklyDemand = Math.round((forecast12WeeksTotal / HORIZON_WEEKS) * 10) / 10;

  // Depletion horizon in weeks
  let remaining = currentUsableStock;
  let depletionWeeks = 0;
  for (let w = 0; w < scaledFuture.length; w++) {
    if (remaining >= scaledFuture[w]) {
      remaining -= scaledFuture[w];
      depletionWeeks += 1;
    } else {
      depletionWeeks += remaining / Math.max(1, scaledFuture[w]);
      remaining = 0;
      break;
    }
  }
  if (remaining > 0) {
    depletionWeeks += remaining / Math.max(1, avgWeeklyDemand);
  }
  depletionWeeks = Math.round(depletionWeeks * 10) / 10;

  // Stockout probability over 4-week planning & replenishment horizon
  const horizonWeeks = Math.max(4, leadTimeWeeks + 2);
  const demandOverHorizon = scaledFuture
    .slice(0, horizonWeeks)
    .reduce((a, b) => a + b, 0);
  const stdOverHorizon = trained.residualStdDev * Math.sqrt(horizonWeeks) * Math.max(1, demandMultiplier);
  const zScore = (demandOverHorizon - currentUsableStock) / Math.max(1, stdOverHorizon);
  const stockoutProbabilityPct = Math.round(normalCdf(zScore) * 1000) / 10;

  // Safety stock = z(95% = 1.645) * sigma * sqrt(L) * multiplier
  const safetyStockQty = Math.ceil(1.645 * trained.residualStdDev * Math.sqrt(leadTimeWeeks) * safetyStockMultiplier);
  // 6-week target base-stock level
  const targetStock6Weeks = Math.ceil(
    scaledFuture.slice(0, 6).reduce((a, b) => a + b, 0) + safetyStockQty
  );
  const recommendedReorderQty = Math.max(0, targetStock6Weeks - currentUsableStock);

  // Estimate expected surplus above 8-week demand + safety stock
  const eightWeekNeed = Math.ceil(
    scaledFuture.slice(0, 8).reduce((a, b) => a + b, 0) + safetyStockQty
  );
  const expectedSurplusUnits = Math.max(0, currentUsableStock - eightWeekNeed);

  // Build chart series: last 24 historical weeks + 12 forecast weeks
  const series: ForecastPoint[] = [];
  const histSlice = trained.historyPoints.slice(TOTAL_WEEKS - 24);
  const testStartWeekIndex = VAL_END + 1;

  for (const pt of histSlice) {
    const testIdx = pt.weekIndex - testStartWeekIndex;
    const isTestPeriod = testIdx >= 0 && testIdx < trained.testPreds.length;
    series.push({
      weekIndex: pt.weekIndex,
      weekLabel: pt.weekStart.slice(5),
      actual: pt.unitsConsumed,
      predicted: isTestPeriod ? Math.round(trained.testPreds[testIdx] * 10) / 10 : pt.unitsConsumed,
      isForecast: false,
    });
  }

  for (let h = 0; h < HORIZON_WEEKS; h++) {
    const wkDate = addDaysToIso(SIMULATION_REFERENCE_DATE, (h + 1) * 7);
    const pred = scaledFuture[h];
    // Prediction interval widens with horizon sqrt(h+1)
    const halfWidth = 1.96 * trained.residualStdDev * Math.sqrt(1 + h * 0.14);
    series.push({
      weekIndex: TOTAL_WEEKS + h + 1,
      weekLabel: wkDate.slice(5),
      predicted: pred,
      lower95: Math.max(0, Math.round((pred - halfWidth) * 10) / 10),
      upper95: Math.round((pred + halfWidth) * 10) / 10,
      isForecast: true,
    });
  }

  return {
    facilityId,
    sku,
    selectedModelId: trained.selectedModelId,
    selectedModelName: trained.selectedModelName,
    modelComparison: trained.modelComparison,
    featureImportance: trained.featureImportance,
    trainWeeks: TRAIN_END,
    valWeeks: VAL_END - TRAIN_END,
    testWeeks: TOTAL_WEEKS - VAL_END,
    avgWeeklyDemand,
    forecast12WeeksTotal,
    residualStdDev: trained.residualStdDev,
    currentUsableStock,
    predictedDepletionWeeks: depletionWeeks,
    stockoutProbabilityPct,
    recommendedReorderQty,
    safetyStockQty,
    expectedSurplusUnits,
    series,
  };
}

// Compute aggregate model benchmark across all 80 (facility x SKU) series for the Analytics Lab
export function getNetworkModelBenchmark(): {
  totalSeriesEvaluated: number;
  models: Array<{
    modelId: ModelEvaluationMetric['modelId'];
    modelName: string;
    role: 'Baseline' | 'Candidate ML';
    avgTestMae: number;
    avgTestRMSE: number;
    avgTestWape: number;
    winCount: number;
  }>;
} {
  const agg = new Map<
    ModelEvaluationMetric['modelId'],
    {
      modelName: string;
      role: 'Baseline' | 'Candidate ML';
      maeSum: number;
      rmseSum: number;
      wapeSum: number;
      winCount: number;
      count: number;
    }
  >();

  let totalSeries = 0;
  for (const fac of FACILITIES) {
    for (const sku of [
      'SKU-IVS-020',
      'SKU-GLV-100',
      'SKU-HYD-020',
      'SKU-SYR-005',
      'SKU-MSK-IIR',
      'SKU-EDT-100',
      'SKU-GAZ-100',
      'SKU-USG-048',
      'SKU-INT-010',
      'SKU-GLU-050',
    ]) {
      const trained = getOrTrainSeries(fac.id, sku);
      totalSeries++;
      for (const m of trained.modelComparison) {
        const cur = agg.get(m.modelId) ?? {
          modelName: m.modelName,
          role: m.role,
          maeSum: 0,
          rmseSum: 0,
          wapeSum: 0,
          winCount: 0,
          count: 0,
        };
        cur.maeSum += m.testMae;
        cur.rmseSum += m.testRMSE;
        cur.wapeSum += m.testWape;
        if (m.selected) cur.winCount += 1;
        cur.count += 1;
        agg.set(m.modelId, cur);
      }
    }
  }

  return {
    totalSeriesEvaluated: totalSeries,
    models: Array.from(agg.entries()).map(([modelId, v]) => ({
      modelId,
      modelName: v.modelName,
      role: v.role,
      avgTestMae: Math.round((v.maeSum / v.count) * 100) / 100,
      avgTestRMSE: Math.round((v.rmseSum / v.count) * 100) / 100,
      avgTestWape: Math.round((v.wapeSum / v.count) * 100) / 100,
      winCount: v.winCount,
    })),
  };
}
