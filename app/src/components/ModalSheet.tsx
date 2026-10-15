import { useEffect, useRef, type ReactNode } from "react";
import { doseLabel, parseWeight, unitWord } from "../domain/dose";
import { safetyCheck } from "../domain/events";
import { RULES } from "../domain/rules";
import { fmt12, fmtTime } from "../domain/time";
import { useApp } from "../state/store";
import type { Modal } from "../state/types";
import { Kv } from "./bits";

interface Action {
  label: string;
  tone: "ink" | "red" | "outline" | "quiet";
  onTap: () => void;
}

interface Spec {
  kicker: string;
  red?: boolean;
  title: string;
  rows?: [string, ReactNode][];
  body?: string;
  bodyRed?: boolean;
  actions: Action[];
}

const H = 3_600_000;

/**
 * One bottom-sheet pattern for every confirmation. Dose actions always go
 * through here: tapping a dose never records it directly.
 */
export function ModalSheet() {
  const app = useApp();
  const { ui, closeModal } = app;
  const sheet = useRef<HTMLDivElement>(null);
  const m = ui.modal;

  useEffect(() => {
    if (!m) return;
    sheet.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeModal();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [m, closeModal]);

  if (!m) return null;
  const spec = build(m, app);
  return (
    <div className="backdrop" onClick={(e) => e.target === e.currentTarget && closeModal()}>
      <div className="sheet" ref={sheet} role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div className="sheet-kicker" style={{ color: spec.red ? "var(--color-accent)" : "var(--color-text)" }}>
          {spec.kicker}
        </div>
        <div className="sheet-title" id="sheet-title">
          {spec.title}
        </div>
        {spec.rows && spec.rows.length > 0 && (
          <div className="list mb-14">
            {spec.rows.map(([k, v]) => (
              <Kv key={k} k={k} v={v} />
            ))}
          </div>
        )}
        {spec.body && <div className={"sheet-body" + (spec.bodyRed ? " red" : "")}>{spec.body}</div>}
        <div className="stack gap-8">
          {spec.actions.map((a) => (
            <button
              key={a.label}
              type="button"
              className={
                "btn " + (a.tone === "ink" ? "btn-ink" : a.tone === "red" ? "btn-red" : a.tone === "outline" ? "btn-outline" : "btn-outline quiet")
              }
              onClick={a.onTap}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function build(m: Modal, app: ReturnType<typeof useApp>): Spec {
  const { p, d, set, go, closeModal, openModal, recordScheduled, retract, recordOxy, resetAll } = app;
  const cancel: Action = { label: "Cancel", tone: "outline", onTap: closeModal };
  const child = p.nickname.trim() || "Your child";

  // Zero-weight gating: no dose can be confirmed without a weight.
  if (m.kind === "needWeight" || ((m.kind === "confirm" || m.kind === "oxy") && !d.hasWeight)) {
    return {
      kicker: "Weight needed",
      red: true,
      title: "Dose not calculated",
      body: "Doses are worked out from your child's weight in kilograms. Enter the weight to see and record doses.",
      bodyRed: true,
      actions: [{ label: "Enter weight", tone: "ink", onTap: () => go("childSetup") }, cancel],
    };
  }

  // A tablet/capsule stronger than the child's dose can never be recorded.
  const tooStrongMed = m.kind === "confirm" ? m.dose.medId : m.kind === "oxy" ? "oxycodone" : null;
  const strong = tooStrongMed ? d.doses[tooStrongMed] : null;
  if (strong?.tooStrong) {
    return {
      kicker: "Check the form",
      red: true,
      title: unitWord(strong, 1).replace(/^./, (c) => c.toUpperCase()) + " too strong",
      rows: [["Medicine", RULES[strong.medId].shortName]],
      body: `The smallest ${RULES[strong.medId].shortName.toLowerCase()} ${unitWord(strong, 1)} is ${strong.unitMg} mg, which is more than ${child === "Your child" ? "your child" : child}'s dose. Switch to the liquid form, or ask your pharmacist.`,
      bodyRed: true,
      actions: [{ label: "Change medicine form", tone: "ink", onTap: () => openModal({ kind: "editMeds" }) }, { label: "Close", tone: "quiet", onTap: closeModal }],
    };
  }

  switch (m.kind) {
    case "confirm": {
      const dose = m.dose;
      const r = RULES[dose.medId];
      const calc = d.doses[dose.medId];
      const st = d.todays.find((x) => x.key === dose.key)?.status;
      const safety = safetyCheck(p.events, dose.medId, d.now);
      const rows: [string, ReactNode][] = [
        ["Child", child],
        ["Medicine", r.shortName],
        ["Dose", doseLabel(calc)],
        ["Scheduled", fmt12(dose.time)],
        ["Now", fmtTime(d.now)],
      ];
      if (safety.blocked) {
        const when = safety.nextAllowedAt ? fmtTime(safety.nextAllowedAt) : "later";
        return {
          kicker: "Check before giving",
          red: true,
          title: safety.blocked === "cap" ? "Maximum doses reached" : "Too soon for this dose",
          rows: [...rows, ["Last given", safety.last ? fmtTime(safety.last.at) : "—"], ["In last 24 hrs", safety.countIn24h + " of " + safety.max]],
          body:
            safety.blocked === "cap"
              ? `${safety.max} ${r.shortName.toLowerCase()} doses are already recorded in the last 24 hours. Do not give another before ${when} unless advised by your doctor or pharmacist.`
              : `${r.shortName} doses should be at least ${r.minIntervalHours} hours apart. Do not give this dose before ${when} unless advised by your doctor or pharmacist.`,
          bodyRed: true,
          actions: [
            { label: "Skip this dose", tone: "outline", onTap: () => (recordScheduled(dose, "skipped"), openModal({ kind: "skipped" })) },
            { label: "Close", tone: "quiet", onTap: closeModal },
          ],
        };
      }
      const noMl = calc && calc.doseMl === null && calc.form === "liquid";
      return {
        kicker: st === "overdue" ? "Overdue dose" : "Confirm",
        red: st === "overdue",
        title: "Mark as given?",
        rows,
        body: noMl
          ? "mL dose not shown because the concentration was not confirmed. Check the bottle or ask your pharmacist before measuring a liquid dose."
          : undefined,
        bodyRed: true,
        actions: [
          { label: "Yes, given now", tone: "ink", onTap: () => (recordScheduled(dose, "given"), closeModal()) },
          { label: "Skip this dose", tone: "outline", onTap: () => (recordScheduled(dose, "skipped"), openModal({ kind: "skipped" })) },
          { label: "Cancel", tone: "quiet", onTap: closeModal },
        ],
      };
    }
    case "already": {
      const row = d.todays.find((x) => x.key === m.dose.key);
      const rec = row?.record ?? null;
      return {
        kicker: "Already recorded",
        title: "This dose was marked as given",
        rows: [
          ["Medicine", RULES[m.dose.medId].shortName],
          ["Given at", rec ? fmtTime(rec.at) : "—"],
          ["Dose", rec?.doseMg != null ? rec.doseMg + " mg" + (rec.doseMl != null ? " · " + rec.doseMl + " mL" : "") : "—"],
          ["Scheduled", fmt12(m.dose.time)],
        ],
        actions: [
          { label: "Keep as recorded", tone: "ink", onTap: closeModal },
          { label: "Mark as not given", tone: "outline", onTap: () => (rec && retract(rec), closeModal()) },
        ],
      };
    }
    case "skipped":
      return {
        kicker: "Dose skipped",
        red: true,
        title: "Do not double dose",
        body: "Do not give extra or double doses unless advised by your doctor or pharmacist. Continue according to your discharge instructions or seek advice if unsure.",
        bodyRed: true,
        actions: [{ label: "I understand", tone: "ink", onTap: closeModal }],
      };
    case "oxy": {
      const calc = d.doses.oxycodone;
      return {
        kicker: "High-risk medicine",
        red: true,
        title: "Record an oxycodone dose?",
        rows: [
          ["Child", child],
          ["Dose", doseLabel(calc)],
          ["Now", fmtTime(d.now)],
          ["In last 24 hrs", d.oxySafety.countIn24h + " of " + d.oxySafety.max],
        ],
        body: "Only give this medicine if it was prescribed and your child needs it. Oxycodone can cause sleepiness and breathing problems.",
        bodyRed: true,
        actions: [{ label: "Yes, given now", tone: "red", onTap: recordOxy }, cancel],
      };
    }
    case "oxyBlocked": {
      const s = safetyCheck(p.events, "oxycodone", Date.now());
      const when = s.nextAllowedAt ? fmtTime(s.nextAllowedAt) + (s.nextAllowedAt - d.now > 12 * H ? " tomorrow" : "") : "later";
      const cap = s.blocked !== "interval";
      return {
        kicker: cap ? "Maximum reached" : "Too soon",
        red: true,
        title: "Do not give another dose",
        rows: [
          ["Last given", s.last ? fmtTime(s.last.at) : "—"],
          ["In last 24 hrs", s.countIn24h + " of " + s.max],
        ],
        body: cap
          ? `Maximum recorded oxycodone doses in 24 hours reached. Do not give another dose before ${when} unless advised by a doctor.`
          : `Oxycodone doses must be at least ${RULES.oxycodone.minIntervalHours} hours apart. Do not give another dose before ${when} unless advised by a doctor.`,
        bodyRed: true,
        actions: [{ label: "I understand", tone: "red", onTap: closeModal }],
      };
    }
    case "weight":
      return {
        kicker: "Recalculation",
        red: true,
        title: "Changing weight recalculates doses",
        body: "Only continue if the previous weight was incorrect. You will need to confirm the new plan against your discharge instructions again.",
        bodyRed: true,
        actions: [{ label: "Continue and recalculate", tone: "ink", onTap: () => (set({ planConfirmed: false }), go("childSetup")) }, cancel],
      };
    case "checkWeight": {
      const age = parseWeight(p.age);
      return {
        kicker: "Check weight",
        red: true,
        title: `Is ${d.weightKg} kg right?`,
        body:
          (age ? `That is unusual for a child aged ${p.age}. ` : "That is outside the usual range for a child. ") +
          "Medicine doses are calculated from this number — check it against your child's recent hospital or clinic weight.",
        bodyRed: true,
        actions: [
          { label: "Edit weight", tone: "ink", onTap: closeModal },
          { label: "Yes, the weight is correct", tone: "outline", onTap: () => go("weightConfirm") },
        ],
      };
    }
    case "notSure":
      return {
        kicker: "Not sure?",
        title: "Contact your GP, treating team or anaesthetist",
        body: "Only select medicines that were prescribed. If you are unsure, check your discharge paperwork or contact your GP, treating team or anaesthetist.",
        actions: [
          { label: "Go back", tone: "ink", onTap: closeModal },
          { label: "Continue without medicines", tone: "outline", onTap: () => (set({ selected: {}, planConfirmed: false }), app.setUi({ weightRetype: "" }), go("weightRetype")) },
        ],
      };
    case "reset":
      return {
        kicker: "Start over",
        red: true,
        title: "Clear this child's setup?",
        body: "This deletes the child profile, medicine plan, and all dose records from this device. It cannot be undone. Download the dose record first if you need it.",
        bodyRed: true,
        actions: [{ label: "Clear everything", tone: "red", onTap: resetAll }, cancel],
      };
    case "editMeds":
      return {
        kicker: "Edit medicines",
        title: "Only change medicines if advised",
        body: "Only change medicines if your doctor, pharmacist, or discharge paperwork says to. Previous dose records are kept against the old plan version.",
        actions: [{ label: "Edit medicines", tone: "ink", onTap: () => (set({ planConfirmed: false }), go("medSelect")) }, cancel],
      };
  }
}
