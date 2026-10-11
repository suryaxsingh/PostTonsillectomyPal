import { DAYS, WHEN_TO_GET_HELP } from "../domain/content";
import { useApp } from "../state/store";

export function Timeline() {
  const { d, ui, setUi, goTab } = useApp();
  const sel = ui.timelineDay ?? d.day;
  const tl = DAYS[sel] ?? DAYS[0];
  return (
    <>
      <div style={{ padding: "14px 0 0", borderBottom: "1px solid var(--color-divider)" }}>
        <div className="day-chips" role="tablist" aria-label="Recovery day">
          {DAYS.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === sel}
              aria-label={"Day " + i + (i === d.day ? " (today)" : "")}
              className={(i === sel ? "on" : "") + (i === d.day ? " today" : "")}
              onClick={() => setUi({ timelineDay: i })}
            >
              {i}
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: "18px 16px" }}>
        {sel === d.day && <div className="today-pill">Today</div>}
        <h2 className="h2" style={{ fontSize: 27, lineHeight: 1.05, marginBottom: 14 }}>
          {tl.t}
        </h2>
        <div className="rule mb-18" />
        <div className="caps mb-10" style={{ letterSpacing: ".1em" }}>
          What you might notice
        </div>
        <div className="list mb-20">
          {tl.n.map((t) => (
            <div key={t} style={{ padding: "10px 0", borderBottom: "1px solid var(--color-divider)", fontSize: 13.5, lineHeight: 1.4 }}>
              {t}
            </div>
          ))}
        </div>
        <div className="caps mb-10" style={{ letterSpacing: ".1em" }}>
          What to focus on
        </div>
        <div className="focus-box mb-20">
          {tl.f.map((t) => (
            <div key={t}>{t}</div>
          ))}
        </div>
        <div className="caps mb-10" style={{ letterSpacing: ".1em", color: "var(--brand-clay)" }}>
          When to get help
        </div>
        <div className="card-red stack gap-8 mb-18" style={{ padding: 14 }}>
          {WHEN_TO_GET_HELP.map((t) => (
            <div key={t} style={{ fontSize: 13, lineHeight: 1.4, fontWeight: 600, color: "var(--color-accent-800)" }}>
              {t}
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-ink btn-sm" onClick={() => goTab("medicines")}>
          Go to today's medicines
        </button>
      </div>
    </>
  );
}
