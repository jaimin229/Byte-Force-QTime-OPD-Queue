# 🏥 QTime — Live OPD Queue
> **"Waze for Hospital Outpatient Departments"**  
> **Squad:** Byte Force · **Track:** HealthTech & Wellness · **Difficulty:** HARD  
> **Author:** Jaimin Prajapati ([@jaimin229](https://github.com/jaimin229))  
> 🌐 **Live Working Demo:** [https://byte-force-qtime.vercel.app](https://byte-force-qtime.vercel.app)

---

## 🌟 The Problem
In typical hospital Outpatient Departments (OPD), patients receive a paper token (e.g. **#47**) or an appointment time (e.g. 10:30 AM) with zero visibility into:
- **When** they will actually be consulted (10 minutes or 4 hours).
- **Why** the queue freezes (emergency surgery, doctor stepped out, complex case).
- Whether it is safe to **step out** for food, medicines, or diagnostic lab tests.
- High crowding in waiting halls causes infection risks, severe patient anxiety, and missed daily wages.

---

## 💡 The Solution: QTime
QTime transforms every waiting patient into a **live sensor**, giving patients, hospital staff, and the waiting hall an honest, self-correcting, real-time picture of the OPD queue.

```
┌───────────────────────────┐         ┌───────────────────────────┐
│     Patient Mobile App    │         │      Staff OPD Console    │
│  (React Native, Bilingual)│         │ (Queue Control & Triage)  │
└─────────────┬─────────────┘         └─────────────┬─────────────┘
              │                                     │
              ▼                                     ▼
        ┌─────────────────────────────────────────────────┐
        │        Supabase Realtime + Postgres Engine      │
        │   - Bayesian Shrinkage ETA Prediction RPC       │
        │   - Strict State Machine Triggers & Guards      │
        │   - Advisory-Locked Token Number Sequence       │
        │   - Automatic Consultation Duration Learning    │
        └─────────────────────────┬───────────────────────┘
                                  │
                                  ▼
                    ┌───────────────────────────┐
                    │  Waiting Hall TV Kiosk    │
                    │ (Web Audio Chime + Board) │
                    └───────────────────────────┘
```

---

## 🚀 Key Features

### 1. 📱 Patient Mobile Experience (React Native)
- **Live Token Hero Card**: Displays active token number, doctor name, room number, and position ("3 patients ahead").
- **Adaptive ETA Range**: Shows honest estimates (`12–18 min`), never false precision.
- **Crowd Calibration ("I'm Being Seen")**: Patient taps when entering consultation; this timestamp quietly recalibrates waiting times for everyone behind them.
- **Stepping Out Mode**: Alerts the patient's phone with a buzz/notification when only 5 patients remain.
- **Lab Requeue**: Rejoin queue after diagnostic tests within 30 minutes while retaining priority.
- **Caregiver Mode**: Relatives and caregivers can track a child or elderly patient's token from their own phone.
- **Bilingual Interface**: Seamless 1-tap toggle between **English** and **हिन्दी (Devanagari)**.

### 2. 👨‍⚕️ Staff Operational Console
- **Doctor Lane Switching**: Multi-doctor OPD management (General Medicine, Pediatrics, Orthopedics).
- **One-Tap Actions**: `Call Next`, `Mark Served`, `Skip (No-show)`, `Requeue`.
- **Token Issuance**: Generates instant QR code & claim code on screen for walk-ins, appointments, and triage priorities.
- **Emergency Broadcast**: One tap freezes ETAs and broadcasts explanation (*"Doctor called to ICU emergency"*).
- **Instant Demo Login**: 1-tap pre-verified staff credentials (`opd.staff@district-hospital.org`).

### 3. 📺 Waiting Hall Big-Screen TV Kiosk
- High-contrast cinema slate theme readable from 20 meters away.
- Displays all doctor lanes side-by-side: Now Serving, Next 4 in Line, Room number.
- **Web Audio API Acoustic Chime**: Plays chime automatically whenever a new token is called.
- Emergency notice ticker and bilingual instructions.

### 4. 🧠 Bayesian Adaptive Prediction Engine (Postgres SQL)
- **Bayesian Shrinkage**: When sample sizes are small ($N < 5$), shrinks toward clinic prior; as consultations finish, adapts to the doctor's empirical rolling average pace.
- **Outlier Robust**: Consultation lengths clamped between 60s and 3600s to prevent data poisoning.
- **Client Clock Skew Proof**: All timestamps generated server-side via `now()`.

---

## 🛠️ Tech Stack & Architecture

- **Mobile Frontend**: React Native 0.76, TypeScript, `@notifee/react-native`, `@react-native-async-storage/async-storage`
- **Design System**: `jverse-ui-ux` + `ui-ux-pro-max` medical-grade tokens (WCAG 2.2 AA compliant, 48dp touch targets)
- **Backend & Database**: Supabase PostgreSQL, Row Level Security (RLS), Realtime Channels, Stored Functions & Triggers
- **Cloud Telemetry**: Multi-Cloud telemetry sync bridge (Firebase / GCP audit readiness)
- **Kiosk Board**: Standalone zero-dependency HTML5 / Web Audio / Supabase JS app

---

## 🧪 Verification & Test Suite

| Test Suite | Result | Details |
|---|---|---|
| **TypeScript Compilation** | ✅ PASS (0 errors) | `npx tsc --noEmit` |
| **ESLint Quality Check** | ✅ PASS (0 errors) | `npm run lint` |
| **Jest Unit Tests** | ✅ PASS (6/6 tests) | `npm test` (Queue Engine & App Rendering) |
| **Supabase E2E System Test** | ✅ PASS (8/8 steps) | Token issue -> Bayesian ETA -> Call -> Calibration -> Served |

---

## 🏁 Quick Start & Demo Guide

### Prerequisites
- Node.js >= 18
- npm or yarn

### 1. Seed Demo Data
```bash
node backend/seed_demo.js
```

### 2. Run the Mobile App
```bash
cd app
npm install
npm start
```
- For Android: `npm run android`
- For iOS: `npm run ios`

### 3. Open Waiting Hall Kiosk
Simply open `kiosk/index.html` in any browser or cast to a Smart TV:
```bash
# Double-click kiosk/index.html or serve locally:
npx serve kiosk
```

---

## 👥 Squad: Byte Force
- **Jaimin Prajapati** — Lead Developer ([@jaimin229](https://github.com/jaimin229))
- Mini-Hackathon 2026 Submission
