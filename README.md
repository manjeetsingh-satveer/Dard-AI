# Dard AI — ਦਰਦ | Diagnose the Mystery. Predict the Storm.

## Inspiration

My father has been in pain every single day for years.

Not occasional pain. Not manageable pain. Constant, debilitating stomach pain that has no name, no cause, and no end. We flew him to doctors in India, Myanmar, and Thailand. We spent money we didn't have on consultations, scans, and procedures. Endoscopies. CT scans. Ultrasound after ultrasound. Blood panels that ran dozens of markers.

Every single test came back normal.

"Your tests are normal" sounds like good news. It isn't. It means you go home the same way you came — except now you're poorer, more exhausted, and carrying the weight of being told the pain isn't in the data, even though it's very much in your body.

My father is not alone. **Over 300 million people worldwide** live in this exact space — the gap between "tests are normal" and "I am healthy." The average time to a correct diagnosis for a chronic condition is **4.8 years**. The average cost before finding answers is **$10,000+**. And a significant portion of those people never get a diagnosis at all.

ਦਰਦ means **pain** in Punjabi. I built this for him, and for every person who has sat in a waiting room, handed over a stack of reports, and been told to come back in six weeks.

## What It Does

Dard AI is a dual-track AI health intelligence platform.

### Track 1 — The Undiagnosed

A deep 5-step symptom profiling system that asks the questions your doctor doesn't have time to ask in a 10-minute appointment.

- Collects symptom character, location, radiation, timing, frequency, triggers, and relievers
- Cross-references symptom profiles against commonly missed conditions — especially those that standard GPs under-diagnose (fibromyalgia, SIBO, celiac, POTS, endometriosis, H. pylori)
- Identifies test gaps — tests that are clinically relevant to your symptom profile but haven't been ordered yet
- Recommends specialist types with specific clinical justifications
- Generates a **structured doctor-ready PDF report**  organized symptom history, condition probability analysis, and a prioritized next-step action plan

### Track 2 — Flare Prediction

A daily check-in system powered by the **DFRS (Dard Flare Risk Score)**  a proprietary 8-factor weighted algorithm that gives chronic illness patients a daily risk score, like a weather forecast for their body.

- Tracks sleep, pain level, fatigue, stress, medication adherence, food, and mood
- Automatically fetches live local barometric pressure, humidity, temperature, and wind speed
- Calculates a risk score from 0–10 with a full breakdown showing exactly which factors are contributing and by how much
- Generates a pre-flare action plan and a 24–48 hour outlook

## The Algorithm: DFRS

This is the technical core of Dard AI, and it deserves a proper explanation.

Most health apps show you data. DFRS converts data into a clinically-grounded risk number — and tells you exactly how it got there.

### Core Formula

```
DFRS = 10 × [ Σ(wᵢ · xᵢ) / Σwᵢ ]
```

Where `wᵢ` is the clinical weight of factor i, and `xᵢ` is the normalized value (0.0–1.0). Output is a score from **0 to 10**.

### Factor Weights

| Factor | Weight | Calculation | Research Basis |
|--------|--------|-------------|----------------|
| Sleep deficit (below 7h) | **2.5×** | `max(0, 7 − hrs_slept)` | CDC: sleep deprivation is the #1 chronic illness trigger |
| Barometric pressure drop | **2.0×** | `max(0, (1013 − hPa) / 10)`, capped at 3.0 | BMC Musculoskeletal Disorders: low pressure increases joint & fibromyalgia pain |
| Self-reported pain (VAS) | **1.8×** | `score / 10` | Standard Visual Analogue Scale |
| Stress level | **1.5×** | `score / 10` | Segerstrom & Miller, 2004: stress amplifies the inflammatory cascade |
| Missed medication dose | **1.5×** | Binary: 0 or 1 | Non-adherence is the strongest independent flare predictor in RA studies |
| Fatigue level | **1.2×** | `score / 10` | Validated secondary signal in fibromyalgia scoring systems |
| High humidity (>70%) | **0.8×** | Binary: `humidity > 70 ? 1 : 0` | AMS 2020: humidity above normal correlates with reported pain spikes |
| Skipped meals | **0.7×** | Binary: 0 or 1 | Blood sugar instability triggers the inflammatory cascade |

**Σwᵢ = 12.0**

### Sub-Formula 1: Rolling Sleep Debt

```
S_avg  = (n₁ + n₂ + n₃) / 3      ← 3-day rolling average
S_debt = max(0, 7 − S_avg)
S_risk = S_debt × 2.5
```

*One bad night is noise. Three consecutive nights of poor sleep is a signal. The rolling average catches cumulative debt that a single-night snapshot misses.*

### Sub-Formula 2: Barometric Pressure Contribution

```
P_raw  = max(0, (1013 − current_hPa) / 10)
P_risk = min(P_raw, 3.0) × 2.0
```

*A 990 hPa storm system: P_raw = (1013 − 990) / 10 = 2.3, contributing +4.6 to the weighted sum. The cap at 3.0 prevents atmospheric pressure from dominating the score on extreme weather days.*

### Sub-Formula 3: Condition Match Confidence (Undiagnosed Track)

Inspired by the Framingham Risk Score methodology:

```
raw_match   = matched_clinical_markers / total_possible_markers
gap_penalty = (1 − test_coverage_ratio) × 0.4
confidence  = raw_match × (1 − gap_penalty)
```

