# CO-SAFE Connect – Quick Start Manual

---

## 1. Overview

**What is the CO Monitor App and What Does It Do?**

CO-SAFE Connect is a real-time mobile app that monitors carbon monoxide (CO) levels in your vehicle via a wireless sensor. It alerts you when CO becomes dangerous (from exhaust leaks, bad ventilation, or idling), tracks historical trends, and works offline.

The app displays live CO readings on a visual gauge, automatically notifies you of unsafe levels, records all data for medical reference, and provides emergency contact features—all in a Progressive Web App that installs like a native mobile app.

---

## 2. Prerequisites

**What Basic Knowledge or Tools Are Needed Before Using CO-SAFE?**

You need: (1) CO-SAFE hardware pre-installed in your vehicle, (2) a smartphone/tablet with iOS 12+ or Android 8+, and (3) a WiFi network for initial setup only (app works offline afterward).

Basic knowledge: understanding what ppm (parts per million) means, how to use smartphone WiFi connections, and awareness that CO is a colorless, odorless toxic gas. No technical expertise required.

---

## 3. Quick Tour of the CO Monitor App

**What Information Can Users See on the Main Dashboard?**

The Dashboard shows a large circular gauge with your current CO level, color-coded status (green=safe 0-24 ppm, yellow=warning 25-49 ppm, red=critical 50+ ppm), device connection status, battery level, and a timestamp of the last reading.

One-tap buttons let you start/stop monitoring sessions, call emergency services, and toggle demo mode for testing without hardware.

**How Can Users Access Data Logs, Alerts, and Settings in the App?**

Four tabs at the bottom navigate between Dashboard (current status), Alerts (active/acknowledged warnings with timestamps), Analytics (CO trends over 1h/24h/7d with charts and avg/max/min stats), and Settings (customizable thresholds, emergency contact, notifications on/off, dark mode).

All tabs are accessible from anywhere in the app and data persists across sessions via offline storage.

---

## 4. CO Monitor App Assumptions

**What Assumptions Does the System Make About Device Setup and Environment?**

The system assumes: (1) hardware is mounted inside the cabin with good air circulation, (2) WiFi is available at vehicle location for setup and periodic syncing, (3) sensor was calibrated in fresh air before use, and (4) vehicle operates in normal temperature ranges (32°F–122°F).

It also assumes your vehicle's exhaust system is the primary CO source and that cabin ventilation normally functions.

**What User Behavior Is Expected for Accurate CO Readings?**

Users should acknowledge alerts when they appear, start/stop monitoring sessions when driving/parking, and check analytics weekly for patterns. If a CRITICAL alert appears (red, >50 ppm), open windows immediately and seek service or emergency help.

Expected readings: <25 ppm normal driving, 25-49 ppm indicates gradual exhaust leak (schedule service), 50+ ppm indicates serious problem (do not drive, call for help).

---

## 5. AI Analyses

**How Does the AI Analyze CO Levels and Detect Unusual Patterns?**

CO-SAFE uses **OpenRouter API** to power AI analysis. The app sends your CO reading history, device metadata, and detected patterns to OpenRouter's AI models (Grok and other available models) which analyze trends and generate personalized reports.

The AI detects anomalies (sudden spikes), identifies patterns (CO higher in cold mornings = cold-start issue vs. high idling = ventilation problem), predicts when you'll hit warning threshold, and correlates CO with driving conditions (highway vs. city, temperature, time of day).

**What Insights or Recommendations Does the AI Provide to Users?**

OpenRouter AI generates personalized reports including: health risk assessment ("Your vehicle is safe for normal use" vs. "Get immediate inspection"), maintenance predictions ("Exhaust leak likely in 2-3 weeks based on trend"), cost/timeline estimates, and a personalized vehicle safety score (0-100).

Example: "Your readings climbed 20→45 ppm over 3 weeks. Pattern matches cracked exhaust pipe. Estimated repair: $400-800. Recommended: Schedule service this week." All analysis is stored in the `sessions.ai_analysis` database field and shown to users in future releases.

---

## Quick Reference

| Status | CO Level | Action |
|--------|----------|--------|
| 🟢 Safe | 0-24 ppm | Normal operation |
| 🟡 Warning | 25-49 ppm | Plan vehicle service soon |
| 🔴 Critical | 50+ ppm | Open windows, exit vehicle, call 911 |

**Key Points:**
- App works offline after setup but syncs when WiFi returns
- AI analysis via OpenRouter requires at least 2 weeks of data to be accurate
- All data is stored locally (localStorage) and in Supabase cloud
- Monitoring sessions track readings and generate AI analysis reports

---

**Version:** 1.0 | **Updated:** November 16, 2025
