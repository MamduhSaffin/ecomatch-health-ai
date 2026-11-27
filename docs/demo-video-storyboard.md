# EcoMatch Health AI — Demonstration Video Production & Encoding Specification

- **Target Format**: MP4 (H.264 / AAC)
- **Strict Competition Size Cap**: ≤ 10.0 MB (Target: **≤ 9.0 MB** for safety margin)
- **Target Duration**: 75 seconds (1280×720 @ 30fps)
- **Status**: Outstanding — requires live screen capture of deployed application and voiceover recording.

---

## Scene-by-Scene Storyboard & Narration Script (75s)

| Time | Screen / Module | Visual Action | Voiceover Script |
| :--- | :--- | :--- | :--- |
| 0:00–0:10 | Public Showcase Hero | Pan over headline, 4-KPI strip & animated SVG network map | "Every day, hospitals discard expiring medical supplies while clinics kilometres away face critical shortages. Meet EcoMatch Health AI—built for UN SDG 12." |
| 0:10–0:18 | Click **Explore Live Demo** | Enter Judge Demo Mode (no signup); show 12-step stepper | "With one click, judges enter our isolated live sandbox powered by six interconnected intelligence engines." |
| 0:18–0:30 | Predictive Analytics Lab | Show Recharts 12-week forecast + 95% confidence band & model comparison table | "Engine A evaluates four chronological forecasting models across 80 facility-SKU series, beating the moving-average baseline with Ridge Lag-Fourier regression at 7.44% holdout WAPE." |
| 0:30–0:42 | Inventory Intelligence | Expand batch `BCH-IVS-2601` at Metropolitan General Hospital | "Engine B applies FEFO depletion to flag 44-day near-expiry IV infusion sets with an explainable 4-factor risk score." |
| 0:42–0:56 | Resource Exchange Marketplace | Expand 5-factor match score; show Ineligible Audit blocking recalled/expired lots; click **Propose Transfer** → **Approve Transfer** | "Engine C blocks recalled and expired lots automatically, scores eligible corridors from 0 to 100, and requires human approval before executing any transfer." |
| 0:56–1:07 | Scenario Simulation & Sustainability Impact | Slide demand surge & show Baseline vs Optimised bar chart & CO2e methodology | "Engine D and E quantify avoided procurement, kilograms diverted from waste, and net avoided CO2e—even under supply disruptions." |
| 1:07–1:15 | Command Centre & AI Agent | Show updated KPIs + Engine F cited response | "EcoMatch Health AI: Predict Waste. Redistribute Resources. Expand Healthcare Capacity." |

---

## Verified FFmpeg Compression Command (Guarantees < 9.5 MB)

```bash
ffmpeg -i raw_recording.mp4 \
  -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" \
  -r 30 -c:v libx264 -preset slow -b:v 780k -maxrate 850k -bufsize 1700k \
  -c:a aac -b:a 96k -movflags +faststart \
  submission/ecomatch-health-ai-demo.mp4

# Verify file size is strictly < 10,000,000 bytes:
ls -lh submission/ecomatch-health-ai-demo.mp4
```
