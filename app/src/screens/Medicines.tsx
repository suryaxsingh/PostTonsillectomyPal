import { AnaesthetistNote } from "../components/bits";
import { DoseRows, OxyBlock } from "../components/Doses";
import { doseLabel } from "../domain/dose";
import { activeEvents } from "../domain/events";
import { RULES } from "../domain/rules";
import { fmtTime } from "../domain/time";
import { useApp } from "../state/store";

export function Medicines() {
  const { p, d, ui, setUi, goTab, go, openModal } = useApp();
  const editMeds = () => (d.hasWeight ? openModal({ kind: "editMeds" }) : go("childSetup"));

  const history = activeEvents(p.events)
    .filter((e) => e.slotDate === d.today)
    .sort((a, b) => a.at - b.at);

  return (
    <>
      <div className="section">
        <div style={{ fontSize: 13, lineHeight: 1.4 }}>
          {d.hasWeight ? "Calculated using your child's weight: " + d.weightKg + " kg" : "No weight recorded yet — doses cannot be calculated. Enter it to see doses."}
        </div>
        <AnaesthetistNote className="mt-10" />
        <button
          type="button"
          className="btn-link red"
          style={{ padding: "8px 0 0", minHeight: 32, fontSize: 12.5 }}
          onClick={() => (d.hasWeight ? openModal({ kind: "weight" }) : go("childSetup"))}
        >
          {d.hasWeight ? "Edit child weight" : "Enter child weight"}
        </button>
      </div>

      <div className="section">
        <div className="caps mb-12">Today's schedule</div>
        <DoseRows />
      </div>

      <div className="section">
        <OxyBlock detailed />
      </div>

      <div className="section">
        <div className="caps mb-12">Medicine plan</div>
        <div className="stack gap-10">
          {d.selectedIds.length === 0 && <div className="body-sm">No medicines in this plan.</div>}
          {d.selectedIds.map((id) => {
            const r = RULES[id];
            const c = d.doses[id];
            const open = ui.openMed === id;
            const form = p.forms[id];
            return (
              <div key={id} className="surface" style={{ padding: 14 }}>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setUi({ openMed: open ? null : id })}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", background: "transparent", border: 0, padding: 0, textAlign: "left", minHeight: 40 }}
                >
                  <span className="stack" style={{ gap: 3 }}>
                    <span style={{ font: "700 15.5px/1.2 var(--font)" }}>{r.name}</span>
                    <span style={{ fontSize: 12, opacity: 0.7, fontWeight: 600 }}>
                      {doseLabel(c)} · {r.freqLabel}
                    </span>
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 800, flex: "none" }} aria-hidden="true">
                    {open ? "–" : "+"}
                  </span>
                </button>
                {open && (
                  <div className="stack gap-8 mt-12" style={{ borderTop: "1px solid var(--color-divider)", paddingTop: 12, fontSize: 12.5 }}>
                    <div>
                      <strong>{form.form === "liquid" ? "Concentration:" : "Form:"}</strong>{" "}
                      {form.form === "liquid"
                        ? c?.conc
                          ? c.conc + " mg/mL confirmed"
                          : "not confirmed — mg dose only"
                        : form.form === "tablet" || form.form === "capsule"
                          ? form.form + "s, " + r.solidUnitMg + " mg each"
                          : form.form}
                    </div>
                    <div>
                      <strong>Active days:</strong> {r.daysLabel}
                    </div>
                    <div>
                      <strong>Max:</strong> {r.maxDosesIn24Hours} doses / 24 hrs · {r.maxSingleDoseMg} mg per dose · {r.minIntervalHours} hr minimum interval
                    </div>
                    {r.warnings.map((w) => (
                      <div key={w} className="rule-note" style={{ paddingLeft: 10 }}>
                        {w}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="pad">
        <div className="caps mb-12">Dose history · today</div>
        <div className="list">
          {history.length === 0 && <div style={{ padding: "11px 0", fontSize: 13, opacity: 0.7 }}>Nothing recorded yet today.</div>}
          {history.map((e) => {
            const given = e.type === "given";
            const prn = e.slotTime === null;
            return (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderBottom: "1px solid var(--color-divider)" }}>
                <span style={{ flex: "none", width: 64, fontSize: 12.5, fontWeight: 800 }}>{fmtTime(e.at)}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>
                  {RULES[e.medId].shortName}
                  {prn ? " (PRN)" : ""}
                  {given && e.doseMg !== null && <span style={{ opacity: 0.6, fontWeight: 500 }}> · {e.doseMg} mg</span>}
                </span>
                <span
                  className="tag"
                  style={{
                    background: !given ? "var(--color-neutral-300)" : prn ? "var(--color-accent)" : "var(--brand-sage)",
                    color: given ? "#fff" : "var(--color-neutral-800)",
                  }}
                >
                  {e.type}
                </span>
              </div>
            );
          })}
        </div>
        <button type="button" className="btn btn-outline compact mt-14" onClick={editMeds}>
          Add or edit prescribed medicines
        </button>
        <button type="button" className="btn btn-outline compact mt-8" onClick={() => goTab("settings")}>
          Change reminder settings
        </button>
      </div>
    </>
  );
}
