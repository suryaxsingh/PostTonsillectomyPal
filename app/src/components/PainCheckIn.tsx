import { PAIN_COLORS, PAIN_COPY, PAIN_LEVEL, PAIN_SHORT } from "../domain/content";
import { fmtTime, PAIN_SLOTS, parseDateKey } from "../domain/time";
import { useApp } from "../state/store";
import { Face, LockIcon } from "./Icons";

/** Three check-ins a day (morning / afternoon / evening) with a private 14-day log. */
export function PainCheckIn() {
  const { p, d, ui, setUi, savePain } = useApp();
  const slot = ui.painSlot ?? d.painSlotNow;
  const slotLabel = PAIN_SLOTS.find(([k]) => k === slot)![1];
  const saved = d.painToday[slot] ?? null;
  const shown = ui.painDraft ?? saved?.score ?? null;
  const note = ui.painNote ?? saved?.note ?? "";
  const isSaved = saved !== null && ui.painDraft === null && ui.painNote === null;

  const days = [...new Set(p.pain.map((e) => e.date))].sort().reverse().slice(0, 14);

  return (
    <div className="section">
      <div className="caps" style={{ marginBottom: 4 }}>
        Pain check-in · 3 times a day
      </div>
      <div style={{ font: "800 20px/1.15 var(--font)", letterSpacing: "-.02em", marginBottom: 12 }}>How sore is {d.childName} right now?</div>

      <div className="pain-slots" role="tablist" aria-label="Check-in time">
        {PAIN_SLOTS.map(([k, label]) => {
          const e = d.painToday[k];
          return (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={k === slot}
              className={k === slot ? "on" : ""}
              onClick={() => setUi({ painSlot: k, painDraft: null, painNote: null })}
            >
              <span className="slot-name">{label}</span>
              <span className="slot-status">
                <span className="dot" style={{ background: e ? PAIN_COLORS[e.score] : "transparent" }} />
                {e ? PAIN_LEVEL[e.score] : "Not yet"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="faces" role="radiogroup" aria-label={slotLabel + " pain level"}>
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
            <Face level={i} color={PAIN_COLORS[i]} />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className="pain-bar" aria-hidden="true" />
      <div className="pain-bar-labels" aria-hidden="true">
        <span>Low</span>
        <span>High</span>
      </div>

      {shown !== null && (
        <>
          <div className="mt-14" style={{ borderLeft: "4px solid " + PAIN_COLORS[shown], background: "var(--color-surface)", borderRadius: "0 10px 10px 0", padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 6 }}>{PAIN_COPY[shown].label}</div>
            <div className="body-sm">{PAIN_COPY[shown].msg}</div>
            <div style={{ fontSize: 12, lineHeight: 1.45, marginTop: 8, color: "var(--color-accent-700)", fontWeight: 700 }}>
              If there is any fresh bleeding, use SOS or call 000.
            </div>
          </div>
          <label className="field mt-12">
            <span className="field-label">Private note (optional)</span>
            <textarea
              className="input"
              rows={2}
              value={note}
              onChange={(e) => setUi({ painNote: e.target.value })}
              placeholder="e.g. woke up sore, ate some yoghurt"
              style={{ fontSize: 14, padding: 12, resize: "vertical" }}
            />
          </label>
          <button
            type="button"
            className="btn btn-sm mt-12"
            style={{ background: isSaved ? "var(--brand-sage)" : "var(--color-text)", color: "#fff" }}
            onClick={() => !isSaved && savePain(shown, slot, note)}
          >
            {isSaved ? slotLabel + " check-in saved ✓" : "Save " + slotLabel.toLowerCase() + " check-in"}
          </button>
        </>
      )}

      <button
        type="button"
        className="btn btn-outline compact mt-12"
        style={{ justifyContent: "space-between" }}
        aria-expanded={ui.showPainLog}
        onClick={() => setUi({ showPainLog: !ui.showPainLog })}
      >
        <span>{ui.showPainLog ? "Hide private pain log" : "View private pain log"}</span>
        <LockIcon />
      </button>

      {ui.showPainLog && (
        <div className="surface mt-10" style={{ boxShadow: "var(--shadow-sm)", padding: 14 }}>
          <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.7, marginBottom: 10 }}>
            Private — stored only on this device. Nobody else can see it unless you show them.
          </div>
          {days.length === 0 && <div className="body-sm">No check-ins saved yet.</div>}
          {days.map((date) => {
            const entries = p.pain.filter((e) => e.date === date);
            return (
              <div key={date} style={{ padding: "10px 0", borderTop: "1px solid var(--color-divider)" }}>
                <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 8 }}>
                  {parseDateKey(date).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}
                </div>
                <div className="log-cells">
                  {PAIN_SLOTS.map(([k, label]) => {
                    const e = entries.find((x) => x.slot === k);
                    const light = e && e.score >= 1 && e.score <= 3;
                    return (
                      <div
                        key={k}
                        style={{
                          background: e ? PAIN_COLORS[e.score] : "var(--color-neutral-300)",
                          color: !e || light ? "#2b2723" : "#fff",
                        }}
                      >
                        <span>{label}</span>
                        <b>{e ? PAIN_LEVEL[e.score] + " · " + fmtTime(e.at) : "—"}</b>
                      </div>
                    );
                  })}
                </div>
                {PAIN_SLOTS.map(([k, label]) => {
                  const e = entries.find((x) => x.slot === k);
                  return e?.note ? (
                    <div key={k} style={{ marginTop: 6, fontSize: 12.5, lineHeight: 1.45 }}>
                      <strong>{label}:</strong> {e.note}
                    </div>
                  ) : null;
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
