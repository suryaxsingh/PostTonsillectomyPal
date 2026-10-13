import type { ReactNode } from "react";
import { Kv, Tick } from "../components/bits";
import { HOSPITALS } from "../domain/content";
import { doseLabel } from "../domain/dose";
import { RULES, RULE_VERSION } from "../domain/rules";
import { dateLabel, fmt12, parseDateKey } from "../domain/time";
import { requestPermission } from "../state/notifications";
import { useApp } from "../state/store";
import type { Reminders } from "../state/types";

export function Settings() {
  const { p, d, set, go, goTab, openModal, notifyPerm, setNotifyPerm } = useApp();
  const hospital = HOSPITALS.find(([v]) => v === p.hospital)?.[1] ?? p.hospital;
  const first = d.todays[0];
  const wakeAt = first ? fmt12(minus60(first.time)) : "—";
  const reminderRows: [keyof Reminders, string, string?][] = [
    ["due", "Medicine due"],
    ["notTicked", "Not ticked off"],
    ["wake", "Before wake-up", wakeAt],
    ["pain", "Pain check-ins", "9 am · 2 pm · 7 pm"],
  ];

  return (
    <div className="pad">
      <button type="button" className="btn-back" onClick={() => goTab("home")}>
        ← Home
      </button>

      <Group title="Child profile">
        <Kv k="Name" v={p.nickname.trim() || "—"} />
        <Kv k="Age" v={p.age ? p.age + " years" : "—"} />
        <Kv k="Weight" v={d.hasWeight ? d.weightKg + " kg" : "not recorded"} />
        <Kv k="Surgery date" v={p.surgeryDate ? dateLabel(parseDateKey(p.surgeryDate)) : "—"} />
        <Kv k="Hospital" v={hospital} />
      </Group>

      <Group title="Medicines">
        {d.selectedIds.map((id) => (
          <Kv key={id} k={RULES[id].shortName} v={doseLabel(d.doses[id])} />
        ))}
        <Kv k="Rule version" v={RULE_VERSION} />
        <Kv k="Plan version" v={p.planVersion || "—"} />
      </Group>

      <Group title="Reminders">
        {reminderRows.map(([k, label, extra]) => (
          <button
            key={k}
            type="button"
            role="switch"
            aria-checked={p.reminders[k]}
            className="list-row"
            style={{ padding: "12px 0", borderRadius: 0 }}
            onClick={() => set((prev) => ({ reminders: { ...prev.reminders, [k]: !prev.reminders[k] } }))}
          >
            <Tick on={p.reminders[k]} />
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{label}</span>
            <span style={{ marginLeft: "auto", fontSize: 13.5, opacity: 0.65 }}>{p.reminders[k] ? "On" + (extra ? " · " + extra : "") : "Off"}</span>
          </button>
        ))}
        <Kv
          k="Notifications"
          v={notifyPerm === "granted" ? "Allowed" : notifyPerm === "denied" ? "Blocked in phone settings" : notifyPerm === "unsupported" ? "Not supported here" : "Not yet allowed"}
        />
        {notifyPerm === "default" && (
          <button type="button" className="btn btn-primary btn-sm mt-10" onClick={async () => setNotifyPerm(await requestPermission())}>
            Allow notifications
          </button>
        )}
      </Group>

      <Group title="Safety">
        <Kv k="Medical disclaimer" v={p.disclaimerAck ? "Accepted" : "Not yet accepted"} />
        <Kv k="Emergency instructions" v="Always available" />
        <Kv k="Data" v="This device only" />
      </Group>

      <div className="stack gap-10 mb-18">
        <button type="button" className="btn btn-outline compact" onClick={() => (d.hasWeight ? openModal({ kind: "editMeds" }) : go("childSetup"))}>
          Add or edit prescribed medicines
        </button>
        <button type="button" className="btn btn-outline compact" onClick={() => exportLog(p)}>
          Download dose record (CSV)
        </button>
        <button type="button" className="btn btn-outline compact btn-outline-red" onClick={() => openModal({ kind: "reset" })}>
          Start over — clear this child's setup
        </button>
      </div>
      <div style={{ fontSize: 11.5, lineHeight: 1.5, opacity: 0.6 }}>
        Post Tonsillectomy Pal · Clinical rules {RULE_VERSION} · Data stored on this device only. This app does not replace medical advice.
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div className="caps mb-10">{title}</div>
      <div className="list">{children}</div>
    </div>
  );
}

function minus60(t: string) {
  const [h, m] = t.split(":").map(Number);
  const total = (h * 60 + m - 60 + 1440) % 1440;
  return String(Math.floor(total / 60)).padStart(2, "0") + ":" + String(total % 60).padStart(2, "0");
}

/** The full append-only log, including retractions, for sharing with a clinician. */
function exportLog(p: ReturnType<typeof useApp>["p"]) {
  const head = ["recorded_at", "type", "medicine", "scheduled_date", "scheduled_time", "dose_mg", "dose_ml", "weight_kg", "rule_version", "plan_version", "event_id", "retracts"];
  const csv = (cells: (string | number)[]) => cells.map((c) => (/[",\n]/.test(String(c)) ? '"' + String(c).replace(/"/g, '""') + '"' : String(c))).join(",");
  const rows = p.events.map((e) =>
    csv([new Date(e.at).toISOString(), e.type, e.medId, e.slotDate, e.slotTime ?? "PRN", e.doseMg ?? "", e.doseMl ?? "", e.weightKg ?? "", e.ruleVersion, e.planVersion, e.id, e.retracts ?? ""]),
  );
  const pain = p.pain.map((x) => csv([new Date(x.at).toISOString(), "pain", "", x.date, x.slot, "", "", "", "", "", "score " + x.score + (x.note ? " note: " + x.note : ""), ""]));
  const blob = new Blob([[csv(head), ...rows, ...pain].join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "dose-record-" + new Date().toISOString().slice(0, 10) + ".csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
