# P09 — Uncertain Waiting Times in Hospital Outpatient Departments
**Track:** HealthTech & Wellness · **Difficulty:** HARD · **Squad:** T079

---

## Official Problem Statement

> **Uncertain Waiting Times in Hospital Outpatient Departments**
>
> Patients often receive a token or appointment time that provides little
> indication of when they will actually be seen.

---

## The Real-World Problem

In a typical outpatient department (OPD), a patient gets a paper token like
**#47** or an appointment slot like "10:30 AM" — and then has no idea:

- **When** they'll actually be called (could be 10 minutes or 4 hours)
- **Why** the line seems stuck (a complex case, a doctor step-out, an emergency)
- Whether it's safe to **step away** for food, prayer, or errands
- Whether they should have come at a **less busy hour** instead

### Consequences
| Affected | Pain |
|---|---|
| Patients | Hours wasted in crowded halls, missed work/wages, anxiety, elderly & disabled patients suffering most |
| Hospitals | Overcrowded waiting halls, patients crowding the reception counter asking "number kitna chal raha hai?" |
| Care quality | Rushed consultations when doctors fall behind; angry confrontations at the counter |
| System | Peak-hour crowding at 9–11 AM while afternoons sit half-empty; no data to rebalance staffing |

### Why Waiting Times Are Unpredictable (Root Causes)
1. **Consultation length varies wildly** — 2 minutes (follow-up, BP check) to 45 minutes (new diagnosis, complex case)
2. **No-shows** — gaps appear that nobody communicated to the people waiting
3. **Emergencies** — doctors pulled away mid-clinic, queue freezes with no explanation
4. **Re-queuing** — patient goes for lab test/X-ray and returns to the *back* of the line, invisibly
5. **Doctor differences** — some doctors see 60 patients/hour, others 15
6. **Manual token systems** — paper numbers, shouted or written on a whiteboard, no data captured

### Why the Statement Is Tagged HARD
- It's a **real-time prediction under uncertainty** problem, not a CRUD app
- Needs **live state sync** across patients, staff, and displays
- Needs an **ETA algorithm** that adapts as reality changes
- The naive version (a counter with a number) is worthless without trust — the
  hard part is making the estimate *believable and self-correcting*

---

## Proposed Solution: "Live OPD Queue" — Waze for Hospital Queues

A mobile-first system that turns every waiting patient into a **live sensor**
and gives everyone — patients, staff, and the waiting hall — an honest,
constantly-updating picture of the queue.

### Patient App (React Native)
1. **Get a token** — scan QR at the reception counter (or staff issues it)
2. **Live position & ETA** — "You are #12 · likely seen in ~35–50 min" (a *range*, not fake precision)
3. **Smart notification** — "You're 5 patients away, head back to the hall" → patient can safely step out
4. **One-tap confirmations** — patient taps **"I'm being seen"** when called; this timestamp quietly calibrates the ETA for everyone behind them
5. Optional: **Leave queue / Re-queue after lab test** buttons

### Staff Dashboard
- Live queue list; **mark served / skip no-show / pause clinic (emergency)**
- Issue tokens via QR or manual entry
- See per-doctor **average consultation time** updating live
- One tap to broadcast a reason: *"Doctor called to emergency — delay ~20 min"* (turns anger into understanding)

### Prediction Engine (the "HARD" differentiator)
- Per-doctor **rolling average consultation duration** (updated after every served patient)
- **Time-of-day / day-of-week patterns** (9 AM rush vs 2 PM lull)
- Outputs an **ETA range with confidence** — "35–50 min" instead of a false "43 min"
- Self-correcting: every "I'm being seen" tap makes the next estimate sharper

### Waiting Hall Display Board
- Big-screen kiosk view (web page): current token, next 3 up, live ETA ranges, delay notices
- Replaces the whiteboard + shouting; also serves as the demo showpiece

---

## System Architecture (Squad T079 stack)

```
React Native app (patient + staff modes)
        │
        ▼
Supabase ── Postgres (tokens, queue events, consult-time stats)
        │        ├── Realtime channels → live UI updates for everyone
        │        └── Edge Function / SQL → ETA prediction job
        ▼
Web kiosk board (big-screen display for the waiting hall)
```

- **Auth:** anonymous token sessions (no login friction for patients) + staff login
- **Realtime:** Supabase Realtime subscription pushes every queue event to all clients instantly
- **Data model:** `doctors`, `clinics`, `tokens`, `queue_events` (issued, called, served, skipped, requeued), `consult_stats`
- **Privacy:** tokens are anonymous numbers — no medical data needed for MVP

### Data for Demo / Testing
- **Synthetic but realistic OPD logs**: generate a day of queue history using realistic
  consultation-time distributions (triangular/log-normal, 2–45 min) and no-show rates (~10–20%)
