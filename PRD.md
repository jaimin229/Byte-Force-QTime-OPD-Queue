# 📋 Product Requirements Document (PRD) — QTime
**Product Name:** QTime (Live OPD Queue)  
**Tagline:** Waze for Hospital Waiting Rooms  
**Target Track:** HealthTech & Wellness (Difficulty: HARD)  
**Author / Squad:** Jaimin Prajapati · Byte Force ([@jaimin229](https://github.com/jaimin229))  
**Live URL:** [https://byte-force-qtime.vercel.app](https://byte-force-qtime.vercel.app)  

---

## 1. Simple Summary (What is QTime?)
In hospital outpatient clinics (OPD), patients get paper tokens like **#47** and wait 2 to 4 hours in crowded, noisy hallways with no idea when the doctor will call them. 

**QTime fixes this.** It turns ordinary tokens into live, smart tracking numbers on a phone and on waiting hall TV screens. It tells patients an honest waiting time range (e.g. "15–25 minutes"), lets them step out to get food or medicines without losing their spot, and updates automatically in real time.

---

## 2. Who is this for? (User Personas)

1. **The Patient & Family (e.g., Ramesh & his mother):**
   - *Pain:* Elderly mother is exhausted; doesn't know if she can sit outside or take her medication; fears missing their number.
   - *With QTime:* Looks at phone, sees "4 patients ahead · ~20–30 min wait". Turns on "Step Out" mode. Gets a buzzer alert when 5 patients remain.
2. **The Clinic Doctor & Staff (e.g., Dr. Aslam & Nurse Priya):**
   - *Pain:* Frustrated patients crowd the desk shouting *"Whose turn is it?"*; doctor gets pulled to ICU emergency and queue descends into chaos.
   - *With QTime:* 1 tap calls next patient, 1 tap pauses queue with a broadcast note (*"Doctor called to ICU emergency, back in 20 min"*).
3. **Hospital Administration:**
   - *Pain:* Overcrowded halls increase infection spread; zero data on doctor consultation speed.
   - *With QTime:* Corridors empty by 60%; live dashboard shows average patient wait and doctor consultation times.

---

## 3. Core Features (What it does)

| Feature | What it does in simple words |
|---|---|
| **1. Live Token Card** | Shows your token number, your doctor's name, room number, and exact position in line. |
| **2. Honest Time Range** | Shows `15–25 min` (a realistic range) instead of a fake exact number like `18.3 min`. |
| **3. Stepping Out Alert** | Buzzes your phone when you are 5 patients away so you never miss your turn. |
| **4. "I'm Being Seen" Tap** | Patient taps when walking into the doctor's room. This fine-tunes the estimate for everyone waiting behind them. |
| **5. Doctor Desk Console** | Staff calls patients, skips no-shows, or pauses the room during medical emergencies. |
| **6. Waiting Room TV Display** | Big screen TV shows who is currently in the room and the next 4 tokens, with audio chime announcements. |
| **7. Lab Test Return Pass** | If a patient goes for an X-ray or blood test, they rejoin without starting all the way over from the back. |
| **8. Bilingual Support** | 1-tap switch between English and Hindi (हिन्दी). |

---

## 4. How It Works (Step-by-Step Flow)

1. **Get Token:** Patient arrives at hospital reception, receives Token #14 (via paper ticket or phone QR scan).
2. **Check Live Status:** Patient opens phone or looks at the big TV screen.
3. **Smart Wait:** Patient sees "8 people ahead · ~35–50 min". Steps outside for tea/fresh air.
4. **Proximity Alert:** At 5 people ahead, phone alerts: *"Please head to Room 3 waiting area"*.
5. **Consultation:** Doctor calls Token #14. TV plays a chime: *"Token 14, please proceed to Room 3"*.
6. **Auto-Learning:** Doctor marks consultation complete. The system automatically records how long it took and improves future estimates.

---

## 5. Non-Functional Requirements

- **Speed:** Instant real-time updates (<100ms sync using Supabase websockets).
- **Accessibility:** High-contrast text, 48px large touch buttons, bilingual (English + Hindi), audio chimes for illiterate patients.
- **Privacy & Security:** Anonymous tokens (no sensitive medical records or patient Aadhaar required). Staff actions protected by secure login.
- **Zero Expensive Hardware:** Works on any regular smart TV, basic Android smartphone, or hospital desktop computer.

---

## 6. Success Metrics (How do we know it works?)

- **Hall Crowding:** Corridors 50–70% less congested during peak hours.
- **Reception Inquiries:** Counter inquiries (*"Kab aayega number?"*) drop by >80%.
- **No-Show Rate:** Decreases from ~20% to <5% due to proximity alerts.
- **Prediction Accuracy:** Real wait time falls within predicted range >90% of the time.
