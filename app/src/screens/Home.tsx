import { DoseRows, OxyBlock } from "../components/Doses";
import { AlertIcon, ClockIcon } from "../components/Icons";
import { PainCheckIn } from "../components/PainCheckIn";
import { DAYS } from "../domain/content";
import { doseLabel } from "../domain/dose";
import { RULES } from "../domain/rules";
import { dateLabel, fmt12, toMin } from "../domain/time";
import { useApp } from "../state/store";

export function Home() {
  const { d, setUi, goTab, openModal } = useApp();
  const content = DAYS[d.day] ?? DAYS[0];
  const pending = d.todays.filter((x) => x.status === "due" || x.status === "upcoming");
  const next = pending[0] ?? null;
  const overdue = d.todays.filter((x) => x.status === "overdue");
  const givenN = d.todays.filter((x) => x.status === "given").length;


  return (
    <>
      <div className="hero">
        <div className="blob" />
        <div className="hero-date">{dateLabel(d.now)}</div>
        <div className="hero-day">Day {d.day}</div>
        <div className="hero-title">{content.t.split(": ")[1] ?? content.t}</div>
        <div
          className="hero-progress"
          role="progressbar"
          aria-label="Recovery progress"
          aria-valuemin={0}
          aria-valuemax={14}
          aria-valuenow={d.day}
        >
          <div style={{ width: Math.max(4, (d.day / 14) * 100) + "%" }} />
        </div>
        <div className="hero-msg">{content.f.join(". ") + "."}</div>
      </div>

      <div className="section">
        <div className="kicker-sm" style={{ fontSize: 11, letterSpacing: ".12em", marginBottom: 10 }}>
          Next medicine due
        </div>
        {!d.hasWeight ? (
          <div style={{ fontSize: 13.5, lineHeight: 1.45 }}>Doses cannot be shown until your child's weight is recorded. Add it in the Medicines tab.</div>
        ) : d.todays.length === 0 ? (
          <div style={{ fontSize: 13.5, lineHeight: 1.45 }}>No medicine schedule. If your child was prescribed medicines, add them in the Medicines tab.</div>
        ) : next ? (
          <>
            <div className="row mb-12">
              <div>
                <div style={{ font: "800 22px/1.1 var(--font)", letterSpacing: "-.02em" }}>{RULES[next.medId].shortName}</div>
                <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.7, marginTop: 4 }}>{doseLabel(d.doses[next.medId])}</div>
              </div>
              <div style={{ textAlign: "right", flex: "none" }}>
                <div className="big">{fmt12(next.time)}</div>
                <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.6, marginTop: 3 }}>{relative(toMin(next.time) - d.nowMin)}</div>
              </div>
            </div>
            <button type="button" className="btn btn-ink" style={{ padding: "17px 18px" }} onClick={() => openModal({ kind: "confirm", dose: next })}>
              Mark as given
            </button>
          </>
        ) : (
          <div style={{ fontSize: 13.5, lineHeight: 1.45 }}>
            No more scheduled doses today. {overdue.length ? "Check the overdue dose below." : "Tomorrow's schedule starts after midnight."}
          </div>
        )}
      </div>

      <div className="section">
        <OxyBlock />
      </div>

      {overdue.length > 0 && d.hasWeight && (
        <div className="overdue-banner" role="status">
          <span style={{ color: "var(--color-accent-700)", flex: "none", marginTop: 1 }}>
            <ClockIcon />
          </span>
          <div>
            {fmt12(overdue[0].time)} {RULES[overdue[0].medId].shortName} has not been ticked off. Do not give extra or double doses unless advised by your
            doctor or pharmacist.
          </div>
        </div>
      )}

      <div className="section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <div className="caps">Today's medicines</div>
          <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.55 }}>
            {givenN} of {d.todays.length} given
          </div>
        </div>
        <DoseRows />
      </div>

      <PainCheckIn />

      <div className="section">
        <button type="button" className="bleed-banner" onClick={() => goTab("emergency")}>
          <AlertIcon size={20} />
          <span>
            <b>Any fresh bleeding?</b> Bleeding from the mouth, vomiting blood or clots — open SOS and call 000.
          </span>
        </button>
      </div>

      <div className="pad">
        <div className="caps mb-10">Today's recovery tip</div>
        <div className="card" style={{ fontSize: 13.5, lineHeight: 1.5 }}>
          {content.tip}
        </div>
        <button type="button" className="btn btn-outline compact mt-12" onClick={() => setTimelineAndGo(d.day)}>
          Open Day {d.day} in the timeline
        </button>
      </div>
    </>
  );

  function setTimelineAndGo(day: number) {
    goTab("timeline");
    setUi({ timelineDay: day });
  }
}

function relative(diffMin: number): string {
  if (diffMin <= 0) return "due now";
  if (diffMin < 60) return "in " + diffMin + " min";
  return "in " + Math.round((diffMin / 60) * 10) / 10 + " hrs";
}
