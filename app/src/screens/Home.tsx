import { DoseRows, OxyBlock } from "../components/Doses";
import { AlertIcon, ClockIcon, Face } from "../components/Icons";
import { DAYS, PAIN_COPY, PAIN_SHORT } from "../domain/content";
import { doseLabel } from "../domain/dose";
import { RULES } from "../domain/rules";
import { dateLabel, fmt12, toMin } from "../domain/time";
import { useApp } from "../state/store";

export function Home() {
  const { d, ui, setUi, goTab, openModal, savePain } = useApp();
  const content = DAYS[d.day] ?? DAYS[0];
  const pending = d.todays.filter((x) => x.status === "due" || x.status === "upcoming");
  const next = pending[0] ?? null;
  const overdue = d.todays.filter((x) => x.status === "overdue");
  const givenN = d.todays.filter((x) => x.status === "given").length;

  const savedScore = d.painNow?.score ?? null;
  const shown = ui.painDraft ?? savedScore;
  const isSaved = ui.painDraft === null && savedScore !== null;
  const painColor = shown === null ? "" : shown >= 4 ? "var(--color-accent)" : shown >= 2 ? "var(--pain-mid)" : "var(--brand-sage)";

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

      <div className="section">
        <div className="caps" style={{ marginBottom: 4 }}>
          Pain check-in
        </div>
        <div style={{ font: "800 20px/1.15 var(--font)", letterSpacing: "-.02em", marginBottom: 14 }}>How sore is {d.childName} today?</div>
        <div className="faces" role="radiogroup" aria-label="Pain level">
          {PAIN_SHORT.map((label, i) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={shown === i}
              aria-label={PAIN_COPY[i].label}
              className={"face" + (shown === i ? " on" : "")}
              onClick={() => setUi({ painDraft: i })}
            >
              <Face level={i} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        {shown !== null && (
          <>
            <div className="mt-14" style={{ borderLeft: "4px solid " + painColor, background: "var(--color-surface)", borderRadius: "0 10px 10px 0", padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 6 }}>{PAIN_COPY[shown].label}</div>
              <div className="body-sm">{PAIN_COPY[shown].msg}</div>
              <div style={{ fontSize: 12, lineHeight: 1.45, marginTop: 8, color: "var(--color-accent-700)", fontWeight: 700 }}>
                If there is any fresh bleeding, use SOS or call 000.
              </div>
            </div>
            <button
              type="button"
              className="btn btn-sm mt-12"
              style={{ background: isSaved ? "var(--brand-sage)" : "var(--color-text)", color: "#fff" }}
              onClick={() => !isSaved && savePain(shown)}
            >
              {isSaved ? "Pain check-in saved ✓" : "Save pain check-in"}
            </button>
          </>
        )}
      </div>

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
