import { useEffect, useRef } from "react";
import { doseLabel } from "../domain/dose";
import { RULES } from "../domain/rules";
import { fmt12, toMin } from "../domain/time";
import { notify } from "./notifications";
import { useApp } from "./store";

/** When each pain check-in reminder fires (minutes after midnight). */
export const PAIN_REMINDER_TIMES = { morning: 9 * 60, afternoon: 14 * 60, evening: 19 * 60 };

/** Fires browser notifications for due/overdue doses, the pre-wake reminder and pain check-ins. */
export function useReminders() {
  const { p, d, notifyPerm } = useApp();
  const sent = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (notifyPerm !== "granted" || p.screen !== "app" || !d.hasWeight) return;
    const once = (key: string, title: string, body: string) => {
      const k = d.today + "|" + key;
      if (sent.current.has(k)) return;
      sent.current.add(k);
      void notify(title, body, k);
    };

    for (const dose of d.todays) {
      const name = RULES[dose.medId].shortName;
      const body = doseLabel(d.doses[dose.medId]) + " · scheduled " + fmt12(dose.time);
      if (dose.status === "due" && p.reminders.due) once(dose.key + "|due", "Due now: " + name, body);
      if (dose.status === "overdue" && p.reminders.notTicked) once(dose.key + "|overdue", "Not ticked off: " + name, body);
    }

    const first = d.todays[0];
    if (p.reminders.wake && first) {
      const t = toMin(first.time) - 60;
      if (d.nowMin >= t && d.nowMin < toMin(first.time) && first.status === "upcoming") {
        once("wake", "First medicine in an hour", RULES[first.medId].shortName + " at " + fmt12(first.time));
      }
    }

    const slot = d.painSlotNow;
    if (p.reminders.pain && !d.painToday[slot] && d.nowMin >= PAIN_REMINDER_TIMES[slot]) {
      once("pain-" + slot, "Pain check-in", "How sore is " + d.childName + " right now?");
    }
  }, [d, p.reminders, p.screen, notifyPerm]);
}