*A patient matching 80% of fibromyalgia markers but who has completed 0 fibromyalgia-relevant tests has a `gap_penalty` of 0.4, reducing their confidence from 0.80 to 0.48. This prevents false confidence in unverified pattern matches.*

### Sub-Formula 4: SHAP-Inspired Score Explainability

Every DFRS score is decomposed using marginal contribution:

```
φᵢ = f(S ∪ {i}) − f(S)
DFRS_explained = Σᵢ φᵢ
```

This means every score the app generates shows the user exactly: *"Sleep contributed +2.8, pressure contributed +1.9, stress contributed +1.2..."* — not a black box number with no context.

### Risk Scale

| Score | Level | What It Means |
|-------|-------|---------------|
| 0–2.9 | 🟢 Low | Minimal risk. Maintain current routine. |
| 3–4.9 | 🟡 Moderate | Some risk factors present. Monitor closely. |
| 5–6.9 | 🟠 Elevated | Multiple risk factors active. Pre-emptive action recommended. |
| 7–8.9 | 🔴 High | Strong flare indicators. Rest, medication review, contact care team. |
| 9–10 | 🚨 Critical | Near-certain flare. Immediate intervention. |

## How We Built It

**Frontend:** HTML, CSS, JavaScript delivered as a single self-contained file with zero backend dependencies.

**AI Engine:** Claude (`claude-sonnet-4-20250514`) via the Anthropic API. The undiagnosed track sends a structured symptom profile and requests a JSON-formatted clinical analysis. The flare track sends daily check-in data with the DFRS calculation included, and requests a full breakdown, action plan, and outlook.

**Weather:** Open-Meteo API (free, no key required). Fetches `surface_pressure`, `relative_humidity_2m`, `temperature_2m`, `wind_speed_10m`. Auto-fetches on check-in load with a GPS-first → IP geolocation fallback chain so weather data works even when location permission is denied.

**PDF:** jsPDF + jspdf-autotable, loaded from CDN. Generates clinical-grade reports with formula notation, breakdown tables, and properly formatted action plans.

**Why a single HTML file?** Zero deployment friction. Judges can open it instantly. Everything is client-side and auditable. No server costs, no CORS issues, no cold-start delays.

## The Challenges

**The hardest challenge was the apostrophe.**

One unescaped `'` character inside a single-quoted JavaScript array (`'Crohn's Disease'`) silently crashed the entire `<script>` block on page load. Every button. Every form. Every animation. Dead. Zero console errors because the crash happened at parse time. I spent two hours on this.

The fix was one character: `'Crohn\u2019s Disease'`. Two hours of debugging for a Unicode apostrophe.

**The second hardest challenge was responsible AI in healthcare.**

Getting Claude to produce genuinely useful clinical analysis without tipping into diagnosis territory required careful prompt engineering. The key was framing: the AI is not identifying *what you have* — it's identifying *what questions are worth asking* and *what tests have been missed*. That framing shift changed everything about how the outputs read.

**The third challenge was making the weather feel real.**

Raw barometric pressure numbers mean nothing to most users. The breakthrough was translating `990 hPa → +2.3 DFRS points → "This storm system is significantly increasing your flare risk today."` When the weather data becomes a number in their personal risk score rather than a meteorological data point, it's suddenly meaningful.

## What We Learned

**Technically:** IP geolocation (`ipapi.co`) as a GPS fallback takes ~200ms and dramatically improves the user experience for the majority of users who deny location permission. Weighted scoring algorithms are underrated in hackathon projects — they produce transparent, explainable outputs that black-box models can't match.

**About healthcare:** The gap between "tests are normal" and "you are healthy" is where most undiagnosed patients live. The system is not designed for chronic mystery conditions — it's designed for acute problems with clear answers. Dard AI doesn't try to fix that system. It helps patients navigate it better.

**About building:** The personal story is the product. The DFRS formula is technically interesting, but what makes someone actually care about Dard AI is a single sentence: *"My father has had unexplained stomach pain for years. We saw doctors in three countries. Every test was normal."* That communicates the problem faster than any feature list.

## What's Next

- **Longitudinal tracking** — DFRS trend graphs over 30/90 days to surface long-term patterns
- **Condition-specific profiles** — separate weight sets tuned for Crohn's, fibromyalgia, Lupus, MS
- **Wearable integration** — HRV and sleep data from Apple Watch and Oura Ring feeding directly into DFRS
- **Multilingual support** — starting with Punjabi, Hindi, and Tagalog, communities where patients frequently fall through diagnostic gaps
- **Doctor-facing portal** — so physicians can review patient-generated reports before appointments, not during them


## Built With

`HTML` `CSS` `JavaScript` `Claude AI (Anthropic)` `Open-Meteo API` `ipapi.co` `jsPDF` `jspdf-autotable`

## Closing

My father still doesn't have a definitive diagnosis.

But the next time he sees a doctor, he'll walk in with a 4-page clinical report  organized symptom history, condition probability analysis, test gap assessment, and a DFRS breakdown showing exactly how his sleep, stress, weather, and medication patterns are interacting.

Dard AI doesn't replace the doctor.

It makes the appointment worth something.


*ਦਰਦ — Pain. Hope. Answers.*

> *"The most important thing in medicine is not the drug or the surgery. It is the patient who walks in and says: this is what is happening to me."*
