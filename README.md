
<h1 align="center">🛡️ Visa Sponsorship Detector</h1>

<p align="center">
  <em>Because no international student should waste time applying to jobs that will never sponsor them.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/manifest-v3-blue?style=flat-square" alt="Manifest V3"/>
  <img src="https://img.shields.io/badge/platform-LinkedIn%20%7C%20Indeed%20%7C%20Greenhouse-0A66C2?style=flat-square" alt="LinkedIn, Indeed & Greenhouse"/>
  <img src="https://img.shields.io/badge/zero%20API%20calls-offline%20ready-00c853?style=flat-square" alt="Offline Ready"/>
  <img src="https://img.shields.io/badge/response-~150ms-ff6d00?style=flat-square" alt="~150ms"/>
</p>

---

## 📖 The Story

If you're an international student in the US, you know the drill.

You open LinkedIn. You see a dream role — perfect title, perfect company, perfect tech stack. Your heart races. You click. You scroll through the entire job description, reading every word, searching for that one sentence. *"Will this company sponsor my visa?"*

Sometimes it's buried in the last paragraph. Sometimes it says *"must be authorized to work without sponsorship"* — and just like that, the last 5 minutes were wasted. Sometimes there's **no mention at all**, and you're left guessing.

Now multiply that by **hundreds of applications**. Every single one. Scroll, search, hope, repeat.

**I built this because I was tired of it.**

Visa Sponsorship Detector is a Chrome extension that **instantly tells you** whether a job will sponsor your visa — the moment you click on the listing. No scrolling. No guessing. No wasted time.

---

## ⚡ What It Does

The extension runs **entirely in your browser** — no servers, no API calls, no data leaving your machine. When you open a job listing on LinkedIn or Indeed, it:

1. **Scans the job description** for sponsorship language (positive, negative, or requirements)
2. **Checks the company** against a curated list of known H-1B sponsors (big tech companies that always sponsor but don't always say so)
3. **Extracts the tech stack** from the JD so you can quickly see if your skills match
4. **Shows a vibrant floating badge** with the verdict in under 150ms



| Badge | Meaning |
|---|---|
| 🟢 **Sponsors Visa** | JD explicitly mentions sponsorship, or company is a known sponsor |
| 🔴 **No Sponsorship** | JD explicitly says no sponsorship or requires US citizenship |
| 🟣 **No Mention** | JD doesn't mention sponsorship and company isn't in the known list |

**Click the badge** to expand into a detail panel:


- Job title, company, posted date with freshness indicator (🔥 Hot / 🟠 Warm / 🧊 Cold)
- **Tech Stack** — keywords extracted from the JD as colored tags
- **JD Preview** — expandable 2-sentence summary
- **Actions** — Copy JD, Show More, Open Job in new tab

---

## 🧠 How It Works

```
┌─────────────────────────────────────────────────────────┐
│                    Job Page Loaded                       │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
            ┌─────────────────────┐
            │   meta.js extracts  │
            │  title, company,    │
            │  date, full JD text │
            └─────────┬───────────┘
                      │
                      ▼
           ┌──────────────────────┐
           │  detector.js scans   │
           │  JD for sponsorship  │
           │  phrases (pos/neg)   │
           └─────────┬────────────┘
                     │
          ┌──────────┴──────────┐
          │ No mention found?   │
          │                     │
          ▼                     ▼
   ┌──────────────┐    ┌───────────────┐
   │ sponsors.js  │    │ Result: yes   │
   │ checks if    │    │ or no         │
   │ known company│    └───────────────┘
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │ keywords.js  │
   │ extracts     │
   │ tech stack   │
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │   ui.js      │
   │ renders      │
   │ vibrant      │
   │ badge/panel  │
   └──────────────┘
```

### Detection Logic

The detector uses **three phrase lists** with regex word-boundary matching:

- **Positive phrases** — `"visa sponsorship"`, `"will sponsor"`, `"h1b"`, `"work visa"`, etc.
- **Negative phrases** — `"without sponsorship"`, `"will not sponsor"`, `"unable to sponsor"`, etc.
- **Requirement phrases** — `"must be a us citizen"`, `"permanent resident"`, `"security clearance"`, etc.

It also checks **context** — if a positive phrase appears near a negation word (e.g., *"we do **not** provide visa sponsorship"*), it correctly classifies it as negative.

### Known Sponsors Database

~80 big tech companies that regularly sponsor H-1B visas but don't always mention it in JDs:

> Google, Meta, Amazon, Apple, Microsoft, Netflix, NVIDIA, Tesla, Uber, Airbnb, Salesforce, Adobe, Oracle, Intel, Stripe, Shopify, OpenAI, Anthropic, DeepMind, Waymo, SpaceX, and many more.

### Tech Stack Extraction

A local dictionary of **~160 tech terms** (languages, frameworks, databases, cloud platforms, tools) matched against the JD text. No NLP, no API calls — just fast regex matching. Results displayed as colored tags.

---

## 🚀 Installation

1. **Clone the repo**
   ```bash
   git clone https://github.com/GokulNaveen2708/visa-sponsorship-detector.git
   ```
2. **Open Chrome** → navigate to `chrome://extensions`
3. **Enable Developer Mode** (toggle in top-right)
4. **Click "Load unpacked"** → select the `VisSponsorship` folder
5. **Open LinkedIn or Indeed** → browse job listings → see the magic ✨

---

## 🏗️ Architecture

```
VisSponsorship/
├── manifest.json          # Chrome extension manifest (MV3)
├── background.js          # Service worker — handles toolbar click
├── options.html           # Options page for custom keywords
├── src/
│   ├── utils.js           # Debounce, text normalization, regex helpers
│   ├── meta.js            # Job metadata extraction (title, company, date, full JD)
│   ├── sponsors.js        # Known H-1B sponsor company database
│   ├── detector.js        # Sponsorship phrase detection engine
│   ├── keywords.js        # Tech keyword extraction dictionary (~160 terms)
│   ├── ui.js              # Vibrant badge + glassmorphism panel (Shadow DOM)
│   ├── observer.js        # SPA navigation detection + MutationObserver
│   └── inject.js          # Bootstrap, orchestration, caching, health checks
├── icons/                 # Extension icons
└── assets/                # README images
```

### Key Design Decisions

| Decision | Why |
|---|---|
| **Shadow DOM** for UI | Complete style isolation from LinkedIn/Indeed's CSS |
| **No external API calls** | Zero latency, works offline, no data privacy concerns |
| **Result caching by job ID** | Instant response when revisiting a job |
| **MutationObserver with self-mutation guard** | Detects SPA page changes without creating infinite loops |
| **Debounced rescan (150ms)** | Fast enough to feel instant, slow enough to batch rapid DOM changes |
| **Content script (not injection)** | More reliable than `chrome.scripting.executeScript` on LinkedIn's CSP |

---

## ⚙️ Customization

### Add Custom Keywords

1. Right-click the extension icon → **Options**
2. Add comma-separated keywords (e.g., `immigration, green card, ead`)
3. Click **Save** — these get added to the positive detection phrases

---

## 🤝 Contributing

This project was born from frustration and built with love. If you're an international student and have ideas to make it better:

- **New sponsor companies?** → Add them to `src/sponsors.js`
- **Missing tech keywords?** → Add them to `src/keywords.js`
- **New job platform support?** → Add selectors to `src/meta.js` and `src/detector.js`
- **Bug reports?** → Open an issue

---

## 📄 License

 use it, fork it, make it yours.

---

<p align="center">
  <strong>Built for every international student who just wants a fair shot. 🌍</strong>
</p>
