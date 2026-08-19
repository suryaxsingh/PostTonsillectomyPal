# Implementation Plan — TonsilTrack (PostTonsillectomyPal)

Companion to `AUDIT.md`. Target stack per `Master Build Prompt.md` §1: React Native + Expo + TypeScript, local storage only, no login/cloud/AI. Build order below follows the priority ranking in the audit (clinical safety first) and the "Build Priority" section of `UX.md` §8 / `Master Build Prompt.md` §18, adapted into module-sized phases so each phase is independently reviewable and testable.

## Target structure

```
/clinical
  medicationRules.ts      # versioned rule table, all 5 medicines
  doseCalculator.ts        # pure mg/mL calculation
  scheduleGenerator.ts     # today's dose list per medicine scheduleType
  safetyValidator.ts       # interval + rolling-24h + max-daily checks
/data
  storage.ts                # AsyncStorage wrapper
  childProfile.ts
  medicationPlan.ts
  doseLog.ts
  painCheckIn.ts
/content
  recoveryTimeline.ts       # Day 0-14, {title, whatYouMightNotice, focus, getHelp}
  faqContent.ts
  emergencyContent.ts
  disclaimerContent.ts
/components
  MedicationCard.tsx  DoseCheckbox.tsx  PainFacesScale.tsx
  EmergencyButton.tsx  SafetyWarningCard.tsx  DayCard.tsx
  PrimaryButton.tsx  ScreenContainer.tsx
/screens
  onboarding/  home/  timeline/  medicines/  questions/  emergency/  settings/
```

## Phase 0 — Project scaffold
- `npx create-expo-app` with TypeScript template; add React Navigation (native stack for onboarding, bottom tabs for the 5-tab shell: Home, Timeline, Medicines, Questions, Emergency).
- Wire up the folder structure above with empty modules and barrel exports.
- No behavior yet; goal is a running (blank) app so every later phase ships into a real project instead of a Snack file.

## Phase 1 — Clinical engine (P0, no UI)
- `medicationRules.ts`: port the rules table from `Medication.md` for all five medicines (paracetamol, ibuprofen, celecoxib, dexamethasone, oxycodone), including `mgPerKg`, `maxSingleDoseMg`, `maxDailyDoseMg`, `maxDosesIn24Hours`, `minIntervalHours`, `scheduleType` (`regular` | `selected_days` | `prn`), `isHighRisk`, `requiresPrescriptionConfirmation`, `safetyWarnings`, and a `ruleVersion` string.
- `doseCalculator.ts`: `rawDoseMg = weightKg × mgPerKg`; `doseMg = min(rawDoseMg, maxSingleDoseMg)`; `doseMl = doseMg / concentrationMgPerMl` only when concentration is confirmed.
- `scheduleGenerator.ts`: regular meds → fixed daily times from `preferredScheduleTimes`; dexamethasone → only on `defaultPostOpDays`/`alternativePostOpDays`; oxycodone → no routine schedule, PRN card only.
- `safetyValidator.ts`: reject/flag a "given" log entry that would push doses-in-last-24h above `maxDosesIn24Hours`, or that's inside `minIntervalHours` of the last dose of that medicine.
- Unit tests against the exact testing matrix in `Medication.md` §"Updated Testing Matrix With Expected mg Doses" (10/15/…/90 kg rows) — this is a ready-made table of expected outputs, use it directly as test fixtures.
- **This phase closes the biggest P0 gap**: 3 of 5 medicines currently have no calculation at all.

## Phase 2 — Persistence
- `storage.ts` over `AsyncStorage` (swap-in point for SQLite later, not needed for MVP).
- `childProfile.ts` / `medicationPlan.ts` / `doseLog.ts` / `painCheckIn.ts`: typed read/write helpers matching the data model in `PRD.md` §6 and `Medication.md`'s type skeletons. Every saved `MedicationPlan` stores `ruleVersion`, `weightKgAtCalculation`, `parentConfirmed`, and `createdAt` — the audit trail both spec docs require.

## Phase 3 — Onboarding flow (P0/P1)
Build in spec order, each a separate screen component under `/screens/onboarding`:
1. Splash → Welcome → Disclaimer (checkbox-gated) → **Emergency Warning** (mandatory, unskippable — fixes the dead-code bug in the audit) → Child Setup → **Weight Confirmation** (mandatory, unskippable, with plausibility check + "please check this weight" prompt for outlier values) → Surgery Details (date, type, hospital) → Medication Selection (incl. "Other medicine" and "I'm not sure" modal) → Medication Formulation/Concentration (liquid presets **plus manual entry**, oxycodone extra-confirmation) → Calculated Plan Review (exact required confirmation copy, per-medicine max-daily-dose shown) → Notification Permission/Reminder Setup → Home.
2. Every screen writes into the Phase 2 data layer as the parent progresses, so abandoning setup mid-flow doesn't lose earlier answers.

## Phase 4 — Home dashboard + Medicines tab (P0/P1)
- Full-day schedule list ("Today's Medicines") driven by `scheduleGenerator`, replacing V1's single-next-dose limitation.
- Dose Confirmation Modal (Given / Skip / Cancel) wired through `safetyValidator` before writing to `doseLog`; skip/missed always shows the "do not give extra or double doses" message.
- Oxycodone PRN card: separate from the regular schedule, its own confirmation dialog, hard stop once `safetyValidator` reports 4 doses logged in the last 24h.
- Medicines tab: dose history log, edit-medicines re-entry point (warns before recalculating), reminder settings link.

## Phase 5 — Pain check-in, Timeline, Emergency, Questions (P2)
- Pain Faces Scale component + severity-branched guidance copy from `PRD.md` §4.3, saved via `painCheckIn.ts`.
- Timeline tab: Day 0–14 selector using the richer `RecoveryDay` shape (`whatYouMightNotice`/`focus`/`getHelp`), content ported/expanded from V1's `RECOVERY_DAYS` plus the high-yield structure in `Master Build Prompt.md` §11.
- Emergency tab: interactive bleeding Y/N question → dedicated "Call 000 now" screen with a working `Linking.openURL('tel:000')` action → Grab-and-go checklist as its own screen (not just a card).
- Questions tab: category/search FAQ list from `faqContent.ts`, every bleeding-related entry force-linked to the emergency callout (replacing V1's fragile string match).

## Phase 6 — Reminders, Settings, polish (P3)
- Expo Notifications: scheduled-dose reminder, optional +10–15 min nudge if not ticked, wake-up-time offset reminder.
- Settings: full sections from `UX.md` Screen 25 (child profile, medicine plan + rule version display, reminders, disclaimer/emergency/privacy, app version).
- Visual/copy QA pass against `UX.md` §4 tone rules and the exact confirmation-checkbox/warning copy called out in the audit.

## Sequencing notes
- Phases 1–2 have no UI and can be fully unit-tested before any screen exists — do these first regardless of what else changes, since they're the actual safety-critical logic.
- Phase 3 depends on Phases 1–2 (plan review screen needs the calculator + persistence).
- Phase 4 depends on Phase 3 (dashboard needs a completed plan to show).
- Phases 5–6 are additive and can be reordered relative to each other if priorities shift, but should stay after Phase 4.
- Recommended: implement one phase, get it reviewed/confirmed, then move to the next — per the BUILD step's "one feature/module at a time" instruction — rather than generating all screens in one pass.
