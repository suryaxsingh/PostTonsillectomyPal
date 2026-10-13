import { doseLabel } from "../domain/dose";
import { RULES, OXY_WARNING } from "../domain/rules";
import type { DoseWithStatus } from "../domain/schedule";
import { fmt12, fmtTime } from "../domain/time";
import { useApp } from "../state/store";

const STATUS_LABEL = { given: "given", skipped: "skipped", overdue: "overdue", due: "due now", upcoming: "" } as const;

export function DoseRows() {
  const { d, openModal } = useApp();
  if (d.todays.length === 0) {
    return <div className="body-sm" style={{ padding: "12px 0" }}>No scheduled medicines today.</div>;
  }
  return (
    <>
    <div className="list">
      {d.todays.map((dose) => (
        <DoseRow
          key={dose.key}
          dose={dose}
          label={doseLabel(d.doses[dose.medId])}
          onTap={() => {
            if (!d.hasWeight) openModal({ kind: "needWeight" });
            else openModal({ kind: dose.status === "given" ? "already" : "confirm", dose });
          }}
        />
      ))}
    </div>
    <div className="meta mt-8" style={{ fontWeight: 600 }}>
      Times are worked out from when each dose is actually given — the next dose moves if one is given early or late.
    </div>
    </>
  );
}

function DoseRow({ dose, label, onTap }: { dose: DoseWithStatus; label: string; onTap: () => void }) {
  const given = dose.status === "given" && dose.record;
  const name = RULES[dose.medId].shortName;
  return (
    <button type="button" className={"dose-row " + dose.status} onClick={onTap} aria-label={`${fmt12(dose.time)} ${name}, ${label}${STATUS_LABEL[dose.status] ? ", " + STATUS_LABEL[dose.status] : ""}`}>
      <span className="box" aria-hidden="true">
        {dose.status === "given" ? "✓" : dose.status === "skipped" ? "–" : ""}
      </span>
      <span className="time">{fmt12(dose.time)}</span>
      <span className="what">
        <b>{name}</b>
        <small>
          {label}
          {given ? " · given " + fmtTime(dose.record!.at) : ""}
        </small>
      </span>
      {STATUS_LABEL[dose.status] && <span className="tag">{STATUS_LABEL[dose.status]}</span>}
    </button>
  );
}

/** The oxycodone block. Always present; never shows a numeric dose unless prescribed and weight known. */
export function OxyBlock({ detailed = false }: { detailed?: boolean }) {
  const { d, go, openModal } = useApp();
  const calc = d.doses.oxycodone;
  const active = d.oxyInPlan && d.hasWeight && !!calc;
  const s = d.oxySafety;
  const headline = !d.oxyInPlan ? "Oxycodone — not in this plan" : !d.hasWeight ? "Oxycodone — weight needed" : "Oxycodone — only if needed";
  const doseShown = active ? calc.doseMg + " mg" : "—";
  const mlShown = !d.oxyInPlan
    ? "Doses appear once it is added to the plan"
    : !active
      ? "Enter a weight to see the dose"
      : calc.doseMl !== null
        ? calc.doseMl + " mL"
        : calc.form === "liquid"
          ? "mL dose not shown — concentration not confirmed"
          : "";
  const give = () => openModal({ kind: s.blocked ? "oxyBlocked" : "oxy" });
  const alt = () => (d.oxyInPlan || !d.hasWeight ? go("childSetup") : openModal({ kind: "editMeds" }));
  const count = s.countIn24h + " of " + s.max + " doses recorded in the last 24 hours";

  return (
    <div className="card-red">
      <div className="kicker-sm">{detailed ? "High-risk · PRN only" : "Extra pain relief · only if needed"}</div>
      {detailed ? (
        <>
          <div style={{ font: "800 19px/1.15 var(--font)", letterSpacing: "-.02em", marginBottom: 10 }}>{headline}</div>
          <div style={{ font: "800 26px/1 var(--font)", letterSpacing: "-.03em" }}>{doseShown}</div>
          {mlShown ? (
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--color-accent-700)", margin: "5px 0 12px" }}>{mlShown}</div>
          ) : (
            <div style={{ height: 12 }} />
          )}
          <div className="grid-2 mb-12">
            <div>
              <div className="mini-label">Max per dose</div>
              <b>{RULES.oxycodone.maxSingleDoseMg} mg</b>
            </div>
            <div>
              <div className="mini-label">Max / 24 hrs</div>
              <b>{RULES.oxycodone.maxDosesIn24Hours} doses</b>
            </div>
            <div>
              <div className="mini-label">Min interval</div>
              <b>{RULES.oxycodone.minIntervalHours} hrs</b>
            </div>
            <div>
              <div className="mini-label">Last given</div>
              <b>{s.last ? fmtTime(s.last.at) + (s.last.slotDate !== d.today ? " yesterday" : "") : "not given today"}</b>
            </div>
          </div>
          <div className="rule-note warn mb-14">{OXY_WARNING}</div>
        </>
      ) : (
        <>
          <div className="row mb-10">
            <div style={{ font: "800 18px/1.15 var(--font)", letterSpacing: "-.02em" }}>{headline}</div>
            <div style={{ font: "800 24px/1 var(--font)", letterSpacing: "-.03em", flex: "none" }}>{doseShown}</div>
          </div>
          {active && <div className="rule-note warn mb-12">{OXY_WARNING}</div>}
        </>
      )}
      {active ? (
        <>
          <button type="button" className="btn btn-red btn-sm" onClick={give}>
            Give a dose now
          </button>
          <div className="meta mt-8">{count}</div>
        </>
      ) : (
        <>
          <button type="button" className="btn btn-outline-red btn-sm" onClick={alt}>
            {d.oxyInPlan ? "Enter your child's weight" : "Add oxycodone to the plan"}
          </button>
          <div className="meta mt-8">
            {d.oxyInPlan ? "Prescribed, but the dose needs your child's weight." : "Not in this child's plan. Only add it if a doctor prescribed it."}
          </div>
        </>
      )}
    </div>
  );
}
