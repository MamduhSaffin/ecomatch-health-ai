# EcoMatch Health AI — Dataset Provenance & Acquisition Guide

## 1. Synthetic Operational Dataset (Included & Reproducible)
Because genuine hospital batch-level expiry and ward consumption ledgers are proprietary and subject to institutional confidentiality, EcoMatch Health AI uses a **100% reproducible synthetic healthcare consumables dataset** generated deterministically by `scripts/run_pipeline.py` (Mulberry32 PRNG seed `20261012`).

- `data/synthetic/facilities.csv` — 8 fictional demonstration healthcare facilities across 3 regional corridors
- `data/synthetic/products.csv` — 10 non-regulated medical consumables (zero controlled medicines)
- `data/synthetic/weekly_consumption.csv` — 8,320 weekly consumption observations (104 weeks × 80 facility-SKU pairs)
- `data/data_dictionary.csv` — Full schema and provenance dictionary

**Strict Disclosures:**
- Contains **zero** patient-identifiable data (PII/PHI).
- Clearly labelled as `Synthetic Demonstration Dataset` across the web UI, API exports, notebooks, and pitch deck.

## 2. Public Reference Sources Used for Domain Calibration
No proprietary hospital records were redistributed. Parameter ranges (unit pricing tiers, consumable weights, storage conditions, and medical polymer emission factors) were calibrated against publicly accessible reference sources:
1. **WHO Global Health Observatory & Healthcare Waste Fact Sheets** — https://www.who.int/news-room/fact-sheets/detail/health-care-waste (License: CC BY-NC-SA 3.0 IGO)
2. **UNICEF Supply Division Catalogue** — https://supply.unicef.org/ (Public procurement catalog reference for standard medical consumables pack sizes & unit cost bands)
3. **US EPA WARM (Waste Reduction Model) & Healthcare Without Harm** — https://www.epa.gov/warm (Public domain US government reference for polymer/disposal GHG emission factor ranges: 2.20–2.90 kg CO2e/kg)
4. **UN Sustainable Development Goal 12 Indicators** — https://sdgs.un.org/goals/goal12 (Targets 12.3 & 12.5)

## Validation boundary
Public references provide context, not live hospital inventory or independently validated SKU-specific emissions. All operational scenario estimates and demo transfer records remain synthetic.
