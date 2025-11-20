# CO-SAFE Connect – User Manual & Quick Start Guide

---

## 1. Overview

### What is the CO Monitor App and What Does It Do?

CO-SAFE Connect is a real-time **carbon monoxide (CO) monitoring application** that protects you and your passengers from CO poisoning in vehicles. It displays live CO measurements on your phone/tablet, automatically alerts you when levels become dangerous, tracks historical trends, and works completely offline if needed.

**Core Purpose:**
Monitor dangerous CO gas buildup caused by:
- Exhaust system leaks
- Faulty cabin ventilation
- Prolonged idling in enclosed spaces
- Damaged mufflers or catalytic converters

**Main Functions:**

| Feature | What It Does | Why It Matters |
|---------|-------------|----------------|
| **Live Monitoring** | Shows current CO level with visual gauge | Immediate awareness of air quality |
| **Safety Alerts** | Notifications when CO exceeds warning/critical levels | Early warning before symptoms appear |
| **Historical Analytics** | Charts showing CO trends over time | Identify recurring exposure patterns |
| **Emergency Response** | One-tap emergency contact dialing | Quick help when CO levels are critical |
| **Offline Mode** | Works without WiFi after initial setup | Monitoring continues if connection drops |
| **Data Logging** | Records every reading with timestamps | Medical evidence if exposure occurs |

**Typical Use Case:**
A driver notices unusual headaches during commutes. They install the CO-SAFE hardware kit, open the app on their phone, and discover their vehicle's exhaust system is leaking. The app's continuous monitoring and alerts prevent serious harm.

---

## 2. Prerequisites

### What Basic Knowledge or Tools Are Needed Before Using CO-SAFE?

#### **Required Equipment**
1. **CO-SAFE Hardware Kit** (must be pre-installed in vehicle)
   - ESP8266 microcontroller (NodeMCU 1.0)
   - MQ7 carbon monoxide sensor
   - IRLZ44N MOSFET transistor
   - Power supply (12V vehicle power or external 5V USB)
   - Mounting enclosure

2. **Mobile Device** (smartphone or tablet)
   - iOS 12+ or Android 8+
   - At least 50MB free storage
   - Modern browser (Chrome, Safari, Firefox)
   - Recommended: 2GB+ RAM for smooth performance

3. **Home WiFi Network** (for initial setup only)
   - 2.4 GHz WiFi (5 GHz may have range issues in vehicles)
   - WiFi password (WPA2 or WPA3 encryption)
   - Network accessible from your vehicle's parking location

#### **Basic Knowledge Required**
- How to connect to WiFi networks on your device
- Understanding of ppm (parts per million) - a unit measuring gas concentration
- Basic awareness of CO dangers (colorless, odorless, toxic gas)
- Ability to navigate mobile app menus and settings

#### **Helpful (But Not Required)**
- Basic understanding of how to read graphs/charts
- Familiarity with smartphone notifications
- Knowledge of your vehicle's age and maintenance history (to contextualize CO readings)

#### **Pre-Installation Checklist**
- [ ] CO-SAFE hardware already installed and tested
- [ ] WiFi credentials for home network available
- [ ] Emergency contact phone number noted
- [ ] Device has enough storage (check with Settings)
- [ ] Latest browser version installed
- [ ] Understood basic CO safety (symptoms, dangers)

---

## 3. Quick Tour of the CO Monitor App

### What Information Can Users See on the Main Dashboard?

#### **Dashboard Screen** (Home / First Tab)

When you open the app, the Dashboard is your landing screen. It displays:

**Central Gauge Display:**
```
     ┌─────────────────┐
     │  CO LEVEL: 25   │
     │        ppm      │
     │    ╱──●─╲       │
     │   │ SAFE │      │  ← Color-coded status
     │    ╲────╱       │
     └─────────────────┘
```
- **Large circular gauge** showing current CO level in ppm
- **Color coding:**
  - 🟢 **Green** (0-24 ppm) = SAFE
  - 🟡 **Yellow** (25-49 ppm) = WARNING
  - 🔴 **Red** (50+ ppm) = CRITICAL
- **Animated needle** that moves in real-time as readings update

