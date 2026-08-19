# Clinical Rules & UX Audit — PostTonsillectomyPal (TonsilTrack)

Audit date: 2026-08-14
Documents reviewed: `PRD.md`, `UX.md` (includes the medication rules table + rule skeletons), `Medication.md` (duplicate of the rules section in `UX.md`), `Master Build Prompt.md`, and the existing prototype `V1 app` (a single-file Expo Snack export, 1,685 lines, referred to below as **V1**).

V1 is a working, click-through Snack prototype. It is **not** a scaffolded Expo project (no `package.json`, `app.json`, or folder structure) and has no persistence layer. It implements a plausible-looking subset of the flow but several of its behaviors are clinically incomplete or unsafe relative to the spec, and it has one outright logic bug. This document lists what exists, what's missing, what conflicts with the spec, and what should be refactored, roughly in the order a clinician or reviewer would care about (safety first).

---

## 1. What already exists in V1

- Onboarding screens: Welcome → Disclaimer → Child details (name, age, weight, surgery date via a custom calendar modal) → medicine selection → review → main app.
- Medicine selection with per-medicine detail panel; for **paracetamol** and **ibuprofen only**, a liquid-strength picker (two hardcoded presets + "unknown") and weight-based mg/mL dose calculation (`calculateLiquidDose`), capped at `maxSingleDoseMg`.
- A single "next dose" calculation per medicine, derived from a manually entered first-dose-of-the-day time (`makeNextDoseForMed`), used to drive a "Next dose due" card.
- A tap-to-tick "Tick dose as given" action that records a given time in an in-memory `doseLog`.
- Five bottom tabs: Today, Meds, Questions, Emergency, Settings.
- A day-by-day recovery message keyed off post-op day (`RECOVERY_DAYS`, `getPostOpDay`), shown as one card on the Today tab and dumped in full inside the Questions tab.
- A static Emergency tab (red-flag list + a grab-and-go checklist) and 7 FAQ entries.
- Consistent, calm visual styling (rounded cards, soft palette, distinct red emergency styling) that is broadly in the spirit of the UX doc's tone/visual-style rules.

## 2. What is missing

**Clinical engine**
- No `medicationRules` table — dosing constants live inline in the `MEDICINES` array and only cover 2 of 5 medicines with weight-based math. Celecoxib, dexamethasone, and oxycodone have **no `mgPerKg`, no `maxSingleDoseMg`, no dose calculation at all** — despite `Medication.md`/`UX.md`'s updated rules table requiring weight-based mg/kg dosing for all five (oxycodone: 0.1 mg/kg capped at 5 mg; celecoxib: 4 mg/kg capped at 100 mg; dexamethasone: 0.1 mg/kg capped at 8 mg).
- No `maxDailyDoseMg` field or enforcement anywhere.
- No minimum-interval enforcement, no rolling-24-hour dose-count check, no double-dose prevention. The PRD/build prompt specifically require this for oxycodone ("check whether 4 doses have already been logged in the last 24 hours… if exceeded, show a stop message") — entirely absent.
- No full-day schedule generator. `makeNextDoseForMed` only ever computes a single, hardcoded "dose #2" (`first + intervalHours`) from one manually entered first-dose time. There is no QID/TDS/BD schedule (e.g., paracetamol at 06:00/12:00/18:00/22:00) and no mechanism to see a 3rd or 4th dose. The spec's "Today's Medicines" checklist of all scheduled times for the day does not exist.
- No dexamethasone selected-day logic (day 3/5/7 or 4/5/6 only) — treated as a generic daily prescription med.
- No `ruleVersion`, `source`, `reviewedBy`, or other audit metadata on any rule — required by both the PRD ("Critical Build Notes for Vibe Coding") and UX doc ("Developer Notes": every generated plan must store rule version + weight-at-calculation + timestamp + confirmation).

**Persistence**
- No storage at all — everything lives in `useState`; a reload loses the child profile, medication plan, and dose log. PRD explicitly requires local storage for Child Profile, Prescribed Medication, Dose Log, and Pain Check-In.