- Optionally seed from published OPD timing patterns (morning rush, lunch dip)

---

## MVP Scope (Mini-Hackathon Sized)

| # | Feature | Must / Nice |
|---|---|---|
| 1 | Token issue + QR scan check-in | MUST |
| 2 | Live queue position + ETA range on patient phone | MUST |
| 3 | Staff: mark served / skip / pause + delay broadcast | MUST |
| 4 | Realtime sync (Supabase) | MUST |
| 5 | Rolling-average prediction engine with confidence range | MUST (the HARD-tag centerpiece) |
| 6 | Kiosk display board | HIGH (demo wow) |
| 7 | "I'm being seen" crowd-calibration | HIGH (novel mechanic) |
| 8 | Re-queue after lab test, no-show auto-skip | NICE |
| 9 | Priority lane (elderly / emergency) | NICE |
| 10 | Admin analytics (busiest hours, per-doctor load) | NICE |

---

## 3-Minute Demo Script (Win the Room)

1. **Hook (15s):** "Every day, thousands of patients stare at a paper token with
   no idea when they'll be seen. We made the queue visible."
2. **Live sim:** Two devices — staff marks patients served one by one; the
   patient phone's ETA **visibly recalibrates in real time** (the crowd-calibration moment is the demo's magic)
3. **Show the board:** kiosk view updating live alongside
4. **Show the brains:** open the stats panel — average consult time tightening
   from "first guess" to "learned" as tokens get served
5. **Close:** "Same software works for any OPD — no hardware beyond a phone
   and a TV. Zero cost. One Supabase project."

---

## Judging Alignment

| Criteria | Our answer |
|---|---|
| **Impact** | Every OPD patient daily; benefits elderly/working patients most |
| **Innovation** | Crowd-sourced queue calibration ("patients as sensors") + honest ETA ranges |
| **Feasibility** | No hospital integration or hardware required to run; works alongside existing paper tokens |
| **Technical depth** | Real-time sync, adaptive prediction engine, multi-client architecture (HARD tag earned) |
| **Scalability** | One Supabase project serves any OPD; kiosk board is just a URL |

## Risks & Mitigations
- **No real hospital data** → realistic synthetic logs; the algorithm is what matters
- **"Patients won't tap confirm"** → any completion event works (staff tap, or first patient in hall taps); crowd-source is an enhancer, not a dependency
- **Trust in estimates** → always show ranges + delay reasons, never fake precision

---

---

## v2 — Loophole Audit & Fixes (Hardened Design)

### Technical loopholes
| # | Loophole | Fix |
|---|---|---|
| L1 | **Internet dies in hospital hall** → whole system goes dark | Offline-first: local cache (SQLite/MMKV) with optimistic queue state; events queue & sync on reconnect; kiosk shows last-known board + "reconnecting" banner |
| L2 | **Cold start** — new clinic, no history → garbage ETAs on day one | Seed priors from realistic synthetic stats; widen ETA range; show "Estimating… learning" badge for first N tokens; range narrows as data accrues |
| L3 | **Elderly / no smartphone patients excluded** | SMS plain-text updates fallback; kiosk board is source of truth; paper token remains fully valid |
| L4 | **Data poisoning** — patients fake-tap "I'm being seen", stats corrupted | Staff tap = authoritative truth; patient taps weight 0.3 & clamped; stats use median (outlier-robust); doctor avg can't jump >2σ without staff confirmation |
| L5 | **Race conditions** — two staff tap "served" simultaneously → queue desync | Postgres state machine: token transitions `issued→called→served` enforced in DB, idempotent events, first transition wins; optimistic UI corrected by realtime echo |
| L6 | **Client clock skew** → garbage event timestamps | All timestamps are server-side `now()` — client clocks never trusted |
| L7 | **Queue semantics ambiguity** (per clinic or per doctor?) | Per-doctor queues; a clinic = group of queues; kiosk shows all queues in the clinic |
| L8 | **Re-queue unfairness** — lab-test patient sent to the back feels robbed | Rejoin at **original position** if returning within 30 min of being called, else tail; rule shown on token screen |
| L9 | **No-show ambiguity** — skipped patient returns claiming their turn | Call next after 2-min grace; skipped token takes next gap; policy visible to all |
| L10 | **Pause/emergency** → stale countdown destroys trust | Explicit `PAUSED` state freezes ETA, broadcasts reason ("Doctor on emergency call"); resume re-baselines instantly |
| L11 | **Appointment vs walk-in tokens unmixed** | `token.source = walk-in \| appointment`; both feed one queue ordered by issue time, priority flag respected |
| L12 | **Realtime scale** — 200 phones + kiosk on one channel | One Realtime channel per clinic, server broadcasts deltas, clients subscribe only to their queue |
| L13 | **Security** — anonymous patients mutating queue | Supabase RLS: patients read-only on their queue; staff JWT role required for all mutations |

