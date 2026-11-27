import type {
  Facility,
  InventoryBatch,
  Organisation,
  Product,
  WeeklyConsumptionPoint,
} from '../types/domain';

// Reference simulation anchor date for reproducible expiry horizons
export const SIMULATION_REFERENCE_DATE = '2026-11-27';

// Deterministic Mulberry32 PRNG (seed = 20261012 -> 10Alytics 2026 SDG 12)
export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussianRandom(rng: () => number): number {
  const u1 = Math.max(1e-7, rng());
  const u2 = rng();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

export const ORGANISATIONS: Organisation[] = [
  {
    id: 'ORG-METRO',
    name: 'Metro Regional Health Authority',
    region: 'Northern Corridor',
    tier: 'Public Health Network',
  },
  {
    id: 'ORG-COAST',
    name: 'Coastal Care Hospital Group',
    region: 'Eastern Seaboard',
    tier: 'Regional Hospital Group',
  },
  {
    id: 'ORG-VALLEY',
    name: 'Valley Community Health Alliance',
    region: 'Central & Highland',
    tier: 'Community Health Consortium',
  },
];

export const FACILITIES: Facility[] = [
  {
    id: 'FAC-001',
    orgId: 'ORG-METRO',
    name: 'Metropolitan General Hospital',
    type: 'Tertiary Hospital',
    region: 'Northern Corridor',
    city: 'Northgate',
    lat: 51.528,
    lon: -0.128,
    mapX: 255,
    mapY: 165,
    bedCount: 640,
    verified: true,
    storageCapabilities: ['ambient_15_25C', 'controlled_2_30C', 'temp_4_25C', 'sterile_dry'],
    leadTimeWeeks: 2,
    avgMonthlyBudgetUsd: 148000,
  },
  {
    id: 'FAC-002',
    orgId: 'ORG-VALLEY',
    name: 'Riverview Community Clinic',
    type: 'Community Clinic',
    region: 'Northern Corridor',
    city: 'Riverview',
    lat: 51.462,
    lon: -0.021,
    mapX: 390,
    mapY: 255,
    bedCount: 110,
    verified: true,
    storageCapabilities: ['ambient_15_25C', 'controlled_2_30C', 'temp_4_25C', 'sterile_dry'],
    leadTimeWeeks: 3,
    avgMonthlyBudgetUsd: 32000,
  },
  {
    id: 'FAC-003',
    orgId: 'ORG-COAST',
    name: 'St. Jude Regional Medical Centre',
    type: 'Regional Medical Centre',
    region: 'Eastern Seaboard',
    city: 'Portside',
    lat: 51.612,
    lon: 0.245,
    mapX: 695,
    mapY: 135,
    bedCount: 480,
    verified: true,
    storageCapabilities: ['ambient_15_25C', 'controlled_2_30C', 'temp_4_25C', 'sterile_dry'],
    leadTimeWeeks: 2,
    avgMonthlyBudgetUsd: 112000,
  },
  {
    id: 'FAC-004',
    orgId: 'ORG-COAST',
    name: 'Eastgate Surgical Institute',
    type: 'Surgical Institute',
    region: 'Eastern Seaboard',
    city: 'Eastgate',
    lat: 51.545,
    lon: 0.118,
    mapX: 565,
    mapY: 205,
    bedCount: 220,
    verified: true,
    storageCapabilities: ['ambient_15_25C', 'controlled_2_30C', 'sterile_dry'],
    leadTimeWeeks: 2,
    avgMonthlyBudgetUsd: 78000,
  },
  {
    id: 'FAC-005',
    orgId: 'ORG-METRO',
    name: 'Northshore Maternal & Paediatric Hospital',
    type: 'Specialty Hub',
    region: 'Northern Corridor',
    city: 'Northshore',
    lat: 51.688,
    lon: -0.095,
    mapX: 310,
    mapY: 82,
    bedCount: 310,
    verified: true,
    storageCapabilities: ['ambient_15_25C', 'controlled_2_30C', 'temp_4_25C', 'sterile_dry'],
    leadTimeWeeks: 2,
    avgMonthlyBudgetUsd: 84000,
  },
  {
    id: 'FAC-006',
    orgId: 'ORG-VALLEY',
    name: 'Highland Trauma & Diagnostics Centre',
    type: 'Regional Medical Centre',
    region: 'Central & Highland',
    city: 'Highland',
    lat: 51.345,
    lon: -0.342,
    mapX: 145,
    mapY: 365,
    bedCount: 390,
    verified: true,
    storageCapabilities: ['ambient_15_25C', 'controlled_2_30C', 'temp_4_25C', 'sterile_dry'],
    leadTimeWeeks: 3,
    avgMonthlyBudgetUsd: 95000,
  },
  {
    id: 'FAC-007',
    orgId: 'ORG-VALLEY',
    name: 'Valley Primary Health Hub',
    type: 'Community Clinic',
    region: 'Central & Highland',
    city: 'Meadowvale',
    lat: 51.392,
    lon: -0.185,
    mapX: 295,
    mapY: 392,
    bedCount: 85,
    verified: true,
    storageCapabilities: ['ambient_15_25C', 'controlled_2_30C'],
    leadTimeWeeks: 3,
    avgMonthlyBudgetUsd: 24500,
  },
  {
    id: 'FAC-008',
    orgId: 'ORG-COAST',
    name: 'Harbourside Oncology & Infusion Clinic',
    type: 'Specialty Hub',
    region: 'Eastern Seaboard',
    city: 'Harbourside',
    lat: 51.418,
    lon: 0.282,
    mapX: 785,
    mapY: 345,
    bedCount: 165,
    verified: true,
    storageCapabilities: ['ambient_15_25C', 'controlled_2_30C', 'temp_4_25C', 'sterile_dry'],
    leadTimeWeeks: 2,
    avgMonthlyBudgetUsd: 68000,
  },
];

// All 10 SKUs are eligible, non-regulated medical consumables (zero controlled pharmaceuticals)
export const PRODUCTS: Product[] = [
  {
    sku: 'SKU-IVS-020',
    name: 'Sterile IV Infusion Sets (20 drops/mL)',
    category: 'Infusion & Vascular',
    unitLabel: 'Box of 50',
    unitCostUsd: 34.0,
    unitWeightKg: 0.85,
    storageCondition: 'sterile_dry',
    shelfLifeMonths: 24,
    regulatedMedicine: false,
    emissionFactorKgCo2PerKg: 2.65,
    patientEpisodesPerUnit: 50,
  },
  {
    sku: 'SKU-GLV-100',
    name: 'Nitrile Examination Gloves (Powder-Free)',
    category: 'PPE & Barrier',
    unitLabel: 'Box of 100',
    unitCostUsd: 11.5,
    unitWeightKg: 0.42,
    storageCondition: 'ambient_15_25C',
    shelfLifeMonths: 36,
    regulatedMedicine: false,
    emissionFactorKgCo2PerKg: 2.85,
    patientEpisodesPerUnit: 50,
  },
  {
    sku: 'SKU-HYD-020',
    name: 'Hydrocolloid Sterile Wound Dressings',
    category: 'Wound & Surgical',
    unitLabel: 'Box of 20',
    unitCostUsd: 46.0,
    unitWeightKg: 0.38,
    storageCondition: 'sterile_dry',
    shelfLifeMonths: 24,
    regulatedMedicine: false,
    emissionFactorKgCo2PerKg: 2.55,
    patientEpisodesPerUnit: 20,
  },
  {
    sku: 'SKU-SYR-005',
    name: 'Disposable 5mL Luer-Lock Syringes',
    category: 'Infusion & Vascular',
    unitLabel: 'Box of 100',
    unitCostUsd: 14.8,
    unitWeightKg: 0.65,
    storageCondition: 'ambient_15_25C',
    shelfLifeMonths: 36,
    regulatedMedicine: false,
    emissionFactorKgCo2PerKg: 2.7,
    patientEpisodesPerUnit: 100,
  },
  {
    sku: 'SKU-MSK-IIR',
    name: 'Surgical Face Masks (Type IIR)',
    category: 'PPE & Barrier',
    unitLabel: 'Box of 50',
    unitCostUsd: 8.2,
    unitWeightKg: 0.24,
    storageCondition: 'ambient_15_25C',
    shelfLifeMonths: 24,
    regulatedMedicine: false,
    emissionFactorKgCo2PerKg: 2.6,
    patientEpisodesPerUnit: 50,
  },
  {
    sku: 'SKU-EDT-100',
    name: 'Venous Blood Collection Tubes (EDTA)',
    category: 'Diagnostics & Lab',
    unitLabel: 'Rack of 100',
    unitCostUsd: 22.5,
    unitWeightKg: 0.72,
    storageCondition: 'temp_4_25C',
    shelfLifeMonths: 18,
    regulatedMedicine: false,
    emissionFactorKgCo2PerKg: 2.65,
    patientEpisodesPerUnit: 100,
  },
  {
    sku: 'SKU-GAZ-100',
    name: 'Sterile Non-Woven Gauze Swabs (10x10cm)',
    category: 'Wound & Surgical',
    unitLabel: 'Pack of 100',
    unitCostUsd: 9.4,
    unitWeightKg: 0.31,
    storageCondition: 'sterile_dry',
    shelfLifeMonths: 36,
    regulatedMedicine: false,
    emissionFactorKgCo2PerKg: 2.2,
    patientEpisodesPerUnit: 50,
  },
  {
    sku: 'SKU-USG-048',
    name: 'Sterile Ultrasound Transmission Gel Packets',
    category: 'Diagnostics & Lab',
    unitLabel: 'Box of 48',
    unitCostUsd: 28.6,
    unitWeightKg: 1.15,
    storageCondition: 'ambient_15_25C',
    shelfLifeMonths: 24,
    regulatedMedicine: false,
    emissionFactorKgCo2PerKg: 2.35,
    patientEpisodesPerUnit: 48,
  },
  {
    sku: 'SKU-INT-010',
    name: 'Disposable Endotracheal Intubation Kits',
    category: 'Airway & Emergency',
    unitLabel: 'Case of 10',
    unitCostUsd: 112.0,
    unitWeightKg: 1.4,
    storageCondition: 'sterile_dry',
    shelfLifeMonths: 24,
    regulatedMedicine: false,
    emissionFactorKgCo2PerKg: 2.9,
    patientEpisodesPerUnit: 10,
  },
  {
    sku: 'SKU-GLU-050',
    name: 'Point-of-Care Glucometer Test Strips',
    category: 'Diagnostics & Lab',
    unitLabel: 'Vial of 50',
    unitCostUsd: 19.5,
    unitWeightKg: 0.09,
    storageCondition: 'controlled_2_30C',
    shelfLifeMonths: 15,
    regulatedMedicine: false,
    emissionFactorKgCo2PerKg: 2.5,
    patientEpisodesPerUnit: 50,
  },
];

export function addDaysToIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function diffDaysBetweenIso(fromIso: string, toIso: string): number {
  const fromMs = new Date(`${fromIso}T00:00:00Z`).getTime();
  const toMs = new Date(`${toIso}T00:00:00Z`).getTime();
  return Math.round((toMs - fromMs) / (1000 * 60 * 60 * 24));
}

export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

// Base weekly consumption profiles calibrated by facility bed scale and specialty
const SKU_BASE_PER_100_BEDS: Record<string, number> = {
  'SKU-IVS-020': 14,
  'SKU-GLV-100': 42,
  'SKU-HYD-020': 9,
  'SKU-SYR-005': 26,
  'SKU-MSK-IIR': 38,
  'SKU-EDT-100': 19,
  'SKU-GAZ-100': 28,
  'SKU-USG-048': 8,
  'SKU-INT-010': 3.5,
  'SKU-GLU-050': 22,
};

const SKU_SEASONAL_PHASE: Record<string, { amp: number; phase: number }> = {
  'SKU-IVS-020': { amp: 0.16, phase: 0.2 },
  'SKU-GLV-100': { amp: 0.18, phase: 0.4 },
  'SKU-HYD-020': { amp: 0.12, phase: 1.8 },
  'SKU-SYR-005': { amp: 0.22, phase: 0.1 },
  'SKU-MSK-IIR': { amp: 0.30, phase: 0.0 },
  'SKU-EDT-100': { amp: 0.14, phase: 0.7 },
  'SKU-GAZ-100': { amp: 0.15, phase: 2.1 },
  'SKU-USG-048': { amp: 0.10, phase: 1.1 },
  'SKU-INT-010': { amp: 0.24, phase: 0.2 },
  'SKU-GLU-050': { amp: 0.11, phase: 1.4 },
};

// Generate 104 weeks (2 years) of reproducible consumption history across all 8 facilities x 10 SKUs
let cachedHistory: WeeklyConsumptionPoint[] | null = null;

export function getHistoricalConsumption(): WeeklyConsumptionPoint[] {
  if (cachedHistory) return cachedHistory;
  const rng = createSeededRng(20261012);
  const rows: WeeklyConsumptionPoint[] = [];

  // Start date: 104 weeks prior to SIMULATION_REFERENCE_DATE
  const startDate = addDaysToIso(SIMULATION_REFERENCE_DATE, -104 * 7);

  for (const facility of FACILITIES) {
    const bedFactor = Math.max(0.65, facility.bedCount / 180);
    for (const product of PRODUCTS) {
      const baseRate = (SKU_BASE_PER_100_BEDS[product.sku] ?? 12) * bedFactor;
      const specialtyBoost =
        (facility.type === 'Surgical Institute' &&
          (product.sku === 'SKU-HYD-020' || product.sku === 'SKU-GAZ-100' || product.sku === 'SKU-INT-010')) ||
        (facility.id === 'FAC-008' && (product.sku === 'SKU-IVS-020' || product.sku === 'SKU-EDT-100')) ||
        (facility.id === 'FAC-002' && (product.sku === 'SKU-IVS-020' || product.sku === 'SKU-GLU-050'))
          ? 1.35
          : 1.0;

      const seasonal = SKU_SEASONAL_PHASE[product.sku] ?? { amp: 0.14, phase: 0.0 };
      const trendPerWeek = 0.0014 * (0.6 + rng() * 0.8);
      let prevDeviation = 0;

      for (let w = 1; w <= 104; w++) {
        const angle = (2 * Math.PI * (w - 1)) / 52 + seasonal.phase;
        const seasonalMult = 1 + seasonal.amp * Math.cos(angle) + 0.05 * Math.sin(2 * angle);
        const trendMult = 1 + trendPerWeek * w;
        const mean = baseRate * specialtyBoost * seasonalMult * trendMult;
        // AR(1) autocorrelated realistic operational noise
        const noise = 0.35 * prevDeviation + gaussianRandom(rng) * (mean * 0.085);
        prevDeviation = noise;
        const units = Math.max(2, Math.round(mean + noise));

        rows.push({
          weekIndex: w,
          weekStart: addDaysToIso(startDate, (w - 1) * 7),
          facilityId: facility.id,
          sku: product.sku,
          unitsConsumed: units,
        });
      }
    }
  }

  cachedHistory = rows;
  return rows;
}

// Initial reproducible batch ledger engineered to showcase:
// - Judge Demo primary scenario: FAC-001 (Metropolitan General) surplus IV Sets & Hydrocolloid Dressings -> FAC-002 (Riverview Community Clinic) predicted shortage
// - Additional multi-facility surplus/shortage pairings across Eastern Seaboard & Highland corridors
// - 2 explicitly ineligible batches (1 recalled, 1 expired) to verify Engine C hard eligibility gates!
export function createInitialInventoryBatches(): InventoryBatch[] {
  const ref = SIMULATION_REFERENCE_DATE;
  const priceOf = (sku: string) => PRODUCTS.find((p) => p.sku === sku)?.unitCostUsd ?? 20;

  return [
    // === JUDGE DEMO HERO SCENARIO ===
    // Facility A (FAC-001 Metropolitan General): Over-ordered Sterile IV Infusion Sets nearing expiry
    {
      batchId: 'BCH-IVS-2601',
      facilityId: 'FAC-001',
      sku: 'SKU-IVS-020',
      quantityOnHand: 460,
      unitCostUsd: priceOf('SKU-IVS-020'),
      receivedDate: addDaysToIso(ref, -420),
      expiryDate: addDaysToIso(ref, 44), // ~6.3 weeks left, demand ~52/wk -> ~130+ unused units!
      condition: 'sealed_nominal',
      storageLocation: 'Central Sterile Aisle B2',
      dataTag: 'Synthetic Demonstration Dataset',
    },
    {
      batchId: 'BCH-IVS-2609',
      facilityId: 'FAC-001',
      sku: 'SKU-IVS-020',
      quantityOnHand: 310,
      unitCostUsd: priceOf('SKU-IVS-020'),
      receivedDate: addDaysToIso(ref, -60),
      expiryDate: addDaysToIso(ref, 340),
      condition: 'sealed_nominal',
      storageLocation: 'Central Sterile Aisle B3',
      dataTag: 'Synthetic Demonstration Dataset',
    },
    // Facility B (FAC-002 Riverview Community Clinic): Imminent shortage of Sterile IV Infusion Sets
    {
      batchId: 'BCH-IVS-2644',
      facilityId: 'FAC-002',
      sku: 'SKU-IVS-020',
      quantityOnHand: 18, // < 1.2 weeks stock vs ~16/wk demand!
      unitCostUsd: priceOf('SKU-IVS-020'),
      receivedDate: addDaysToIso(ref, -95),
      expiryDate: addDaysToIso(ref, 240),
      condition: 'sealed_nominal',
      storageLocation: 'Clinic Supply Room 1',
      dataTag: 'Synthetic Demonstration Dataset',
    },
    // Facility A surplus Hydrocolloid Wound Dressings -> FAC-004 Eastgate Surgical Institute shortage
    {
      batchId: 'BCH-HYD-2612',
      facilityId: 'FAC-001',
      sku: 'SKU-HYD-020',
      quantityOnHand: 280,
      unitCostUsd: priceOf('SKU-HYD-020'),
      receivedDate: addDaysToIso(ref, -390),
      expiryDate: addDaysToIso(ref, 38),
      condition: 'sealed_nominal',
      storageLocation: 'Surgical Vault S1',
      dataTag: 'Synthetic Demonstration Dataset',
    },
    {
      batchId: 'BCH-HYD-2650',
      facilityId: 'FAC-004',
      sku: 'SKU-HYD-020',
      quantityOnHand: 22,
      unitCostUsd: priceOf('SKU-HYD-020'),
      receivedDate: addDaysToIso(ref, -75),
      expiryDate: addDaysToIso(ref, 290),
      condition: 'sealed_nominal',
      storageLocation: 'OR Core Store 2',
      dataTag: 'Synthetic Demonstration Dataset',
    },

    // === MULTI-FACILITY CORRIDOR 2: Eastern Seaboard ===
    // FAC-003 St. Jude surplus EDTA Tubes -> FAC-008 Harbourside Oncology shortage
    {
      batchId: 'BCH-EDT-2621',
      facilityId: 'FAC-003',
      sku: 'SKU-EDT-100',
      quantityOnHand: 520,
      unitCostUsd: priceOf('SKU-EDT-100'),
      receivedDate: addDaysToIso(ref, -310),
      expiryDate: addDaysToIso(ref, 52),
      condition: 'sealed_nominal',
      storageLocation: 'Pathology Temp-Ctrl Bay 4',
      dataTag: 'Synthetic Demonstration Dataset',
    },
    {
      batchId: 'BCH-EDT-2688',
      facilityId: 'FAC-008',
      sku: 'SKU-EDT-100',
      quantityOnHand: 26,
      unitCostUsd: priceOf('SKU-EDT-100'),
      receivedDate: addDaysToIso(ref, -80),
      expiryDate: addDaysToIso(ref, 210),
      condition: 'sealed_nominal',
      storageLocation: 'Infusion Lab Store',
      dataTag: 'Synthetic Demonstration Dataset',
    },
    // FAC-003 surplus Endotracheal Intubation Kits -> FAC-006 Highland Trauma shortage
    {
      batchId: 'BCH-INT-2633',
      facilityId: 'FAC-003',
      sku: 'SKU-INT-010',
      quantityOnHand: 118,
      unitCostUsd: priceOf('SKU-INT-010'),
      receivedDate: addDaysToIso(ref, -450),
      expiryDate: addDaysToIso(ref, 48),
      condition: 'sealed_nominal',
      storageLocation: 'ICU Reserve Locker 3',
      dataTag: 'Synthetic Demonstration Dataset',
    },
    {
      batchId: 'BCH-INT-2671',
      facilityId: 'FAC-006',
      sku: 'SKU-INT-010',
      quantityOnHand: 10,
      unitCostUsd: priceOf('SKU-INT-010'),
      receivedDate: addDaysToIso(ref, -110),
      expiryDate: addDaysToIso(ref, 260),
      condition: 'sealed_nominal',
      storageLocation: 'Trauma Bay Supply',
      dataTag: 'Synthetic Demonstration Dataset',
    },

    // === MULTI-FACILITY CORRIDOR 3: Northern & Valley ===
    // FAC-005 Northshore Maternal surplus Glucometer Test Strips -> FAC-007 Valley Primary Hub & FAC-002 Riverview shortage
    {
      batchId: 'BCH-GLU-2615',
      facilityId: 'FAC-005',
      sku: 'SKU-GLU-050',
      quantityOnHand: 440,
      unitCostUsd: priceOf('SKU-GLU-050'),
      receivedDate: addDaysToIso(ref, -280),
      expiryDate: addDaysToIso(ref, 41),
      condition: 'sealed_nominal',
      storageLocation: 'Diagnostics Climate Shelf 2',
      dataTag: 'Synthetic Demonstration Dataset',
    },
    {
      batchId: 'BCH-GLU-2690',
      facilityId: 'FAC-007',
      sku: 'SKU-GLU-050',
      quantityOnHand: 16,
      unitCostUsd: priceOf('SKU-GLU-050'),
      receivedDate: addDaysToIso(ref, -65),
      expiryDate: addDaysToIso(ref, 195),
      condition: 'sealed_nominal',
      storageLocation: 'Primary Care Store A',
      dataTag: 'Synthetic Demonstration Dataset',
    },
    {
      batchId: 'BCH-GLU-2691',
      facilityId: 'FAC-002',
      sku: 'SKU-GLU-050',
      quantityOnHand: 22,
      unitCostUsd: priceOf('SKU-GLU-050'),
      receivedDate: addDaysToIso(ref, -55),
      expiryDate: addDaysToIso(ref, 220),
      condition: 'sealed_nominal',
      storageLocation: 'Clinic Supply Room 2',
      dataTag: 'Synthetic Demonstration Dataset',
    },

    // FAC-006 Highland Trauma surplus Syringes -> FAC-007 Valley Primary Hub shortage
    {
      batchId: 'BCH-SYR-2629',
      facilityId: 'FAC-006',
      sku: 'SKU-SYR-005',
      quantityOnHand: 690,
      unitCostUsd: priceOf('SKU-SYR-005'),
      receivedDate: addDaysToIso(ref, -510),
      expiryDate: addDaysToIso(ref, 56),
      condition: 'sealed_nominal',
      storageLocation: 'Bulk Depot Rack C1',
      dataTag: 'Synthetic Demonstration Dataset',
    },
    {
      batchId: 'BCH-SYR-2682',
      facilityId: 'FAC-007',
      sku: 'SKU-SYR-005',
      quantityOnHand: 24,
      unitCostUsd: priceOf('SKU-SYR-005'),
      receivedDate: addDaysToIso(ref, -90),
      expiryDate: addDaysToIso(ref, 310),
      condition: 'sealed_nominal',
      storageLocation: 'Primary Care Store B',
      dataTag: 'Synthetic Demonstration Dataset',
    },

    // FAC-004 Eastgate Surgical surplus Surgical Masks -> FAC-002 Riverview & FAC-008 Harbourside
    {
      batchId: 'BCH-MSK-2618',
      facilityId: 'FAC-004',
      sku: 'SKU-MSK-IIR',
      quantityOnHand: 620,
      unitCostUsd: priceOf('SKU-MSK-IIR'),
      receivedDate: addDaysToIso(ref, -480),
      expiryDate: addDaysToIso(ref, 46),
      condition: 'sealed_nominal',
      storageLocation: 'PPE Annex Shelf 5',
      dataTag: 'Synthetic Demonstration Dataset',
    },
    {
      batchId: 'BCH-MSK-2685',
      facilityId: 'FAC-008',
      sku: 'SKU-MSK-IIR',
      quantityOnHand: 35,
      unitCostUsd: priceOf('SKU-MSK-IIR'),
      receivedDate: addDaysToIso(ref, -45),
      expiryDate: addDaysToIso(ref, 320),
      condition: 'sealed_nominal',
      storageLocation: 'Oncology PPE Closet',
      dataTag: 'Synthetic Demonstration Dataset',
    },

    // FAC-008 Harbourside surplus Ultrasound Gel -> FAC-005 Northshore Maternal shortage
    {
      batchId: 'BCH-USG-2625',
      facilityId: 'FAC-008',
      sku: 'SKU-USG-048',
      quantityOnHand: 185,
      unitCostUsd: priceOf('SKU-USG-048'),
      receivedDate: addDaysToIso(ref, -350),
      expiryDate: addDaysToIso(ref, 50),
      condition: 'sealed_nominal',
      storageLocation: 'Imaging Store 1',
      dataTag: 'Synthetic Demonstration Dataset',
    },
    {
      batchId: 'BCH-USG-2677',
      facilityId: 'FAC-005',
      sku: 'SKU-USG-048',
      quantityOnHand: 14,
      unitCostUsd: priceOf('SKU-USG-048'),
      receivedDate: addDaysToIso(ref, -100),
      expiryDate: addDaysToIso(ref, 280),
      condition: 'sealed_nominal',
      storageLocation: 'OB-GYN Imaging Cabinet',
      dataTag: 'Synthetic Demonstration Dataset',
    },

    // Healthy baseline operational stock across remaining SKUs/facilities
    {
      batchId: 'BCH-GLV-2604',
      facilityId: 'FAC-001',
      sku: 'SKU-GLV-100',
      quantityOnHand: 920,
      unitCostUsd: priceOf('SKU-GLV-100'),
      receivedDate: addDaysToIso(ref, -120),
      expiryDate: addDaysToIso(ref, 410),
      condition: 'sealed_nominal',
      storageLocation: 'Central PPE Zone A1',
      dataTag: 'Synthetic Demonstration Dataset',
    },
    {
      batchId: 'BCH-GLV-2605',
      facilityId: 'FAC-003',
      sku: 'SKU-GLV-100',
      quantityOnHand: 780,
      unitCostUsd: priceOf('SKU-GLV-100'),
      receivedDate: addDaysToIso(ref, -340),
      expiryDate: addDaysToIso(ref, 64),
      condition: 'sealed_nominal',
      storageLocation: 'Main Depot Bay 2',
      dataTag: 'Synthetic Demonstration Dataset',
    },
    {
      batchId: 'BCH-GLV-2699',
      facilityId: 'FAC-006',
      sku: 'SKU-GLV-100',
      quantityOnHand: 82,
      unitCostUsd: priceOf('SKU-GLV-100'),
      receivedDate: addDaysToIso(ref, -55),
      expiryDate: addDaysToIso(ref, 330),
      condition: 'sealed_nominal',
      storageLocation: 'ER Triage Supply',
      dataTag: 'Synthetic Demonstration Dataset',
    },
    {
      batchId: 'BCH-GAZ-2610',
      facilityId: 'FAC-001',
      sku: 'SKU-GAZ-100',
      quantityOnHand: 540,
      unitCostUsd: priceOf('SKU-GAZ-100'),
      receivedDate: addDaysToIso(ref, -160),
      expiryDate: addDaysToIso(ref, 360),
      condition: 'sealed_nominal',
      storageLocation: 'Central Sterile Aisle C4',
      dataTag: 'Synthetic Demonstration Dataset',
    },
    {
      batchId: 'BCH-GAZ-2611',
      facilityId: 'FAC-004',
      sku: 'SKU-GAZ-100',
      quantityOnHand: 420,
      unitCostUsd: priceOf('SKU-GAZ-100'),
      receivedDate: addDaysToIso(ref, -420),
      expiryDate: addDaysToIso(ref, 58),
      condition: 'sealed_nominal',
      storageLocation: 'OR Sterile Pack 3',
      dataTag: 'Synthetic Demonstration Dataset',
    },
    {
      batchId: 'BCH-GAZ-2693',
      facilityId: 'FAC-002',
      sku: 'SKU-GAZ-100',
      quantityOnHand: 28,
      unitCostUsd: priceOf('SKU-GAZ-100'),
      receivedDate: addDaysToIso(ref, -70),
      expiryDate: addDaysToIso(ref, 285),
      condition: 'sealed_nominal',
      storageLocation: 'Wound Care Closet',
      dataTag: 'Synthetic Demonstration Dataset',
    },
    {
      batchId: 'BCH-SYR-2603',
      facilityId: 'FAC-001',
      sku: 'SKU-SYR-005',
      quantityOnHand: 640,
      unitCostUsd: priceOf('SKU-SYR-005'),
      receivedDate: addDaysToIso(ref, -140),
      expiryDate: addDaysToIso(ref, 420),
      condition: 'sealed_nominal',
      storageLocation: 'Central Supply Rack D2',
      dataTag: 'Synthetic Demonstration Dataset',
    },
    {
      batchId: 'BCH-IVS-2619',
      facilityId: 'FAC-003',
      sku: 'SKU-IVS-020',
      quantityOnHand: 285,
      unitCostUsd: priceOf('SKU-IVS-020'),
      receivedDate: addDaysToIso(ref, -85),
      expiryDate: addDaysToIso(ref, 355),
      condition: 'sealed_nominal',
      storageLocation: 'Infusion Store A2',
      dataTag: 'Synthetic Demonstration Dataset',
    },
    {
      batchId: 'BCH-IVS-2620',
      facilityId: 'FAC-005',
      sku: 'SKU-IVS-020',
      quantityOnHand: 195,
      unitCostUsd: priceOf('SKU-IVS-020'),
      receivedDate: addDaysToIso(ref, -72),
      expiryDate: addDaysToIso(ref, 310),
      condition: 'sealed_nominal',
      storageLocation: 'Paediatric Store B1',
      dataTag: 'Synthetic Demonstration Dataset',
    },
    {
      batchId: 'BCH-MSK-2608',
      facilityId: 'FAC-005',
      sku: 'SKU-MSK-IIR',
      quantityOnHand: 410,
      unitCostUsd: priceOf('SKU-MSK-IIR'),
      receivedDate: addDaysToIso(ref, -110),
      expiryDate: addDaysToIso(ref, 290),
      condition: 'sealed_nominal',
      storageLocation: 'PPE Store North',
      dataTag: 'Synthetic Demonstration Dataset',
    },
    {
      batchId: 'BCH-EDT-2606',
      facilityId: 'FAC-001',
      sku: 'SKU-EDT-100',
      quantityOnHand: 360,
      unitCostUsd: priceOf('SKU-EDT-100'),
      receivedDate: addDaysToIso(ref, -90),
      expiryDate: addDaysToIso(ref, 240),
      condition: 'sealed_nominal',
      storageLocation: 'Core Lab Temp Bay 1',
      dataTag: 'Synthetic Demonstration Dataset',
    },
    {
      batchId: 'BCH-HYD-2614',
      facilityId: 'FAC-006',
      sku: 'SKU-HYD-020',
      quantityOnHand: 145,
      unitCostUsd: priceOf('SKU-HYD-020'),
      receivedDate: addDaysToIso(ref, -100),
      expiryDate: addDaysToIso(ref, 270),
      condition: 'sealed_nominal',
      storageLocation: 'Trauma Wound Vault',
      dataTag: 'Synthetic Demonstration Dataset',
    },

    // === INTENTIONALLY INELIGIBLE LOTS (To prove Engine C safety & compliance gates!) ===
    {
      batchId: 'BCH-REC-9901',
      facilityId: 'FAC-003',
      sku: 'SKU-SYR-005',
      quantityOnHand: 160,
      unitCostUsd: priceOf('SKU-SYR-005'),
      receivedDate: addDaysToIso(ref, -220),
      expiryDate: addDaysToIso(ref, 90),
      condition: 'recalled',
      storageLocation: 'Quarantine Cage Q1',
      dataTag: 'Synthetic Demonstration Dataset',
    },
    {
      batchId: 'BCH-EXP-9902',
      facilityId: 'FAC-004',
      sku: 'SKU-GLV-100',
      quantityOnHand: 95,
      unitCostUsd: priceOf('SKU-GLV-100'),
      receivedDate: addDaysToIso(ref, -750),
      expiryDate: addDaysToIso(ref, -8), // Expired 8 days ago
      condition: 'sealed_nominal',
      storageLocation: 'Disposal Holding Area',
      dataTag: 'Synthetic Demonstration Dataset',
    },
  ];
}

export function getFacilityById(id: string): Facility | undefined {
  return FACILITIES.find((f) => f.id === id);
}

export function getProductBySku(sku: string): Product | undefined {
  return PRODUCTS.find((p) => p.sku === sku);
}
