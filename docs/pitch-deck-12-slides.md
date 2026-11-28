# EcoMatch Health AI — Strict 12-Slide Executive Pitch Deck Source

> Export to a single PDF (≤12 slides) after filling in verified registered team name, contributor names, and live public URLs.

---

## Slide 1 — Title
- **Title**: EcoMatch Health AI
- **Tagline**: Predict Waste. Redistribute Resources. Expand Healthcare Capacity.
- **Competition**: 10Alytics Global Hackathon 2026 — Health Track (UN SDG 12)
- **Product Family**: TGPU Innovator Labs
- **Registered Team Name**: *[Insert Official Registered Team Name]*
- **Contributing Team Members**: *[Insert Verified Full Names of All Contributors]*

---

## Slide 2 — The Problem
- Healthcare facilities manage medical consumables in isolated silos using static reorder thresholds.
- Result: Simultaneous **near-expiry surplus write-offs** at large tertiary hospitals and **unexpected stockouts** at neighbouring community clinics.
- Consequences: Avoidable procurement spend, clinical service bottlenecks, and preventable medical plastic/incineration waste.

---

## Slide 3 — Evidence & UN SDG 12 Alignment
- **WHO Healthcare Waste Guidance**: Substantial share of healthcare operational waste stems from disposable consumables and expired stock incineration.
- **UN SDG 12 (Targets 12.3 & 12.5)**: Preventing medical supply expiry before disposal reduces waste generation at source and lowers upstream manufacturing footprint.
- **Operational Beneficiaries**: Hospital inventory managers, regional procurement directors, community clinics, and patients relying on uninterrupted consumables availability.

---

## Slide 4 — The Solution
- **EcoMatch Health AI** is a multi-facility Healthcare Resource Intelligence & Circular Economy SaaS platform.
- Transforms isolated hospitals into a verified, human-governed consumables redistribution network.
- Strictly scoped to **eligible, non-expired, non-regulated medical consumables** (IV sets, gloves, dressings, syringes, diagnostic tubes).

---

## Slide 5 — Innovation: Six Interconnected Intelligence Engines
1. **Engine A**: Chronological demand forecasting with 95% uncertainty intervals.
2. **Engine B**: FEFO batch depletion & explainable 0–100 waste-risk scoring.
3. **Engine C**: Hard safety-gated matchmaking (blocks expired/recalled lots before scoring).
4. **Engine D**: Capacitated multi-facility greedy allocation heuristic (LP) redistribution solver.
5. **Engine E**: Provenance-separated SDG 12 financial & carbon accounting.
6. **Engine F**: Evidence-grounded AI Resource Operations Agent with clinical refusal guardrails.

---

## Slide 6 — Data & Reproducible Analysis
- Reproducible seeded synthetic healthcare consumables dataset (`seed 20261012`, zero patient PII): 8 verified facilities, 10 non-regulated SKUs, 104 weeks (8,320 consumption records), 32 batches including quarantined/expired compliance test lots.
- Calibrated against WHO, UNICEF Supply Division Catalogue, and US EPA WARM public references.
- Reproducible via `python3 scripts/run_pipeline.py` and 6 Jupyter Notebooks (`notebooks/01–06`).

---

## Slide 7 — Machine Learning Methodology & Verified Evaluation
- Strict chronological split: **Weeks 1–72 Train | Weeks 73–88 Validation | Weeks 89–104 Holdout Test** (zero leakage).
- Verified 80-series holdout test benchmark (`models/evaluation_report.json`):
  - **4-Week Moving Average (Baseline)**: 8.06% WAPE · 3.73 MAE · 4.59 RMSE (21/80 wins)
  - **Holt-Winters Seasonal Smoothing**: 10.27% WAPE · 4.47 MAE · 5.48 RMSE (9/80 wins)
  - **Ridge Regression (Lag + Fourier)**: **7.44% WAPE · 3.31 MAE · 4.08 RMSE (50/80 wins)**
- Live web lab additionally benchmarks Gradient Boosted Decision Ensemble with feature importance.

---

## Slide 8 — Technical Architecture & Security
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 + Recharts + Interactive SVG Network Map.
- **Backend**: Express REST API (`server.ts`), Zod schema validation, rate limiting, scrypt password hashing, HMAC-SHA256 Bearer tokens, server-side Gemini 4 Hydrogen SDK.
- **Governance**: Organisation-level PostgreSQL Row-Level Security (`supabase/migrations/001_initial_schema.sql`), immutable Audit Logs, and isolated Public Judge Demo Sandbox.

---

## Slide 9 — Working End-to-End Demonstration (Public Judge Demo Mode)
- 1-click **Explore Live Demo** — zero login or credentials required.
- 12-step guided scenario: Metropolitan General Hospital (surplus Sterile IV Sets expiring in 44 days) → Riverview Community Clinic (10.5 km away, <1.2 weeks stock left) → Explainable Match Score → Mandatory Human Approval → Live Inventory Update & Audit Log.

---

## Slide 10 — Measurable Impact (Transparent Provenance)
- Clearly separates **Observed Ledger**, **Model Predictions**, **Simulated Redistribution Outcomes**, and **Estimated Environmental Benefits**.
- On the baseline 8-facility demonstration network, Engine D heuristic optimisation reduces total operational spend, diverts expiring consumables by weight (kg), and avoids net CO2e emissions (deducting `0.12 kg CO2e/km` courier transit).
- Scenario Simulation Lab proves resilience under +35% demand surges, -30% budget cuts, and 5-week supplier disruptions.

---

## Slide 11 — Scalability & Commercial Sustainability
- **Target Customers**: Hospital groups, public health authorities, community clinic alliances, humanitarian supply organisations.
- **Commercial B2B SaaS Model**: Per-facility subscription + enterprise network tier + ESG/SDG 12 reporting add-on.
- **Phased Pilot Roadmap**: Phase 1 Isolated Demo → Phase 2 Controlled 3–5 Clinic Pilot → Phase 3 ERP API Sync → Phase 4 Regional Circular Network.

---

## Slide 12 — Conclusion & Public Access
- EcoMatch Health AI unites rigorous machine learning, mathematical optimisation, and human-governed circular logistics to deliver measurable UN SDG 12 healthcare impact.
- **Public Live Application URL**: *[Insert Verified Deployed URL]*
- **Public GitHub Repository URL**: *[Insert Verified Public GitHub URL]*
- **Thank You — Questions & Live Demo Ready**