**Screens/flows called for by the spec and absent from V1**
- Emergency Warning screen as a mandatory, non-skippable onboarding step (spec Screen 4) — not present in the reachable flow (see bug below).
- Weight Confirmation screen (spec Screen 6, explicitly "do not skip in MVP") — absent; V1 goes straight from weight entry to medicine selection.
- Surgery Details screen — surgery type and hospital fields (JHH / Tamworth / Other) are entirely absent from V1's child-details screen.
- Medication Formulation screen as its own step with an **"Enter manually"** concentration option — V1 only offers two fixed presets per liquid medicine plus "unknown"; there is no way to enter an arbitrary bottle concentration.
- Calculated Medication Plan review with per-medicine max-daily-dose display and the exact required confirmation copy.
- Notification Permission / Reminder Setup screen — no reminders feature at all (Expo Notifications never referenced).
- Pain Faces Check-In — **completely missing.** No faces UI, no pain category storage, no severity-based guidance messages. This is a first-class PRD feature (§4) and its own UX flow (§3.4), and it is not present anywhere in V1.
- Dedicated Timeline tab with Day 0–14 selector and the `whatYouMightNotice / focus / getHelp` structure — V1's `RECOVERY_DAYS` objects only have `title` + `message`, and the full list is dumped inside the Questions tab rather than living in its own tab.
- Dose Confirmation Modal (Yes/Cancel/Skip) — V1 ticks a dose immediately on tap with no confirmation step and no Skip/Missed path, so the mandatory "do not give extra or double doses" message never displays.
- Interactive Emergency flow (Yes/No bleeding question → Call 000 screen with a `tel:`/`Linking` action → grab-and-go as its own screen) — V1's Emergency tab is a static content dump; there's no bleeding question, no dedicated Call 000 screen, and the "Call 000" button doesn't actually invoke the phone dialer anywhere in the app (FAQ items with "blood" in the question route to the Emergency tab, but that's the only escalation wired up).
- Oxycodone PRN card and its specific confirmation dialog ("You are recording an oxycodone dose…") — absent; oxycodone is currently indistinguishable from celecoxib/dexamethasone in the UI.
- "I'm not sure" modal on medicine selection, "Other medicine" checklist option — absent.
- Reminder Settings screen, expanded Settings (medicine plan, disclaimer, privacy, clinical content version) — Settings currently only shows/edits child details.
- FAQ search/categorization — the 7 FAQs are an unsorted flat list with no search bar or categories.

## 3. What conflicts with the specification

These are places where V1 does something rather than nothing, but does it in a way that contradicts a stated clinical-safety rule.

1. **Bug — unreachable Emergency Warning screen.** `showEmergencyButtonIntro()` (line 441) sets `screen` to `"emergencyButtonInfo"`, but that value is never actually set by any caller, and the `if (screen === "emergencyButtonInfo")` branch is nested *inside* `if (screen === "medicines")` (`V1 app:705-737`). Since both conditions test the same variable, the inner branch can never be true when the outer one is — this JSX is dead code. Net effect: the "mandatory before you start" emergency-bleeding warning the UX spec requires (Screen 4, "Do not wait to see if it settles… call 000 immediately") is never shown to a first-time user.
2. **Weight confirmation is skippable**, contradicting the UX doc's explicit "Safety Requirement: Do not skip this screen in MVP" for Screen 6. Right now weight is entered once, in a single free-text field, with no plausibility check and no dedicated re-confirmation step — the exact failure mode that screen exists to catch.
3. **Celecoxib, dexamethasone, and oxycodone bypass the medication engine entirely** — their card just says "use the dose written on the prescription" (`V1 app:798-804`). This directly conflicts with PRD §3.3 ("the app calculates doses based on… medication-specific mg/kg dosing" for all selected medicines) and with the Master Build Prompt's explicit rule table for all five. It also means oxycodone — the one medicine the spec calls out as needing the *most* safety scaffolding (PRN-only, sedation/breathing warning, rolling 24h cap) — currently gets the *least* structure of any medicine in the app.
4. **No enforcement of "do not exceed maximum doses per 24 hours."** Nothing in `confirmDoseGiven` looks at dose history before recording a new "given" entry, so a parent can tick the same medicine repeatedly with no warning — this is the literal scenario UX §6.3 and PRD §3.7 exist to prevent, and for oxycodone specifically the Master Build Prompt mandates a hard stop message once 4 doses/24h are logged.
5. **Confirmation checkbox copy has drifted from the mandated text.** Spec requires: *"I confirm these medicines were prescribed for my child and this plan matches my discharge instructions."* V1 uses: *"I have checked this plan against the discharge paperwork"* (`V1 app:869`) — weaker, and doesn't include the "prescribed for my child" attestation the PRD calls a required confirmation.
6. **No "check the bottle before measuring a liquid dose" gating beyond the initial pick.** Once "unknown" is chosen, `validateMedicineSetup` actually blocks the parent from proceeding at all (`V1 app:462-468`), which is *stricter* than the spec: UX §6.2 says the app should still let the parent continue and just show mg-only guidance ("Check the bottle or ask your pharmacist…"), not block onboarding outright. Worth flagging even though it errs safe, because it will frustrate real users who don't yet know their bottle strength and blocks them from using the app for non-liquid meds bundled in the same flow.
7. **Emergency escalation from FAQs is string-matched.** `item.q.toLowerCase().includes("blood")` (`V1 app:995`) is a fragile way to decide which FAQ needs an "Open Emergency" button, and doesn't match the spec's requirement that *any* bleeding-related FAQ (including ones that might not contain the literal word "blood," e.g. "clots") carries the emergency callout.