**Device Status Card:**
```
┌─────────────────────────────┐
│ Device Status               │
├─────────────────────────────┤
│ 📡 Connection: ONLINE       │
│ 🔋 Battery: 85%             │
│ 🔧 Filter Health: 92%       │
│ ⏱️  Last Update: 32 seconds  │
└─────────────────────────────┘
```
Shows hardware status at a glance.

**Environmental Information:**
- Timestamp of last reading (exact date/time)
- Session duration (if monitoring is active)
- Device name (e.g., "CO-SAFE Monitor - Toyota Corolla")

**Quick Action Buttons:**
- **🚨 Emergency Call** – Dial emergency contact (default 911) with one tap
- **▶️ Start Monitoring** / **⏹️ Stop Monitoring** – Begin/end a monitoring session
- **Demo Mode Toggle** – (For testing without hardware)

---

### How Can Users Access Data Logs, Alerts, and Settings?

#### **Tab Navigation** (Bottom of Screen)

The app has 4 main tabs for accessing different features:

```
┌─────────────────────────────────────┐
│                                     │
│  [Dashboard] [Alerts] [Analytics] [Settings]
│
└─────────────────────────────────────┘
```

**Tab 1: Dashboard** (Home)
- Current CO reading
- Device status
- Emergency actions
- Session controls

**Tab 2: Alerts** (⚠️ Notifications)

Shows all past and current safety alerts:

```
┌─────────────────────────────────────┐
│ ACTIVE ALERTS (3)                   │
├─────────────────────────────────────┤
│ 🔴 CRITICAL - CO: 52 ppm             │
│    Mar 15, 2:34 PM                  │
│    [Acknowledge]                    │
│                                     │
│ 🟡 WARNING - CO: 38 ppm              │
│    Mar 15, 1:15 PM                  │
│    [Acknowledge]                    │
│                                     │
│ 🔴 CRITICAL - CO: 67 ppm             │
│    Mar 14, 5:22 PM                  │
│    [Acknowledge]                    │
├─────────────────────────────────────┤
│ ACKNOWLEDGED ALERTS (12)            │
│ (Swipe to view archived alerts)     │
└─────────────────────────────────────┘
```

**Actions:**
- View active (unacknowledged) alerts
- View acknowledged (archived) alerts
- Tap "Acknowledge" to mark alert as seen
- Timestamps show exact when alert triggered

**Tab 3: Analytics** (📊 Data Trends)

Historical data visualization:

```
┌─────────────────────────────────────┐
│ Time Range: [1 Hour] [24h] [7 Days] │
├─────────────────────────────────────┤
│                                     │
│  CO Level Trend (Area Chart):       │
│    70 ┤     ╱╲                      │
│    50 ┤    ╱  ╲__╱╲                 │
│    30 ┤   ╱       ╲    ╱╲           │
│    10 ┤__╱         ╲__╱  ╲__        │
│     0 └─────────────────────────    │
│       12pm 1pm  2pm  3pm  4pm       │
│                                     │
│ Statistics:                         │
│ • Average CO: 32 ppm                │
│ • Maximum CO: 67 ppm                │
│ • Minimum CO: 8 ppm                 │
│                                     │
│ Status Distribution:                │
│ 🟢 Safe: 78%  🟡 Warning: 18%        │
│ 🔴 Critical: 4%                     │
└─────────────────────────────────────┘
```

**Features:**
- Switch between 1-hour, 24-hour, or 7-day views
- See CO trend as an interactive line chart
- View average/max/min statistics
- Pie chart showing time spent in each safety zone
- Zoom/pan chart to see details

**Tab 4: Settings** (⚙️ Configuration)

Customize app behavior:

```
┌─────────────────────────────────────┐
│ SAFETY THRESHOLDS                   │
│ Warning Level: [▬▬▬●▬▬▬] 25 ppm    │
│ Critical Level: [▬▬▬▬▬●▬] 50 ppm    │
│                                     │
│ NOTIFICATIONS & SOUND               │
│ ☐ Enable Notifications              │
│ ☑ Enable Audio Alarms               │
│ ☑ Enable Haptic Vibration           │
│                                     │
│ EMERGENCY CONTACT                   │
│ Phone: [_____911_____________]      │
│ [📞 Test Call]                      │
│                                     │
│ APPEARANCE                          │
│ ☑ Dark Mode                         │
│                                     │
│ DEVICE INFO                         │
│ Device ID: CO-SAFE-001              │
│ Vehicle: Toyota Corolla 2020        │
│ Last Active: 2 min ago              │
│                                     │
│ DATA MANAGEMENT                     │
│ [📊 Export Data] [🗑️ Clear All]     │
└─────────────────────────────────────┘
```

