/**
 * Shared types for the clinical medication engine.
 *
 * These mirror the type skeletons specified in Medication.md and
 * Master Build Prompt.md section 10. Keep this file free of any
 * React Native / Expo imports: the engine must be runnable and
 * testable in isolation from the UI.
 */

export type CalculationType = "mg_per_kg";

export type ScheduleType = "regular" | "selected_days" | "prn";

export type FormulationType = "liquid" | "tablet" | "capsule" | "other";

export type RoundingSafety = "round_down" | "round_nearest";

/**
 * Decimal places to preserve when rounding a dose in milligrams.
 *
 * Set per medicine, because a whole milligram means very different things at
 * 15 mg/kg and at 0.1 mg/kg. Paracetamol at 20 kg is 300 mg, where +/-0.5 mg is
 * noise. Oxycodone at 15 kg is 1.5 mg, where rounding to a whole milligram is
 * a 33% change to an opioid dose in a child.
 *
 *   0 -> whole milligrams   (paracetamol, ibuprofen, celecoxib)
 *   1 -> tenths of a mg     (dexamethasone, oxycodone)
 */
export type MgPrecision = 0 | 1 | 2;

/**
 * A single medication's dosing rule.
 *
 * IMPORTANT: this is the ONLY place dosing constants may live. No screen,
 * component, or helper may hardcode a mg/kg figure or a maximum. See
 * PRD.md section 9 ("central dosing rules file or table, not hard-coded
 * scattered calculations").
 */
export type MedicationRule = {
  id: string;
  genericName: string;
  brandNames: string[];
  displayName: string;

  /** Audit metadata. Every calculated plan records the ruleVersion in force. */
  ruleVersion: string;
  source: string;
  /** null until a clinician has signed the rule off. Surfaced in the UI. */
  reviewedBy: string | null;
  reviewedDate: string | null;

  isHighRisk: boolean;
  requiresPrescriptionConfirmation: boolean;

  /**
   * How the safety validator reports a 24h/interval/daily-max breach.
   *
   * "warn"  Parent sees the message and must acknowledge, but may proceed.
   *         Discharge paperwork legitimately overrides app defaults, and a
   *         modal a parent cannot dismiss at 3am is its own hazard.
   * "block" Hard stop. The UI must not offer a way through.
   *
   * Deliberately separate from `isHighRisk`: oxycodone remains high-risk for
   * prescription-confirmation and sedation warnings regardless of this dial.
   */
  breachSeverity: "warn" | "block";

  calculationType: CalculationType;
  mgPerKg: number;
  maxSingleDoseMg: number;
  maxDailyDoseMg: number;
  maxDosesIn24Hours: number;

  frequencyLabel: string;
  dosesPerDay: number;
  minIntervalHours: number;
  /** Empty for PRN medicines, which are never routinely scheduled. */
  preferredScheduleTimes: string[];

  scheduleType: ScheduleType;
  /** Only meaningful when scheduleType === "selected_days". */
  defaultPostOpDays?: number[];
  alternativePostOpDays?: number[];

  startPostOpDay: number;
  endPostOpDay: number;
  durationLabel: string;

  roundingSafety: RoundingSafety;
  /** See MgPrecision. Governs how far the mg dose is rounded. */
  mgPrecision: MgPrecision;

  allowedFormulations: FormulationType[];
  safetyWarnings: string[];
};

/** Result of a dose calculation for one medicine at one weight. */
export type CalculatedDose = {
  medicationId: string;
  displayName: string;

  doseMg: number;
  /** Present ONLY when a liquid concentration has been confirmed. */
  doseMl?: number;
  concentrationMgPerMl?: number;

  /** True when mg/kg math exceeded maxSingleDoseMg and was capped. */
  capped: boolean;

  frequencyLabel: string;
  maxSingleDoseMg: number;
  maxDailyDoseMg: number;
  maxDosesIn24Hours: number;
  minIntervalHours: number;
  scheduleType: ScheduleType;
  safetyWarnings: string[];

  ruleVersion: string;
  weightKgAtCalculation: number;
};

export type DoseStatus =
  | "upcoming"
  | "due"
  | "given"
  | "skipped"
  | "missed"
  | "overdue";

export type ScheduledDose = {
  id: string;
  medicationId: string;
  displayName: string;
  /** ISO 8601. */
  scheduledDateTime: string;
  postOpDay: number;
  doseMg: number;
  doseMl?: number;
  status: DoseStatus;
  actualGivenDateTime?: string;
};

export type DoseLogEntry = {
  id: string;
  medicationId: string;
  displayName: string;
  scheduledDoseId?: string;
  scheduledDateTime?: string;
  /** ISO 8601. When the dose was actually given. */
  actualDateTime: string;
  doseMg: number;
  doseMl?: number;
  status: "given" | "skipped" | "missed";
  postOpDay: number;
};
