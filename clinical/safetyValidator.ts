/**
 * SAFETY VALIDATOR
 * ================
 *
 * Guards every attempt to record a dose as given. Pure functions over the
 * existing dose log; no storage or UI imports.
 *
 * Enforces the three limits the specs require and V1 had none of:
 *   1. Maximum doses in a rolling 24 hours   (PRD 3.3, Build Prompt 3)
 *   2. Minimum interval since the last dose  (Medication.md rules table)
 *   3. Maximum total milligrams per 24 hours (PRD 3.3)
 *
 * "Rolling" is literal: a 24-hour window measured backwards from the moment
 * of the proposed dose, not a calendar day. A calendar-day reset would let a
 * parent give 4 doses at 8pm and 4 more at 1am.
 *
 * DESIGN NOTE — advisory vs blocking
 * ----------------------------------
 * This module reports a verdict; it does not decide the UI's response.
 * Severity comes from each rule's `breachSeverity` dial, currently "warn"
 * for all five medicines by product decision: a parent must acknowledge the
 * warning but may still proceed, because discharge paperwork legitimately
 * overrides app defaults and an undismissable modal at 3am is its own hazard.
 *
 * Severity governs only whether the parent can proceed — never how strongly
 * the message reads. High-risk medicines keep their full-strength wording
 * ("Do not give another dose unless advised by a doctor") at "warn".
 *
 * Callers must honour `severity`. Never auto-dismiss a "block" if a rule is
 * ever switched back to one.
 *
 * This module NEVER suggests a catch-up or double dose. Per Build Prompt 17,
 * a missed dose yields the standard do-not-double-dose message and nothing else.
 */

import type { CalculatedDose, DoseLogEntry, MedicationRule } from "./types.ts";

const HOUR_MS = 60 * 60 * 1000;
const WINDOW_MS = 24 * HOUR_MS;
const EPSILON = 1e-9;

export type Severity = "ok" | "warn" | "block";

export type SafetyIssue = {
  code:
    | "max_doses_24h"
    | "min_interval"
    | "max_daily_mg"
    | "duplicate_dose"
    | "rules_unreviewed";
  severity: Severity;
  /** Parent-facing copy. Written to be shown verbatim. */
  message: string;
};

export type SafetyVerdict = {
  severity: Severity;
  issues: SafetyIssue[];
  /** Doses of this medicine already logged as given in the trailing 24h. */
  dosesInWindow: number;
  /** Milligrams of this medicine already given in the trailing 24h. */
  mgInWindow: number;
  /** Hours since the most recent given dose, or null if none. */
  hoursSinceLastDose: number | null;
};

/** The standard missed/skipped-dose message. Required copy, do not reword. */
export const DO_NOT_DOUBLE_DOSE_MESSAGE =
  "Do not give extra or double doses unless advised by your doctor or " +
  "pharmacist. Continue according to your discharge instructions or seek " +
  "advice if unsure.";

/** Shown when required inputs are incomplete. Required copy, do not reword. */
export const CANNOT_CALCULATE_MESSAGE =
  "This medicine cannot be calculated yet. Please check your discharge " +
  "instructions or speak to your pharmacist or treating team.";

function parseTime(iso: string): number {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? Number.NaN : ms;
}

/**
 * Given doses of one medicine inside the 24 hours preceding `atTime`,
 * most recent first. Skipped and missed entries are excluded: they represent
 * medicine that was never administered.
 */
export function givenDosesInWindow(
  log: DoseLogEntry[],
  medicationId: string,
  atTime: Date,
): DoseLogEntry[] {
  const cutoff = atTime.getTime() - WINDOW_MS;

  return log
    .filter((entry) => entry.medicationId === medicationId)
    .filter((entry) => entry.status === "given")
    .filter((entry) => {
      const t = parseTime(entry.actualDateTime);
      if (Number.isNaN(t)) return false;
      // Strictly inside the window, and never in the future.
      return t > cutoff && t <= atTime.getTime();
    })
    .sort((a, b) => parseTime(b.actualDateTime) - parseTime(a.actualDateTime));
}

/**
 * Evaluate whether recording `dose` as given at `atTime` is safe.
 *
 * `rule` and `dose` are both required so the validator can cross-check the
 * dose against the rule it claims to derive from, rather than trusting a
 * possibly stale calculated value.
 */
