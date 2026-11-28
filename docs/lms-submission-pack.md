# 10Alytics Global Hackathon 2026 — Official LMS Portal Submission Pack

## Core Required Fields

- **Project Name**: EcoMatch Health AI
- **Competition Track & Alignment**: Health Track — United Nations SDG 12: Responsible Consumption and Production
- **One-Line Problem Statement**: Healthcare facilities waste valuable medical supplies while other facilities experience shortages due to inefficient forecasting, procurement and resource allocation.
- **Project Description**: EcoMatch forecasts demand and proposes eligible stock transfers for human review. On synthetic test data, forecast error was 7.44% versus 8.06% for a four-week moving average.

## Detailed Submission Fields

### Project Summary
EcoMatch forecasts demand and proposes eligible stock transfers for human review. On synthetic test data, forecast error was 7.44% versus 8.06% for a four-week moving average.

The six engines cover demand forecasting, FEFO expiry-risk scoring, safety-gated matchmaking, constrained greedy allocation (not guaranteed globally optimal), SDG 12 impact accounting, and an operational AI assistant.

### Methodology & Machine Learning Results
- **Dataset**: Reproducible synthetic healthcare consumables dataset (`seed 20261012`, 8 facilities, 10 non-regulated consumable SKUs, 104 weekly periods = 8,320 records, zero PII), calibrated against WHO, UNICEF Supply Division Catalogue, and US EPA WARM public references.
- **Validation**: Strict chronological splits (72 train / 16 validation / 16 holdout test weeks) preventing future data leakage.
- **Verified Holdout Benchmark (80 Series)**: Ridge Regression (Lag + Fourier) achieved **7.44% average Test WAPE** (MAE 3.31, RMSE 4.08), outperforming the 4-Week Moving Average baseline (8.06% WAPE, MAE 3.73) and selected in 50/80 series.

### Economic & Environmental Impact
Metrics distinguish observed demonstration ledger entries, model predictions, simulated redistribution outcomes and estimated environmental benefits. Scenario results are estimates based on synthetic inputs and model assumptions, not proven savings or measured real-world environmental outcomes. Estimated net emissions account for assumed material emission factors and courier transit emissions.

### Team Fields & Submission Readiness (Complete Prior to Portal Lock)
- **Team number**: 354
- **Registered Team Name**: *[Confirm before submission]*
- **Contributor Names**: *[Confirm before submission]*
- **Public GitHub Repository URL**: *[Publish public repo & paste verified URL]*
- **Public Deployed Application URL**: https://ecomatch.tgpu.tech (Cloudflare deployment reported successful; signed-out Explore Live Demo end-to-end workflow remains unverified.)
- **Compiled 12-Slide Presentation PDF**: *[Export `docs/pitch-deck-12-slides.md` to PDF]*
- **Demonstration Video (<10 MB MP4)**: *[Record per `docs/demo-video-storyboard.md`]*
