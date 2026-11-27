# EcoMatch Health AI

**Predict Waste. Redistribute Resources. Expand Healthcare Capacity.**

- **Competition**: 10Alytics Global Hackathon 2026 — Health Track
- **Primary Alignment**: United Nations Sustainable Development Goal 12 — Responsible Consumption and Production (Targets 12.3 & 12.5)
- **Product Family**: TGPU Innovator Labs (Standalone competition repository: `tgpu-ecomatch-health`)
- **Registered Team & Contributors**: *[Pending final registered team name and verified contributor list prior to LMS submission]*

---

## 1. Problem Statement

Healthcare facilities frequently waste valuable, expiring medical consumables while neighbouring clinics simultaneously face unexpected shortages and pay emergency spot procurement prices. Isolated ward spreadsheets and static reorder points lack cross-facility visibility, FEFO expiry-depletion intelligence, and verified redistribution workflows.

EcoMatch Health AI transforms isolated healthcare facilities into a collaborative, circular, human-governed resource network focused strictly on **eligible, non-expired, non-regulated medical consumables**.

---

## 2. Six Interconnected Intelligence Engines

1. **Engine A — Predictive Demand Intelligence (`src/engines/forecasting.ts`)**: Evaluates 4 models per facility-SKU series (4-Week Moving Average baseline, Holt-Winters Seasonal Smoothing, Ridge Lag-Fourier Regression, and Gradient Boosted Decision Ensemble) on strict chronological splits (`Train: 72w | Validation: 16w | Holdout Test: 16w`) with zero data leakage, 95% prediction intervals, depletion horizons, and stockout probability.
2. **Engine B — Waste & Expiry Risk Intelligence (`src/engines/wasteRisk.ts`)**: Performs First-Expiry-First-Out (FEFO) batch demand allocation, predicts unused units prior to expiration, calculates financial exposure, and produces an explainable 0–100 Waste Risk Score decomposed into 4 transparent factors.
3. **Engine C — Intelligent Resource Matchmaking (`src/engines/matchmaking.ts`)**: Applies hard compliance eligibility gates **before** scoring—automatically rejecting expired, recalled, damaged, restricted, `<14`-day shelf-life, or storage-incompatible lots—then computes a transparent 0–100 compatibility score with Haversine distance and mandatory human approval.
4. **Engine D — Prescriptive Optimisation (`src/engines/optimisation.ts`)**: Solves a capacitated multi-facility redistribution vs. external procurement linear programme benchmarking Conventional Isolated Operations against EcoMatch Optimised Redistribution, with real-time scenario stress-testing.
5. **Engine E — Environmental & Economic Impact Intelligence (`src/engines/impact.ts`)**: Separates **Observed Ledger**, **Model Predictions**, **Simulated LP Outcomes**, and **Estimated Environmental Benefits** (waste diverted in kg and estimated avoided CO2e net of courier transit emissions).
6. **Engine F — AI Resource Operations Agent (`server/services/aiAgent.ts`)**: Evidence-grounded operational assistant powered by server-side Gemini (`gemini-4-hydrogen`) alongside an explicit Deterministic Ledger Query mode. Refuses clinical diagnosis/treatment queries and enforces human approval on proposed transfers.

---

## 3. Verified Data Science & Machine Learning Evaluation

All operational data in this demonstration build is generated reproducibly via `scripts/run_pipeline.py` (Mulberry32 PRNG seed `20261012`, **8,320 weekly consumption rows** across 8 facilities × 10 non-regulated consumable SKUs, zero patient PII).

Verified out-of-sample holdout benchmark (`models/evaluation_report.json`, 80 series, 16-week unseen test split):

| Model | Role | Avg Test MAE | Avg Test RMSE | Avg Test WAPE | Validation-Selected Series |
| :--- | :--- | :---: | :---: | :---: | :---: |
| 4-Week Moving Average | Baseline | 3.73 | 4.59 | 8.06% | 21 / 80 |
| Holt-Winters Seasonal Smoothing | Candidate ML | 4.47 | 5.48 | 10.27% | 9 / 80 |
| **Ridge Regression (Lag + Fourier)** | **Candidate ML** | **3.31** | **4.08** | **7.44%** | **50 / 80** |

The web application additionally evaluates the Gradient Boosted Decision Ensemble live alongside these three models in the Predictive Analytics Laboratory.

---

## 4. Architecture & Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, Lucide Icons
- **Backend**: Express 4 + Vite dev middleware (`server.ts`), Zod schema validation, sliding-window rate limiting, scrypt password hashing, HMAC-SHA256 Bearer session tokens, and server-side `@google/genai` integration
- **Database Schema**: Multi-tenant Supabase PostgreSQL migration with Row-Level Security (`supabase/migrations/001_initial_schema.sql`) plus isolated in-memory demonstration & Judge Demo sandbox fallback
- **Data Science**: Python 3.11 (`scripts/run_pipeline.py`), reproducible CSV datasets (`data/synthetic/`), and 6 Jupyter Notebooks (`notebooks/01–06`)

---

## 5. Local Setup, Reproduction & Automated Tests

```bash
# 1. Install dependencies
npm install

# 2. Re-run reproducible Python dataset, ML evaluation & Jupyter Notebook generation
python3 scripts/run_pipeline.py

# 3. Run automated unit, engine, guardrail & security tests
npm test

# 4. Type-check & production build
npm run lint && npm run build

# 5. Start full-stack server on http://localhost:3000
npm run dev
```

Configure optional environment variables using `.env.example` (never commit real secrets).

---

## 6. Security & Competition Integrity

- **Public Judge Demo Isolation**: Public visitors clicking **Explore Live Demo** interact exclusively with a dedicated sandbox store (`X-EcoMatch-Demo: true`) that can never alter production records or access administrative privileges.
- **No Fabricated Claims**: All synthetic data is transparently labelled throughout the UI, exports, and documentation.
- **Official Voting Integrity**: Community voting occurs exclusively on the official 10Alytics competition platform. Zero simulated voting or artificial engagement exists.
- **IP & Code Reuse Disclosure**: Built independently as a standalone competition application (`tgpu-ecomatch-health`); zero proprietary TGPU / MatchOS source code, credentials, or production databases are exposed.

---

## 7. Competition Deliverables Index

- `data/README.md` & `data/data_dictionary.csv` — Dataset provenance, public reference sources & schema
- `notebooks/01–06_*.ipynb` — Reproducible EDA, feature engineering, training, evaluation, optimisation & impact notebooks
- `models/evaluation_report.json` — Verified holdout benchmark artifact
- `docs/pitch-deck-12-slides.md` — Strict 12-slide executive pitch narrative ready for PDF export
- `docs/demo-video-storyboard.md` — 75-second demo video narration script & <10 MB FFmpeg encoding spec
- `docs/lms-submission-pack.md` — Complete 10Alytics LMS Hackathon Portal submission fields
- `submission/submission-manifest.json` — Honest status tracker of completed vs. outstanding deliverables