export function validateDoseAdministration(params: {
  rule: MedicationRule;
  dose: CalculatedDose;
  log: DoseLogEntry[];
  atTime: Date;
  /** Set when re-confirming an already-recorded scheduled dose. */
  scheduledDoseId?: string;
}): SafetyVerdict {
  const { rule, dose, log, atTime, scheduledDoseId } = params;

  const inWindow = givenDosesInWindow(log, rule.id, atTime);
  const dosesInWindow = inWindow.length;
  const mgInWindow = inWindow.reduce((sum, entry) => sum + entry.doseMg, 0);

  const lastDose = inWindow[0];
  const hoursSinceLastDose = lastDose
    ? (atTime.getTime() - parseTime(lastDose.actualDateTime)) / HOUR_MS
    : null;

  const issues: SafetyIssue[] = [];

  // 1. Already recorded? Surfaces the UX 6.3 "marked twice" flow.
  if (scheduledDoseId) {
    const already = log.find(
      (entry) =>
        entry.scheduledDoseId === scheduledDoseId && entry.status === "given",
    );
    if (already) {
      const when = new Date(already.actualDateTime).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      issues.push({
        code: "duplicate_dose",
        severity: "warn",
        message: `This dose has already been marked as given at ${when}.`,
      });
    }
  }

  // 2. Rolling 24-hour dose count.
  if (dosesInWindow >= rule.maxDosesIn24Hours) {
    // High-risk medicines keep the stronger wording even when the rule's
    // breachSeverity is only "warn": the parent may proceed, but the message
    // must not soften. Required copy, Build Prompt 6.16.
    issues.push({
      code: "max_doses_24h",
      severity: rule.breachSeverity,
      message: rule.isHighRisk
        ? `Maximum recorded ${rule.displayName.toLowerCase()} doses in 24 hours ` +
          "reached. Do not give another dose unless advised by a doctor."
        : `${rule.displayName} has already been given ${dosesInWindow} ` +
          `time${dosesInWindow === 1 ? "" : "s"} in the last 24 hours ` +
          `(maximum ${rule.maxDosesIn24Hours}). ` +
          DO_NOT_DOUBLE_DOSE_MESSAGE,
    });
  }

  // 3. Minimum interval since the previous dose.
  if (
    hoursSinceLastDose !== null &&
    hoursSinceLastDose < rule.minIntervalHours - EPSILON
  ) {
    const remaining = rule.minIntervalHours - hoursSinceLastDose;
    issues.push({
      code: "min_interval",
      severity: rule.breachSeverity,
      message:
        `${rule.displayName} was last given ${formatHours(hoursSinceLastDose)} ago. ` +
        `Doses should be at least ${rule.minIntervalHours} hours apart ` +
        `(about ${formatHours(remaining)} remaining). ` +
        DO_NOT_DOUBLE_DOSE_MESSAGE,
    });
  }

  // 4. Total milligrams across the window.
  if (mgInWindow + dose.doseMg > rule.maxDailyDoseMg + EPSILON) {
    issues.push({
      code: "max_daily_mg",
      severity: rule.breachSeverity,
      message:
        `This would take ${rule.displayName.toLowerCase()} above its maximum of ` +
        `${rule.maxDailyDoseMg} mg in 24 hours. ` +
        DO_NOT_DOUBLE_DOSE_MESSAGE,
    });
  }

  // 5. Rules not yet clinically signed off.
  if (rule.reviewedBy === null) {
    issues.push({
      code: "rules_unreviewed",
      severity: "warn",
      message:
        "These dose rules have not yet been clinically reviewed. Always check " +
        "against your child's discharge paperwork.",
    });
  }

  return {
    severity: highestSeverity(issues),
    issues,
    dosesInWindow,
    mgInWindow,
    hoursSinceLastDose,
  };
}

function highestSeverity(issues: SafetyIssue[]): Severity {
  if (issues.some((i) => i.severity === "block")) return "block";
  if (issues.some((i) => i.severity === "warn")) return "warn";
  return "ok";
}

function formatHours(hours: number): string {
  if (hours < 1) {
    const mins = Math.max(1, Math.round(hours * 60));
    return `${mins} minute${mins === 1 ? "" : "s"}`;
  }
  const rounded = Math.round(hours * 10) / 10;
  return `${rounded} hour${rounded === 1 ? "" : "s"}`;
}

/**
 * Remaining oxycodone allowance, for the PRN card's "last given" display.
 * Applies to any PRN medicine, but oxycodone is the only one in the table.
 */
export function prnAvailability(params: {
  rule: MedicationRule;
  log: DoseLogEntry[];
  atTime: Date;
}): {
  dosesUsed: number;
  dosesRemaining: number;
  nextDoseAllowedAt: Date | null;
  lastGivenAt: Date | null;
  canGiveNow: boolean;
} {
  const { rule, log, atTime } = params;

  const inWindow = givenDosesInWindow(log, rule.id, atTime);
  const dosesUsed = inWindow.length;
  const dosesRemaining = Math.max(0, rule.maxDosesIn24Hours - dosesUsed);

  const lastGivenAt = inWindow[0]
    ? new Date(inWindow[0].actualDateTime)
    : null;

  // Earliest time the interval permits another dose.
  const intervalClear = lastGivenAt
    ? new Date(lastGivenAt.getTime() + rule.minIntervalHours * HOUR_MS)
    : null;

  // If the count is maxed, the next dose waits for the oldest to age out.
  const oldestInWindow = inWindow[inWindow.length - 1];
  const countClear =
    dosesRemaining === 0 && oldestInWindow
      ? new Date(parseTime(oldestInWindow.actualDateTime) + WINDOW_MS)
      : null;

  const candidates = [intervalClear, countClear].filter(
    (d): d is Date => d !== null,
  );
  const nextDoseAllowedAt = candidates.length
    ? new Date(Math.max(...candidates.map((d) => d.getTime())))
    : null;

  const canGiveNow =
    dosesRemaining > 0 &&
    (nextDoseAllowedAt === null || nextDoseAllowedAt.getTime() <= atTime.getTime());

  return {
    dosesUsed,
    dosesRemaining,
    nextDoseAllowedAt,
    lastGivenAt,
    canGiveNow,
  };
}