### Product / UX loopholes
| # | Loophole | Fix |
|---|---|---|
| L14 | Elderly can't read small fonts / English-only | Large-type bilingual UI (Urdu + English), high-contrast kiosk mode |
| L15 | Privacy fear — patients won't link identity to a token | Fully anonymous tokens, zero PII, zero medical data in MVP; identity optional and only for push notifications |
| L16 | Staff forgets to mark patients served → system rots | Auto-detection: 3 consecutive patient "I'm being seen" taps with no staff action → staff app gets a reminder nudge; kiosk shows "counter idle?" alert |

### Demo / judging loopholes
| # | Loophole | Fix |
|---|---|---|
| L17 | "It's just a counter app" dismissal | Demo leads with the **self-correction moment** (ETA visibly recalibrating), live accuracy panel (error shrinking as tokens served), and the emergency-pause recovery — one-liner ready: *"A counter shows a number; we show an honest prediction that keeps correcting itself."* |
| L18 | "Hospitals will never adopt this" | Zero-integration pitch: QR sticker + staff phone + any TV. Admin analytics (busiest hours, per-doctor load) is the hospital's ROI story |
| L19 | "Your demo is scripted" | Live-driven simulation: teammate injects random events + an **adversarial emergency interruption**, shown handled live (pause → resume → ETA re-baselines) |
| L20 | "What if nobody taps anything?" | System is 100% functional with **zero** patient taps — staff taps alone drive it; crowd-sourcing is an enhancer, not a dependency |

### Second-pass audit (re-checked after fixes)
- **Offline merge conflicts** (staff edits while offline vs server state): per-token last-writer-wins constrained by the DB state machine — safe for MVP, documented
- **Prediction with tiny sample (N<5)**: Bayesian shrinkage toward the clinic-wide average — simple, explainable to judges
- **Battery drain concern**: no GPS polling, event-driven updates only — negligible
- **Residual open items (external only):** official spec PDF not yet in folder; real-world pilot data — neither is closable from inside the project

---

## v3 — Official Spec Alignment (Kalpvruksh 2.0, SPEC-P09-E0277187)

Official dossier received (see `P09-OFFICIAL-SPEC.pdf`). Line-by-line verification:

| Official spec element | Status in our design | Action taken |
|---|---|---|
| Scheduled appointments + walk-ins | ✅ Covered (L11 `token.source`) | — |
| **Referrals, follow-ups, diagnostic cases, emergencies** as patient types | ⚠️ Partial | Added `token.category` (walk-in / appointment / referral / follow-up / diagnostic) — same queue, richer analytics |
| **Triage / medical-need priority changes queue order** | ⚠️ Was "NICE" | **Upgraded to MUST**: priority weight in queue ordering + distinct kiosk marker for priority tokens |
| No-shows | ✅ Covered (L9 grace window) | — |
| Delayed doctors | ✅ Covered (L10 pause + delay broadcast) | — |
| **Room changes** | ❌ **MISSING** | **Added as MUST**: `room_changed` event → kiosk + patient phone show room ("Doctor moved to Room 4") — visibility means *where*, not only *when* |
| Consultations longer than expected | ✅ Covered (adaptive ETA) | — |
| Leaving temporarily + risk of missing turn | ✅ Covered (5-away notification + requeue L8) | — |
| Crowded waiting spaces | ✅ Covered (step-out + board) | — |
| Older adults, disabilities | ✅ Covered (L14 accessibility) | — |
| **Caregivers, parents with children** | ⚠️ Not named | Added: caregiver can follow a token from their own phone (read-only watch link); large-type mode |
| Hourly workers (lost wages) | ✅ In impact framing | Strengthened: "step out safely = earn, not wait" |
| **Infection exposure** in crowded halls | ⚠️ Not named | Added to impact pitch: live visibility + step-out = fewer bodies crammed in one hall |
| **Missed meals or medication** | ⚠️ Not named | Added to stakes framing (feeds the 15-sec demo hook) |
| Department patient-flow management | ✅ Covered (admin analytics) | — |

### Updated MVP priority changes
- **MUST (new):** triage/priority ordering · room-change event & display
- **HIGH (new):** caregiver follow-link (read-only token watch)
- **MUST (kept):** token issue/QR · live ETA range · staff serve/skip/pause · realtime sync · adaptive prediction
- Everything else unchanged from v2 hardened spec.

### Updated demo hook (uses official stakes)
> "Long uncertain waits mean infection exposure, missed meals, missed medicine,
> and lost wages. We make the queue visible — patients step out safely,
> staff get breathing room, and the department gets flow data it never had."

**Alignment verdict: 100% of official spec elements addressed.** No TODOs remain.
