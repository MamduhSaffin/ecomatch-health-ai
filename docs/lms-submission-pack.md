# 10Alytics Global Hackathon 2026 — Official LMS Portal Submission Pack

## Core Required Fields

- **Project Name**: EcoMatch Health AI
- **Competition Track & Alignment**: Health Track — United Nations SDG 12: Responsible Consumption and Production
- **One-Line Problem Statement**: Healthcare facilities waste valuable medical supplies while other facilities experience shortages due to inefficient forecasting, procurement and resource allocation.
- **Project Description**: EcoMatch Health AI is an intelligent healthcare resource optimisation platform combining predictive analytics, machine learning, explainable resource matchmaking and sustainability measurement to reduce medical supply waste, optimise procurement and improve resource availability across healthcare institutions.

## Detailed Submission Fields

### Project Summary
EcoMatch Health AI transforms isolated healthcare facilities into a collaborative, sustainable consumables network. Powered by six interconnected intelligence engines—chronological demand forecasting, FEFO expiry-risk scoring, safety-gated explainable matchmaking, capacitated multi-facility linear programming, provenance-separated SDG 12 impact accounting, and a grounded AI Resource Operations Agent—the platform enables hospital supply teams to prevent avoidable waste, cut unnecessary procurement, and protect clinical supply availability without compromising safety or human governance.

### Methodology & Machine Learning Results
- **Dataset**: Reproducible synthetic healthcare consumables dataset (`seed 20261012`, 8 facilities, 10 non-regulated consumable SKUs, 104 weekly periods = 8,320 records, zero PII), calibrated against WHO, UNICEF Supply Division Catalogue, and US EPA WARM public references.
- **Validation**: Strict chronological splits (72 train / 16 validation / 16 holdout test weeks) preventing future data leakage.
- **Verified Holdout Benchmark (80 Series)**: Ridge Regression (Lag + Fourier) achieved **7.44% average Test WAPE** (MAE 3.31, RMSE 4.08), outperforming the 4-Week Moving Average baseline (8.06% WAPE, MAE 3.73) and selected in 50/80 series.

### Economic & Environmental Impact
All metrics strictly distinguish Observed Ledger results, Model Predictions, Simulated LP Outcomes, and Estimated Environmental Benefits. Redistribution reduces combined procurement and expiry write-off costs while diverting expiring consumables by weight (kg) and avoiding net CO2e emissions (2.20–2.90 kg CO2e/kg minus 0.12 kg CO2e/km courier transit).

### Pending External Links & Team Fields (Complete Prior to Portal Lock)
- **Registered Team Name**: *[Confirm before submission]*
- **Contributor Names**: *[Confirm before submission]*
- **Public GitHub Repository URL**: *[Publish public repo & paste verified URL]*
- **Public Deployed Application URL**: *[Deploy & paste verified URL]*
- **Compiled 12-Slide Presentation PDF**: *[Export `docs/pitch-deck-12-slides.md` to PDF]*
- **Demonstration Video (<10 MB MP4)**: *[Record per `docs/demo-video-storyboard.md`]*
