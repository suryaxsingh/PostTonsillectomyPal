# Clinical Decisions Log

Decisions that change dosing behaviour or safety gating. Each entry records what
was decided, why, and what still needs clinician sign-off.

Keep this current. At sign-off, this file is the agenda.

---

## CD-001 — Rounding granularity is set per medicine, not globally

**Date:** 2026-08-14
**Status:** Implemented. Awaiting clinician confirmation.
**Touches:** `clinical/medicationRules.ts` (`mgPrecision`), `clinical/doseCalculator.ts`

### The conflict

The source documents disagree with themselves. The rule skeletons in
`Medication.md` specify `roundingType: "nearest_mg"`. The testing matrix in the
same document expects fractional milligrams for the low-dose medicines:

| Weight | Matrix says | Whole-mg rounding gives | Shift |
|---|---|---|---|
| Oxycodone 15 kg | 1.5 mg | 2 mg | +33% |
| Oxycodone 25 kg | 2.5 mg | 3 mg | +20% |
| Dexamethasone 15 kg | 1.5 mg | 2 mg | +33% |

At 0.1 mg/kg a whole milligram is a third of the dose. At 15 mg/kg it is noise.
The `"nearest_mg"` line reads as though written with paracetamol in mind and
never re-checked against the low-dose drugs.

### Decision

Rounding granularity is a per-medicine field, `mgPrecision`:

| Medicine | mg/kg | Precision | Rationale |
|---|---|---|---|
| Paracetamol | 15 | whole mg | +/-0.5 mg on a 300 mg dose is irrelevant |
| Ibuprofen | 10 | whole mg | as above |
| Celecoxib | 4 | whole mg | as above |
| Dexamethasone | 0.1 | 0.1 mg | whole mg shifts the dose up to 33% |
| Oxycodone | 0.1 | 0.1 mg | as above, and it is an opioid |

This honours the `"nearest_mg"` intent where it is safe and preserves the matrix
where it is not. All 11 matrix rows pass.

Rounding is **always downward**, at every precision. Rounding to nearest could
lift a dose above its single-dose cap. Where under- and over-dosing conflict,
under-dosing is the recoverable error.

### Follow-up

- [ ] Correct the `roundingType: "nearest_mg"` wording in `Medication.md` to
      describe the per-medicine scheme.
- [x] **Confirmed 2026-08-14:** 0.1 mg precision is measurable with the syringes
      supplied locally, so tenth-of-a-milligram doses for dexamethasone and
      oxycodone are deliverable at the bedside, not just arithmetically correct.

---

## CD-002 — Safety breaches warn rather than block

**Date:** 2026-08-14
**Status:** Implemented. Awaiting clinician confirmation.
**Touches:** `clinical/medicationRules.ts` (`breachSeverity`), `clinical/safetyValidator.ts`

### Decision

All five medicines use `breachSeverity: "warn"`. When a parent attempts a dose
that breaches the rolling-24h count, the minimum interval, or the daily
milligram ceiling, they see the warning and must acknowledge it, but may
proceed.

This includes oxycodone, which an earlier draft hard-blocked.

### Rationale

- Discharge paperwork legitimately overrides app defaults. A hard block asserts
  the app is more authoritative than the prescriber, which the disclaimer
  explicitly denies.
- A modal a parent cannot dismiss at 3am is its own hazard. It invites
  workarounds (guessing, not recording the dose) that leave the log less
  accurate than if the dose had simply been recorded with a warning attached.
- An unrecorded dose is worse than a recorded one the app disagreed with: the
  log is the safety artefact.

### What did not change

Severity governs only whether the parent can proceed — never how strongly the
message reads. Oxycodone at its ceiling still says, verbatim:

> Maximum recorded oxycodone doses in 24 hours reached. Do not give another dose
> unless advised by a doctor.

The required copy from `Master Build Prompt.md` 6.16 survives the downgrade, and
a test asserts it. Oxycodone also remains `isHighRisk: true`, which continues to
drive prescription confirmation and the sedation/breathing warnings.

The dial is per-medicine and tested in both positions, so any rule can be
switched back to `"block"` without a rewrite.

### Follow-up

- [ ] Clinician to confirm warn-not-block is acceptable for oxycodone
      specifically, given it is the one opioid in the table.
- [ ] UI must visually distinguish a warn-acknowledge from an ordinary
      confirmation, so acknowledging is a deliberate act rather than a reflex tap.

---

## Open — rules are not yet clinically reviewed

`RULES_CLINICALLY_REVIEWED` is `false` and every rule carries `reviewedBy: null`,
mirroring the `TBD` placeholders in the source documents. The safety validator
emits a `rules_unreviewed` advisory on every dose while this holds.

Do not flip the flag without a named clinician and a date.