**Customizable Options:**
- **Thresholds**: Adjust warning (25 ppm) and critical (50 ppm) levels
- **Alerts**: Turn notifications and sounds on/off
- **Contact**: Set emergency contact (default 911)
- **Theme**: Toggle dark mode
- **Data**: Export readings as JSON file or clear history

---

## 4. CO Monitor App Assumptions

### What Assumptions Does the System Make About Device Setup and Environment?

#### **Hardware Assumptions**

1. **WiFi Connectivity During Setup**
   - Device must have WiFi access at least once for initial configuration
   - Cannot set up hardware without internet
   - WiFi credentials are stored in device EEPROM (survives power cycles)

2. **Sensor Location & Mounting**
   - Sensor is positioned inside vehicle cabin (not engine compartment)
   - Mounting location has adequate air circulation
   - Sensor is not blocked by vents or obstructed by personal items

3. **Power Supply**
   - Device has continuous 5V power (via vehicle's 12V system or USB adapter)
   - Power is maintained even when vehicle is off (optional, for detection while parked)
   - Sufficient power budget for WiFi + sensor readings

4. **WiFi Range**
   - Home WiFi network reaches vehicle's parking location (typical range: 50-100 feet)
   - Garage/covered parking may reduce signal strength
   - Device can reconnect automatically if WiFi drops

#### **Environmental Assumptions**

1. **Air Quality Baseline**
   - "Clean air" is defined as 0-10 ppm CO at initial calibration
   - Sensor was calibrated in fresh air before deployment
   - Vehicle exhaust is primary CO source (not external sources like factories)

2. **Temperature & Humidity**
   - Operating range: 32°F to 122°F (0°C to 50°C)
   - Excessive heat/cold may affect reading accuracy
   - High humidity (>85%) may interfere with sensor response time

3. **Vehicle Operation Patterns**
   - Vehicle is primarily driven (not idle for hours)
   - Cabin ventilation system is functioning normally
   - Windows can be opened for fresh air (natural remediation)

#### **User Behavior Assumptions**

1. **Regular App Usage**
   - Users check app at least 1x per day (or have notifications enabled)
   - Users will respond to alerts by checking vehicle
   - Users understand "critical" alerts require immediate action

2. **Monitoring Session Management**
   - User starts a monitoring session when driving
   - User stops session when parking vehicle
   - Session can be left running indefinitely (no automatic timeout)

3. **Alert Responsiveness**
   - Users will acknowledge alerts after reviewing them
   - Users understand alert thresholds are customizable
   - Users know to open windows/exit vehicle if CRITICAL alert occurs

4. **Data Collection**
   - Readings are continuously collected during operation
   - Data persists across phone reboots and app crashes
   - Readings are not deleted unless user explicitly clears data

#### **System Assumptions**

1. **Network Reliability**
   - WiFi connectivity is intermittent but recovers (typical vehicle environment)
   - Supabase cloud database is accessible 99% of the time
   - 5-second app polling interval is sufficient for monitoring

2. **Sensor Accuracy**
   - MQ7 sensor is accurate within ±5% across 20-2000 ppm range
   - Exponential calibration curve from datasheet is correct
   - Sensor readings stabilize within 15 seconds of power-on

3. **Device Synchronization**
   - All devices show same time (via NTP sync)
   - Readings are timestamped accurately
   - Data stored in cloud matches local cache

---

### What User Behavior Is Expected for Accurate CO Readings?

#### **Best Practices for Accurate Monitoring**

1. **Initial Setup**
   - Calibrate sensor in fresh air (outdoors with no exhaust nearby)
   - Allow sensor 10 minutes to stabilize before relying on readings
   - Place device where cabin air naturally circulates

2. **During Operation**
   - Keep vehicle windows closed during testing (to detect exhaust leaks)
   - Allow 2-3 minutes of driving before interpreting readings
   - Avoid extreme temperature changes (warm car in cold garage)

3. **Alert Interpretation**
   - First alert: Moderate concern, check vehicle condition
   - Second alert same day: Service vehicle soon
   - Multiple CRITICAL alerts: Vehicle may be unsafe, seek service immediately

4. **Data Analysis**
   - Look for patterns (always high on cold mornings → exhaust leak)
   - High readings during idling vs. driving indicate issue severity
   - Consult analytics weekly to spot gradual increase

#### **Scenarios & Expected Behavior**

**Scenario 1: Normal Operation**
```
CO Level: 15 ppm
Status: SAFE (green)
Expected: Readings fluctuate 10-25 ppm based on traffic/ventilation
User Action: Continue normal operation, no alerts expected
```

**Scenario 2: Minor Issue**
```
CO Level: 35 ppm
Status: WARNING (yellow)
Expected: Alert appears, readings consistently 25-45 ppm
User Action: Acknowledge alert, schedule vehicle inspection
Timeline: Service within 1 week
```

**Scenario 3: Serious Problem**
```
CO Level: 60 ppm
Status: CRITICAL (red)
Expected: Alert appears with audio/vibration, readings consistently >50 ppm
User Action: Acknowledge alert, open windows immediately, exit vehicle
Timeline: Do NOT drive vehicle, seek immediate service or call emergency
```

**Scenario 4: Loss of Connection**
```
WiFi: Offline
Status: Offline indicator shown
Expected: App displays cached data, no new readings updating
User Action: Check WiFi connection, manually reconnect if needed
Timeline: App resumes normal operation when WiFi returns
```

---

## 5. AI Analyses

### How Does the AI Analyze CO Levels and Detect Unusual Patterns?

#### **Current State (Version 1.0)**

**Note:** AI analysis is a **planned future feature** not yet implemented. Current version provides:
- ✅ Real-time CO measurements
- ✅ Safety alerts (threshold-based)
- ✅ Historical trend charts
- ✅ Statistical summaries (avg/max/min)

#### **Planned AI Capabilities (Future Release)**

**Anomaly Detection:**
The AI will learn your vehicle's baseline CO patterns:
```
Example:
Monday 8am commute: average 18 ppm
Monday 8am WEEK 2: average 45 ppm ← Anomaly detected!
AI: "Unusual spike detected on this route. Vehicle exhaust system may have deteriorated."
```

**Pattern Recognition:**
AI identifies correlations:
- **Temperature Effect**: "CO increases 15% in cold mornings (engine cold start)"
- **Time-Based Pattern**: "CO is 25% higher during rush hour (slow traffic)"
- **Vehicle Behavior**: "CO spikes only when AC is on (cabin circulation issue)"

**Predictive Alerts:**
AI predicts maintenance needs:
```
Current Trend:
Week 1: Average 20 ppm
Week 2: Average 25 ppm
Week 3: Average 31 ppm
Week 4: Average 38 ppm (trending toward warning threshold)

AI Prediction:
"At current trend, you will reach WARNING threshold in 2 weeks.
Recommend preventive exhaust inspection."
```

### What Insights or Recommendations Does the AI Provide to Users?

#### **Planned AI-Generated Insights**

1. **Health & Safety Recommendations**
   ```
   "Your readings have been stable (avg 22 ppm).
    No action needed. Vehicle is safe for normal use."
   ```
   vs.
   ```
   "Critical readings detected (3 times this week).
    Recommend immediate mechanic inspection.
    Do not use vehicle for extended driving until repaired."
   ```

2. **Maintenance Alerts**
   ```
   "CO levels increasing gradually (20→35 ppm over 2 months).
    Possible issues:
    • Cracked exhaust pipe
    • Worn catalytic converter
    • Damaged cabin seal

    Recommended: Get professional vehicle inspection."
   ```

3. **Usage-Based Insights**
   ```
   "Your highway driving shows higher CO (avg 28 ppm)
    vs. city driving (avg 16 ppm).

    This is normal due to engine load differences.
    No concern indicated."
   ```

4. **Cost & Timeline Predictions**
   ```
   "Based on degradation rate:
    • Issue severity: MODERATE
    • Time until CRITICAL: ~3-4 weeks
    • Estimated repair cost: $400-800 (exhaust work)
    • Recommended action: Schedule service this week"
   ```

5. **Personalized Safety Score**
   ```
   Your Vehicle Safety Score: 78/100

   Breakdown:
   • Exhaust system health: 75/100
   • Cabin ventilation: 85/100
   • Overall air quality: 78/100

   Trend: Declining (↓2% this week)
   ```

#### **AI Learning Process**

AI will require:
- **Minimum 2 weeks** of data collection (to establish baseline)
- **Regular monitoring** (at least 3 readings/day)
- **Maintenance logs** (user notes when vehicle is serviced)
- **Environmental context** (temperature, driving patterns, vehicle age)

Once trained, AI provides:
- ✅ Confidence scores ("This anomaly is 87% likely to indicate exhaust leak")
- ✅ Explanations ("Here's why we think X is happening")
- ✅ Alternative hypotheses ("Could also indicate Y")
- ✅ Next steps ("Try Z to confirm")

#### **Example AI Report** (Future)

```
═══════════════════════════════════════════════════
         WEEKLY CO ANALYSIS REPORT
        Generated: March 15, 2025
═══════════════════════════════════════════════════

SUMMARY
Your vehicle shows normal CO levels this week with
one anomaly detected on March 12.

KEY METRICS
├─ Average CO: 22 ppm (SAFE, down from 25 last week)
├─ Peak CO: 58 ppm (CRITICAL - March 12, 2pm)
├─ Safe time: 94% of monitoring period
├─ Time in Warning zone: 5%
└─ Time in Critical zone: 1%

ANOMALIES DETECTED
🔴 March 12, 2:00-2:15 PM
   CO spiked to 58 ppm during 10-minute drive

   Hypothesis: Engine cold start + heavy traffic
   Confidence: 72%

   Alternative: Possible brief exhaust leak
   Confidence: 23%

   Recommendation: Monitor next few drives. If spike
   repeats, schedule exhaust inspection.

TREND ANALYSIS
Overall Health: ↓ Declining 2% this week
├─ Positive: Cold-start performance improved
├─ Negative: Idling CO levels slightly elevated
└─ No critical concerns at this time

PERSONALIZED INSIGHTS
Based on your driving patterns:
• City driving: 16 ppm avg (excellent)
• Highway driving: 28 ppm avg (acceptable)
• Idling: 35 ppm avg (monitor)

NEXT ACTIONS
☐ Continue normal monitoring
☐ Watch for March 12 anomaly to repeat
☐ Schedule routine maintenance (oil change due)

CONFIDENCE LEVEL: 81%
This analysis is based on 47 readings over 7 days.
═══════════════════════════════════════════════════
```

---

## Quick Reference

### Emergency Response Guide

| Situation | Indicator | Action |
|-----------|-----------|--------|
| **Normal Driving** | 🟢 Green (0-24 ppm) | Continue normal operation |
| **Minor Issue** | 🟡 Yellow (25-49 ppm) | Acknowledge alert, plan vehicle service |
| **Serious Problem** | 🔴 Red (50+ ppm) | Open windows, exit vehicle, seek service |
| **Critical** | 🔴 Red + Audio Alert | Call 911 if feeling sick, exit vehicle immediately |

### Top 5 FAQs

**Q: Why is my CO reading high when first starting the car?**
A: Cold engines produce more CO. This is normal. Level should drop within 2-3 minutes.

**Q: Can I rely on this app instead of professional inspection?**
A: No. Use app to monitor for problems and guide when to seek professional help.

**Q: What if WiFi is not available in my area?**
A: App works offline with cached data. Readings sync when WiFi returns.

**Q: How often should I check the app?**
A: Daily is recommended. Enable notifications for hands-free alerting.

**Q: Can I install this hardware in any vehicle?**
A: Yes, any vehicle with 12V power. Professional installation recommended for safety.

---

**Document Version:** 1.0
**Last Updated:** November 16, 2025
**For Support:** See Installation Guide or contact support

