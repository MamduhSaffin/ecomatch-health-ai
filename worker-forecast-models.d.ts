// Wrangler generates this JSON before bundling the Worker.
declare module '*.worker-forecast-models.json' {
  const models: ReturnType<typeof import('./src/engines/forecasting').precomputeForecastModels>;
  export default models;
}