## 4. What should be refactored

- **Project scaffolding.** `V1 app` needs to become a real Expo/TypeScript project (`package.json`, `app.json`, `App.tsx`, navigation) matching the folder layout both `UX.md` §10 and `Master Build Prompt.md` §1 specify (`/clinical`, `/data`, `/content`, `/components`, `/screens`). Right now everything — rules, calculation, schedule, screens, and styling — lives in one 1,685-line file with a hand-rolled `screen`/`tab` state machine instead of a navigation library.
- **Medication engine isolation.** `MEDICINES`, `calculateLiquidDose`, `makeNextDoseForMed`, and `parseTimeToMinutes`/`formatMinutes` should split into `medicationRules.ts` (data only, versioned), `doseCalculator.ts` (pure functions), `scheduleGenerator.ts` (produces the day's dose list per medicine's `scheduleType`), and `safetyValidator.ts` (interval/24h-cap checks) — matching the architecture both docs insist on ("must be treated as a controlled clinical logic module," "not hard-coded scattered calculations").
- **Type safety.** V1 is plain JS with no `MedicationRule`/`ChildProfile`/`DoseLog` types, unlike the TypeScript types fully specified in `Medication.md`/`Master Build Prompt.md` §10. Porting to TS as part of the rewrite gets this for free and will catch a class of the gaps above (e.g. missing `maxDailyDoseMg`) at compile time.
- **State → persistence.** Replace `useState` for `child`, `selectedMeds`, `medSettings`, `doseLog` with an actual data layer (`storage.ts` over `AsyncStorage`/SQLite) backing the `childProfile.ts` / `medicationPlan.ts` / `doseLog.ts` / `painCheckIn.ts` modules the build prompt names.
- **Screen state machine → navigation.** The `if (screen === "…")` chain (11+ branches) should become a proper navigator (e.g. React Navigation) with distinct onboarding stack + tab navigator, both to fix the dead-code bug in §3.1 structurally and to match the two-level IA (`Onboarding` stack → 5-tab shell) the UX doc lays out.
- **Content vs. logic separation.** `RECOVERY_DAYS`, `FAQ_ITEMS`, `RED_FLAGS`, and the emergency checklist strings are inline in the component file; they belong in `/content` (`recoveryTimeline.ts`, `faqContent.ts`, `emergencyContent.ts`, `disclaimerContent.ts`) per the build prompt, both for reuse and so non-engineers can review/update clinical copy without touching component code.

## 5. Priority ranking (safety-first)

| Priority | Item | Why |
|---|---|---|
| P0 | Fix/rebuild onboarding order so Emergency Warning and Weight Confirmation are mandatory, unskippable screens | Currently unreachable / entirely absent — direct contradiction of explicit "do not skip" spec language |
| P0 | Build the real medication engine (rules table + calculator + schedule generator + safety validator) covering all 5 medicines, with max-daily-dose and rolling-24h enforcement | Currently 3 of 5 medicines have zero dose calculation; no medicine has 24h-cap enforcement |
| P0 | Oxycodone PRN handling (separate card, prescription-confirmation gate, sedation/breathing warning, hard stop at 4 doses/24h) | Highest-risk medicine currently has the least safety scaffolding |
| P1 | Persistence layer (local storage for profile/plan/dose log/pain check-in, with rule version + confirmation timestamp stored per plan) | No data survives a reload today; also needed for the audit trail the spec requires |
| P1 | Dose Confirmation Modal with Given/Skip/Cancel + "do not double dose" messaging | Prevents accidental/duplicate tick-off, a named edge case in the spec |
| P1 | Full-day schedule generation (today's medicine list, not just "next dose") | Core dashboard requirement, currently structurally impossible with the "dose #2 only" logic |
| P2 | Pain Faces Check-In | Entirely missing first-class feature |
| P2 | Dedicated Timeline tab, Notification/Reminder setup, expanded Settings | Named UX screens not yet built |
| P2 | Interactive Emergency flow (bleeding Y/N → Call 000 screen with working phone-dial action) | Static content today; the actual escalation interaction is missing |
| P3 | FAQ search/categories, "I'm not sure" modal, "Other medicine" option, copy fixes (confirmation checkbox text) | Polish / spec-fidelity items, lower clinical risk |

This audit is the input to the implementation plan in `IMPLEMENTATION_PLAN.md`.
