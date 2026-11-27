import { writeFileSync } from 'node:fs';
import { precomputeForecastModels } from '../src/engines/forecasting';

writeFileSync(
  new URL('../.worker-forecast-models.json', import.meta.url),
  JSON.stringify(precomputeForecastModels()),
);
