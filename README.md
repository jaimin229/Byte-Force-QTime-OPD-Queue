# QTime: Live OPD Queue and Adaptive Waiting Time Prediction Engine

> A real-time queue orchestration and Bayesian delay estimation platform for hospital Outpatient Departments (OPD).  
> **Squad:** Byte Force  
> **Track:** HealthTech and Wellness (Difficulty: HARD)  
> **Lead Developer:** Jaimin Prajapati ([@jaimin229](https://github.com/jaimin229))  
> **Live Deployment:** [https://byte-force-qtime.vercel.app](https://byte-force-qtime.vercel.app)  
> **Waiting Hall Display:** [https://byte-force-qtime.vercel.app/kiosk](https://byte-force-qtime.vercel.app/kiosk)  
> **Repository:** [https://github.com/jaimin229/Byte-Force-QTime-OPD-Queue](https://github.com/jaimin229/Byte-Force-QTime-OPD-Queue)

---

## 1. Executive Summary and Problem Statement

Hospital Outpatient Departments (OPDs) in high-density healthcare facilities face severe queue uncertainty. Patients receive static paper tokens (such as "#47") or scheduled slots with no real-time insight into actual consultation timing.

### 1.1 Root Causes of Queue Instability
- **Stochastic Consultation Lengths:** Durations vary from 2 minutes (follow-ups, routine triage) to 45 minutes (complex multi-system cases).
- **Unannounced Physician Interruptions:** Doctors are frequently called away for intensive care emergencies or inpatient ward rounds without centralized communication.
- **Diagnostic Re-queuing:** Patients returning from radiology, pathology, or electrocardiogram testing re-enter queues out of order.
- **No-Shows and Latency Gaps:** Approximately 10% to 20% of tokens are abandoned, introducing uncommunicated voids into the queue schedule.

### 1.2 Clinical and Social Consequences
- **Corridor Overcrowding:** Dense congregations of immunocompromised, geriatric, and pediatric patients in waiting halls drastically elevate nosocomial infection risks.
- **Economic Loss:** Hourly and daily-wage workers lose full days of income due to inability to predict when consultations will conclude.
- **Administrative Friction:** Counter staff face continuous interruptions from patients inquiring about queue progression, deteriorating service throughput.

---

## 2. System Architecture and Methodology

QTime models the hospital waiting hall as an adaptive, sensor-informed distributed system. Rather than relying on deterministic linear multiplication, the engine combines authoritative staff actions with crowd-verified patient signals and empirical Bayesian shrinkage.

```
+-----------------------------------------------------------------------------------+
|                                Presentation Layer                                 |
|                                                                                   |
|   +-----------------------+   +-----------------------+   +-------------------+   |
|   |  Patient Interface    |   |  Staff OPD Console    |   |  Waiting Hall TV  |   |
|   |  (React Native / PWA) |   |  (Desktop / Tablet)   |   |  (Kiosk Display)  |   |
|   +-----------+-----------+   +-----------+-----------+   +---------+---------+   |
+---------------|---------------------------|-------------------------|-------------+
                |                           |                         |
                +---------------------+     |     +-------------------+
                                      |     |     |
                                      v     v     v
+-----------------------------------------------------------------------------------+
|                         Transport and Realtime Layer                              |
|                                                                                   |
|           Supabase Realtime Engine (WebSocket Channels, Latency < 50ms)           |
+-----------------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------------+
|                      PostgreSQL Core Engine and Governance                        |
|                                                                                   |
|   - Row Level Security (RLS) and Role-Based Access Control (RBAC)                 |
|   - Concurrency Protection: pg_advisory_xact_lock (Gapless Token Allocation)      |
|   - State Machine Trigger: guard_token_transition()                               |
|   - Adaptive Duration Learning: update_consult_stats()                            |
|   - Empirical Bayes Waiting Time Predictor: eta_for_token()                       |
+-----------------------------------------------------------------------------------+
```

### 2.1 Empirical Bayes Prediction Engine
To resolve the cold-start problem when clinic sessions begin, QTime implements an Empirical Bayes normal-normal conjugate model:

$$\mu_{\text{post}} = \frac{\kappa_0 \cdot \mu_0 + n \cdot \bar{x}}{\kappa_0 + n}$$

- **Prior Benchmark ($\mu_0$):** 420 seconds (7.0 minutes), established from empirical hospital baseline data.
- **Prior Weight ($\kappa_0$):** 5 pseudo-observations.
- **Observed Consultations ($n$):** Count of completed consultations recorded for the active physician during the current shift.
- **Sample Mean ($\bar{x}$):** Moving average duration of completed consultations.
- **Confidence Interval Output:** Instead of false scalar precision (such as "18.3 minutes"), QTime yields a calibrated range:
  $$\text{ETA}_{\text{low}} = \max\left(0, \text{round}\left((\text{position} - 1) \cdot \mu_{\text{post}} \cdot 0.8\right)\right)$$
  $$\text{ETA}_{\text{high}} = \text{round}\left((\text{position} - 1) \cdot \mu_{\text{post}} \cdot 1.35\right) + 300\text{s}$$

### 2.2 Anti-Tampering and Data Integrity Protections
- **Server-Authoritative Clock:** All timestamps are generated directly in PostgreSQL via `now()`, neutralizing client clock drift.
- **Outlier Clamping:** Consultation durations are constrained to the interval $[60\text{s}, 3600\text{s}]$ within stored database triggers, preventing malicious or accidental duration poisoning.
- **Concurrency Locks:** Token sequence numbers are protected using transactional advisory locks (`pg_advisory_xact_lock`), eliminating race conditions and duplicate assignments under concurrent load.
- **Asymmetric Authority:** Patient confirmations ("I'm Being Seen") act as telemetry enhancers; state transitions remain strictly governed by authenticated clinical staff credentials.

---

## 3. Core Functional Modules

### 3.1 Patient Mobile and Web Interface
- **Live Token Status:** Real-time visibility of token number, assigned physician, room identifier, and current position in line.
- **Adaptive Estimation Intervals:** Displays bounded waiting ranges that adjust dynamically as upstream consultations advance.
- **Stepping-Out Proximity Monitoring:** Allows patients to leave waiting corridors safely; automatically alerts the device when the queue advances to within 5 patients of their turn.
- **Crowd Calibration Signal:** One-touch confirmation button ("I'm Being Seen") when entering the consultation room, reinforcing queue synchronization.
- **Diagnostic Return Handling:** Re-queues patients returning from laboratory or imaging procedures while preserving priority entitlement within a 30-minute grace window.
- **Caregiver Mode:** Read-only token tracking links allowing family members to monitor elderly or pediatric patients remotely.
- **Bilingual Interface:** Instant single-touch toggle between English and Hindi (Devanagari).

### 3.2 Staff and Physician Operational Console
- **Multi-Lane Management:** Instant switching between clinical specialties (General Medicine, Pediatrics, Orthopedics).
- **Workflow Operations:** One-click controls for `Call Next`, `Mark Served`, `Skip (No-Show)`, and `Requeue`.
- **Walk-in Triage Intake:** Generates walk-in tokens with explicit priority flags for high-acuity, pediatric, or geriatric emergencies.
- **Emergency Suspension Broadcast:** One-click clinic pause functionality that freezes countdowns and broadcasts structured delay explanations across all patient and public screens.
- **Pre-configured Evaluation Access:** Integrated single-click demonstration authentication for evaluation workflows.

### 3.3 Waiting Hall Display Board (Kiosk)
- **High-Contrast Typography:** Optimized for legibility from distances exceeding 20 meters.
- **Concurrent Lane Oversight:** Side-by-side presentation of active room statuses, currently called numbers, and upcoming tokens.
- **Acoustic and Vocal Cues:** Automated Web Audio API chime synthesis and bilingual speech announcements triggered on queue progression.
- **Emergency Notice Ticker:** Immediate visual broadcast of physician delays and operational alerts.

---

## 4. Database Schema and State Machine

The persistence layer is implemented in PostgreSQL and enforced via Row Level Security (RLS) policies.

### 4.1 Relational Architecture
- **`clinics`:** Department identity, baseline consultation constants, operational pause states, and staff verification codes.
- **`doctors`:** Clinical staff profiles, assigned room identifiers, empirical consultation metrics, and active operational status.
- **`tokens`:** Token numbers, clinic and doctor foreign keys, state enumerations, source types, priority flags, claim UUIDs, and audit timestamps.
- **`queue_events`:** Append-only operational event ledger recording actors, event classifications, JSONB payloads, and server timestamps.
- **`staff_profiles`:** Relates authenticated identity records to authorized clinical facilities.
- **`live_queue` (View):** Dynamically partitions and orders waiting tokens:
  ```sql
  row_number() over (
    partition by t.doctor_id
    order by t.is_priority desc, t.issued_at asc
  ) as position
  ```

### 4.2 State Machine Transitions
Allowed token status transitions are enforced at the database trigger layer:
- `issued` -> `called`
- `issued` -> `cancelled`
- `called` -> `served`
- `called` -> `skipped`
- `called` -> `requeued`
- `called` -> `cancelled`
- `requeued` -> `called`

Invalid transitions are aborted with exception `QT_INVALID_TRANSITION` (SQLSTATE `23514`).

---

## 5. Verification and Quality Assurance

The codebase includes comprehensive unit, integration, and end-to-end verification suites.

### 5.1 Verification Summary

| Test Category | Scope | Result |
|---|---|---|
| TypeScript Static Type Check | Client application type safety | PASS (0 errors) |
| ESLint Static Analysis | Code style and quality standards | PASS (0 errors) |
| Jest Unit Test Suite | Queue computation engine and UI rendering | PASS (2/2 suites, 6/6 tests) |
| Supabase End-to-End Suite | Database triggers, Bayesian RPC, RLS, and auth | PASS (8/8 phases verified) |

### 5.2 End-to-End Verification Pipeline
The automated system test validates the complete lifecycle across authenticated environments:
1. Connects to the clinical department and queries physician configurations.
2. Authenticates operational staff credentials against Supabase IAM.
3. Issues a priority referral token with advisory lock sequence validation.
4. Executes the PostgreSQL RPC `eta_for_token` and confirms Bayesian bounds.
5. Advances the token to `called` status and verifies publication to the audit ledger.
6. Simulates a patient crowd-calibration event.
7. Executes the `served` transition and asserts that the `d_consult_stats` trigger updates the physician's moving average.

---

## 6. Deployment and Local Development

### 6.1 Prerequisites
- Node.js (version 18.0 or higher)
- npm or yarn package manager

### 6.2 Seed Simulation Data
To populate the database with a multi-doctor clinic configuration and realistic patient queues:
```bash
node backend/seed_demo.js
```

### 6.3 Run End-to-End System Verification
To execute the automated end-to-end integration suite against the live backend:
```bash
node backend/verify_e2e.js
```

### 6.4 Run the Mobile Application (React Native)
```bash
cd app
npm install
npm test
npm start
```
- For Android: `npm run android`
- For iOS: `npm run ios`

### 6.5 Production Web Application
The single-page web portal, incorporating patient tracking, staff management, TV kiosk view, and live telemetry, is deployed at:  
[https://byte-force-qtime.vercel.app](https://byte-force-qtime.vercel.app)

---

## 7. Problem Statement Compliance Matrix

Mapping against hackathon specification P09 (Kalpvruksh 2.0, SPEC-P09-E0277187):

| Requirement | Implementation Architecture | Status |
|---|---|---|
| Mixed Scheduled Appointments and Walk-Ins | Differentiated via `token_source` enum (`walk_in`, `appointment`, `referral`, `follow_up`, `diagnostic`) | Implemented |
| Triage and Medical Priority Handling | Priority ordering in `live_queue` view; priority tokens visually emphasized | Implemented |
| No-Show Handling and Queue Rebalancing | Dedicated `Skip` workflow with a 2-minute grace interval | Implemented |
| Physician Delays and Emergency Halts | Clinic-level pause flag with broadcast reason across all subscribed clients | Implemented |
| Diagnostic Re-queuing Fairness | 30-minute priority preservation window for returning laboratory patients | Implemented |
| Corridor Decongestion | Stepping-out proximity alert triggered at 5 patients ahead | Implemented |
| Accessibility for Geriatric and Illiterate Users | High-contrast TV board, Web Audio chimes, bilingual text, zero mandatory login | Implemented |
| Caregiver Visibility | Read-only token observation links for relatives and guardians | Implemented |

---

## 8. Authors and Acknowledgments

- **Lead Developer:** Jaimin Prajapati ([@jaimin229](https://github.com/jaimin229))
- **Squad:** Byte Force
- **Track:** HealthTech and Wellness (Difficulty: HARD)
- **Competition:** Mini-Hackathon 2026
