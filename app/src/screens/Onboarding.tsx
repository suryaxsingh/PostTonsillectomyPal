import { useEffect, useRef } from "react";
import { CheckBox, Tick } from "../components/bits";
import { HOSPITALS, SURGERY_TYPES } from "../domain/content";
import { parseWeight, weightLooksImplausible, type FormChoice } from "../domain/dose";
import { MED_ORDER, RULES, RULE_VERSION, type MedForm, type MedId } from "../domain/rules";
import { dateKey, fmt12 } from "../domain/time";
import { requestPermission } from "../state/notifications";
import { useApp } from "../state/store";
import { ONBOARDING } from "../state/types";

const FORMS: [MedForm, string][] = [
  ["liquid", "Liquid"],
  ["tablet", "Tablet"],
  ["capsule", "Capsule"],
  ["other", "Not sure"],
];

export function Onboarding() {
  const { p } = useApp();
  const idx = ONBOARDING.indexOf(p.screen);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scroller.current) scroller.current.scrollTop = 0; }, [p.screen]);

  return (
    <div className="fill">
      <div className="pips" aria-hidden="true">
        {ONBOARDING.map((s, i) => (
          <div key={s} className={i <= idx ? "on" : ""} />
        ))}
      </div>
      <div className="scroll onb" ref={scroller}>
        {p.screen === "welcome" && <Welcome />}
        {p.screen === "disclaimer" && <Disclaimer />}
        {p.screen === "emergencyWarning" && <EmergencyWarning />}
        {p.screen === "childSetup" && <ChildSetup />}
        {p.screen === "weightConfirm" && <WeightConfirm />}
        {p.screen === "surgery" && <Surgery />}
        {p.screen === "medSelect" && <MedSelect />}
        {p.screen === "medForm" && <MedFormStep />}
        {p.screen === "plan" && <Plan />}
        {p.screen === "reminders" && <RemindersStep />}
      </div>
    </div>
  );
}

function Head({ kicker, title, rule = true }: { kicker: string; title: string; rule?: boolean }) {
  return (
    <>
      <div className="kicker">{kicker}</div>
      <h1 className="h1" style={rule ? undefined : { marginBottom: 16 }}>
        {title}
      </h1>
      {rule && <div className="rule mb-14" />}
    </>
  );
}

function Welcome() {
  const { p, d, go, goTab } = useApp();
  const items = ["Day-by-day recovery guide", "Medicine reminders", "Weight-based medicine plan", "Pain faces check-in", "Emergency bleeding advice"];
  return (
    <>
      <Head kicker="Welcome" title="Helping you manage recovery after tonsillectomy" />
      <p className="body mb-20">This app helps you track your child's recovery, medicines, pain, and emergency instructions after tonsillectomy.</p>
      <div className="list">
        {items.map((t) => (
          <div key={t} className="list-text">
            {t}
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-primary mt-24" onClick={() => go("disclaimer")}>
        Get started
      </button>
      {d.hasWeight && p.planConfirmed && (
        <button type="button" className="btn-link mt-10" onClick={() => goTab("home")}>
          Continue with {p.nickname.trim() || "this child"}
        </button>
      )}
    </>
  );
}

function Disclaimer() {
  const { p, set, go } = useApp();
  return (
    <>
      <Head kicker="Step 1 of 8" title="Before you start" />
      <p className="body mb-16">
        This app provides general post-operative support and medicine scheduling based on approved clinical rules. It does not replace your child's
        discharge instructions or advice from your doctor, nurse, pharmacist, surgeon, or hospital.
      </p>
      <div className="note mb-20">
        Always follow your child's discharge paperwork. If anything in the app appears different, check with your treating team or pharmacist.
      </div>
      <CheckBox on={p.disclaimerAck} onToggle={() => set({ disclaimerAck: !p.disclaimerAck })}>
        I understand this app does not replace medical advice.
      </CheckBox>
      <button
        type="button"
        className={"btn mt-24 " + (p.disclaimerAck ? "btn-primary" : "btn-disabled")}
        disabled={!p.disclaimerAck}
        onClick={() => go("emergencyWarning")}
      >
        I understand
      </button>
    </>
  );
}

function EmergencyWarning() {
  const { go, goTab } = useApp();
  return (
    <>
      <Head kicker="Step 2 of 8" title="Important emergency advice" rule={false} />
      <div className="alert-block mb-16">
        <div style={{ font: "800 19px/1.25 var(--font)" }}>
          If your child has fresh bleeding from the mouth, vomits blood, or brings up clots after tonsillectomy, call 000 immediately.
        </div>
      </div>
      <p className="body mb-24">Do not wait to see if it settles. Fresh bleeding after tonsillectomy can be serious.</p>
      <button type="button" className="btn btn-ink" onClick={() => go("childSetup")}>
        I understand
      </button>
      <button type="button" className="btn-link red mt-10" onClick={() => goTab("emergency")}>
        View emergency instructions
      </button>
    </>
  );
}

function ChildSetup() {
  const { p, d, set, go, openModal } = useApp();
  const ageNum = parseWeight(p.age);
  const warn = weightLooksImplausible(d.weightKg, ageNum);
  const setWeight = (weight: string) => set((prev) => ({ weight, planConfirmed: prev.weight === weight ? prev.planConfirmed : false }));
  const next = () => {
    if (!d.hasWeight) openModal({ kind: "needWeight" });
    else if (warn) openModal({ kind: "checkWeight" });
    else go("weightConfirm");
  };
  return (
    <>
      <Head kicker="Step 3 of 8" title="Tell us about your child" />
      <p className="body-sm muted mb-20">We use weight to calculate medicine doses from approved clinical rules.</p>
      <div className="stack gap-18">
        <label className="field">
          <span className="field-label">
            Nickname <span className="opt">optional</span>
          </span>
          <input className="input" value={p.nickname} onChange={(e) => set({ nickname: e.target.value })} placeholder="e.g. Sam" autoComplete="off" />
        </label>
        <label className="field">
          <span className="field-label">Age (years)</span>
          <input className="input" value={p.age} onChange={(e) => set({ age: e.target.value })} inputMode="numeric" />
        </label>
        <label className="field">
          <span className="field-label">Weight (kg)</span>
          <input className="input" value={p.weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" placeholder="e.g. 18.5" />
        </label>
      </div>
      {warn && <div className="note note-red mt-14">Please check this weight. Medicine doses depend on it.</div>}
      {p.weight.trim() !== "" && !d.hasWeight && <div className="note note-red mt-14">Enter the weight as a number in kilograms, for example 18.5.</div>}
      <button type="button" className={"btn mt-24 " + (d.hasWeight ? "btn-ink" : "btn-disabled")} onClick={next}>
        Continue
      </button>
    </>
  );
}

function WeightConfirm() {
  const { d, go } = useApp();
  return (
    <>
      <Head kicker="Step 4 of 8" title="Confirm weight" rule={false} />
      <div className="card mb-16" style={{ padding: "24px 20px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", opacity: 0.6, marginBottom: 6 }}>You entered</div>
        <div style={{ font: "800 54px/1 var(--font)", letterSpacing: "-.04em" }}>{d.weightKg ?? "—"} kg</div>
      </div>
      <div className="note note-red mb-24">
        Medicine doses are calculated from this weight. Please check this matches your child's recent hospital or clinic weight.
      </div>
      <button type="button" className="btn btn-ink" onClick={() => (d.hasWeight ? go("surgery") : go("childSetup"))}>
        Yes, this is correct
      </button>
      <button type="button" className="btn btn-outline mt-10" onClick={() => go("childSetup")}>
        Edit weight
      </button>
    </>
  );
}

function Surgery() {
  const { p, d, set, go } = useApp();
  const today = dateKey(d.now);
  const value = p.surgeryDate ?? today;
  return (
    <>
      <Head kicker="Step 5 of 8" title="Surgery details" />
      <p className="body-sm muted mb-20">We use the surgery date to show the correct recovery day.</p>
      <label className="field mb-18">
        <span className="field-label">Surgery date</span>
        <input className="input" type="date" value={value} max={today} onChange={(e) => set({ surgeryDate: e.target.value || null })} />
      </label>
      <div className="field-label mb-10">Surgery type</div>
      <div className="list mb-18">
        {SURGERY_TYPES.map(([v, label]) => (
          <button key={v} type="button" className={"list-row" + (p.surgeryType === v ? " sel" : "")} onClick={() => set({ surgeryType: v })} aria-pressed={p.surgeryType === v}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
            <span className="pick">{p.surgeryType === v ? "✓" : ""}</span>
          </button>
        ))}
      </div>
      <div className="field-label mb-10">Hospital</div>
      <div className="list">
        {HOSPITALS.map(([v, label]) => (
          <button key={v} type="button" className={"list-row" + (p.hospital === v ? " sel" : "")} onClick={() => set({ hospital: v })} aria-pressed={p.hospital === v}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
            <span className="pick">{p.hospital === v ? "✓" : ""}</span>
          </button>
        ))}
      </div>
      {d.rawDays > 14 && (
        <div className="note mt-16">This app is designed for the first 14 days after surgery. You can still continue, but some recovery guidance may no longer apply.</div>
      )}
      <button
        type="button"
        className="btn btn-ink mt-24"
        onClick={() => {
          if (!p.surgeryDate) set({ surgeryDate: today });
          go("medSelect");
        }}
      >
        Continue
      </button>
    </>
  );
}

function MedSelect() {
  const { p, set, go, openModal } = useApp();
  const toggle = (id: MedId) => set((prev) => ({ selected: { ...prev.selected, [id]: !prev.selected[id] }, planConfirmed: false }));
  return (
    <>
      <Head kicker="Step 6 of 8" title="Which medicines were prescribed?" />
      <p className="body-sm muted mb-18">Only select medicines that are written on your child's discharge instructions or were prescribed by your doctor.</p>
      <div className="list">
        {MED_ORDER.map((id) => {
          const on = !!p.selected[id];
          return (
            <button key={id} type="button" role="checkbox" aria-checked={on} className={"list-row" + (on ? " sel" : "")} onClick={() => toggle(id)}>
              <Tick on={on} />
              <span className="stack" style={{ gap: 3 }}>
                <span style={{ fontSize: 14.5, fontWeight: 700 }}>{RULES[id].name}</span>
                <span style={{ fontSize: 11.5, opacity: 0.6 }}>{RULES[id].sub}</span>
              </span>
            </button>
          );
        })}
      </div>
      {p.selected.oxycodone && (
        <div className="alert-block mt-14" style={{ padding: 14, fontSize: 13, lineHeight: 1.45, fontWeight: 600 }}>
          Oxycodone is a strong pain medicine. Only select this if it was specifically prescribed for your child.
        </div>
      )}
      <button type="button" className="btn btn-ink mt-22" onClick={() => go("medForm")}>
        Continue
      </button>
      <button type="button" className="btn-link mt-10" onClick={() => openModal({ kind: "notSure" })}>
        I'm not sure
      </button>
    </>
  );
}

function MedFormStep() {
  const { p, d, set, go } = useApp();
  const update = (id: MedId, patch: Partial<FormChoice>) =>
    set((prev) => ({ forms: { ...prev.forms, [id]: { ...prev.forms[id], ...patch } }, planConfirmed: false }));
  return (
    <>
      <Head kicker="Step 7 of 8" title="Medicine form" />
      <p className="body-sm muted mb-18">We can only show mL doses if the liquid concentration is confirmed.</p>
      <div className="stack gap-16">
        {d.selectedIds.length === 0 && <div className="note">No medicines selected. You can add them later from the Medicines tab.</div>}
        {d.selectedIds.map((id) => {
          const f = p.forms[id];
          return (
            <div key={id} className="surface">
              <div style={{ font: "700 16px/1.2 var(--font)", marginBottom: 12 }}>{RULES[id].name}</div>
              <div className="seg mb-12" role="radiogroup" aria-label={RULES[id].shortName + " form"}>
                {FORMS.map(([v, label]) => (
                  <button key={v} type="button" role="radio" aria-checked={f.form === v} className={f.form === v ? "on" : ""} onClick={() => update(id, { form: v })}>
                    {label}
                  </button>
                ))}
              </div>
              {f.form === "liquid" && (
                <>
                  <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 7 }}>Concentration</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {RULES[id].concs.map((c) => {
                      const on = c.value !== null && f.conc === c.value;
                      return (
                        <button key={c.label} type="button" className={"chip" + (on ? " on" : "")} aria-pressed={on} onClick={() => update(id, { conc: c.value })}>
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.4, fontWeight: 600, color: f.conc ? "var(--brand-sage)" : "var(--color-accent-700)" }}>
                    {f.conc
                      ? "mL dose will be shown (" + f.conc + " mg/mL)."
                      : "Concentration not confirmed — mg dose only. Check the bottle or ask your pharmacist."}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
      <button type="button" className="btn btn-primary mt-22" onClick={() => go("plan")}>
        Calculate medicine plan
      </button>
    </>
  );
}

function Plan() {
  const { p, d, set, go, openModal } = useApp();
  const ready = p.planConfirmed && d.hasWeight;
  const next = () => {
    if (!d.hasWeight) return openModal({ kind: "needWeight" });
    if (!p.planConfirmed) return;
    set((prev) => ({ planVersion: prev.planVersion + 1 }));
    go("reminders");
  };
  return (
    <>
      <Head kicker="Step 8 of 8" title="Review medicine plan" />
      <p className="body-sm muted mb-6">
        {d.hasWeight
          ? "Calculated from " + d.weightKg + " kg and the medicines you selected. Check it against your discharge paperwork."
          : "No weight recorded, so doses cannot be calculated. Go back and enter your child's weight."}
      </p>
      <div style={{ fontSize: 11, opacity: 0.55 }} className="mb-18">
        Rule version {RULE_VERSION}
      </div>
      <div className="stack gap-14">
        {d.selectedIds.map((id) => {
          const r = RULES[id];
          const c = d.doses[id];
          const prn = r.scheduleType === "prn";
          return (
            <div key={id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
                <div style={{ font: "700 16px/1.2 var(--font)" }}>{r.name}</div>
                <div className={"plan-tag" + (prn ? " prn" : "")}>{r.freq}</div>
              </div>
              <div className="big mb-6">{c ? c.doseMg + " mg" : "—"}</div>
              <div className="mb-12" style={{ fontSize: 14, fontWeight: 700, color: c?.doseMl ? "var(--brand-sage)" : "var(--color-accent-700)" }}>
                {!c ? "Dose needs a weight" : c.doseMl !== null ? c.doseMl + " mL" : "mL dose not shown — concentration not confirmed"}
              </div>
              <div className="grid-2">
                <div>
                  <div className="mini-label">Max per dose</div>
                  <b>{r.maxSingleDoseMg} mg</b>
                </div>
                <div>
                  <div className="mini-label">Max / 24 hrs</div>
                  <b>{r.maxDosesIn24Hours} doses</b>
                </div>
                <div>
                  <div className="mini-label">Min interval</div>
                  <b>{r.minIntervalHours} hrs</b>
                </div>
                <div>
                  <div className="mini-label">Days</div>
                  <b>{r.daysLabel}</b>
                </div>
              </div>
              <div className="stack gap-6 mt-12" style={{ borderTop: "1px solid var(--color-divider)", paddingTop: 10 }}>
                {r.warnings.map((w) => (
                  <div key={w} className="rule-note" style={{ borderLeftColor: prn ? "var(--color-accent)" : "var(--color-text)" }}>
                    {w}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {d.selectedIds.length === 0 && <div className="note">No medicines in this plan.</div>}
      </div>
      <div className="mt-18">
        <CheckBox on={p.planConfirmed} onToggle={() => set({ planConfirmed: !p.planConfirmed })}>
          I confirm these medicines were prescribed for my child and this plan matches my discharge instructions.
        </CheckBox>
      </div>
      <button type="button" className={"btn mt-18 " + (ready ? "btn-primary" : "btn-disabled")} aria-disabled={!ready} onClick={next}>
        Use this medicine plan
      </button>
      <button type="button" className="btn btn-outline mt-10" onClick={() => go("medSelect")}>
        Edit medicines
      </button>
    </>
  );
}

function RemindersStep() {
  const { p, d, set, goTab, notifyPerm, setNotifyPerm } = useApp();
  const opts: [keyof typeof p.reminders, string][] = [
    ["due", "Remind me when medicines are due"],
    ["notTicked", "Remind me if a medicine has not been ticked off"],
    ["wake", "Set first reminder 1 hour before usual wake-up time"],
    ["pain", "Daily pain check-in reminder"],
  ];
  const note =
    notifyPerm === "granted"
      ? "Reminders are on for this device."
      : notifyPerm === "denied"
        ? "Notifications are blocked on this device — the app will still show an overdue banner on Home."
        : notifyPerm === "unsupported"
          ? "This browser can't show notifications. Add the app to your Home Screen, or rely on the overdue banner on Home."
          : "Your phone will ask permission. Reminders only fire while the app is open or in the background — the overdue banner on Home always works.";
  const first = d.todays[0];
  return (
    <>
      <Head kicker="Last step" title="Set reminders" />
      <p className="mb-18" style={{ fontSize: 13.5, lineHeight: 1.5 }}>
        Medicine reminders can help you stay on top of pain relief, especially overnight and early in the morning.
      </p>
      <div className="list">
        {opts.map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="checkbox"
            aria-checked={p.reminders[k]}
            className="list-row loose"
            onClick={() => set((prev) => ({ reminders: { ...prev.reminders, [k]: !prev.reminders[k] } }))}
          >
            <Tick on={p.reminders[k]} />
            <span style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.35 }}>{label}</span>
          </button>
        ))}
      </div>
      <div className="surface mt-14" style={{ padding: 14, fontSize: 12.5, lineHeight: 1.45 }}>
        {first ? "First reminder 1 hour before the " + fmt12(first.time) + " dose. " : "Reminder set for 1 hour before usual wake-up time. "}
        This does not add an extra dose.
      </div>
      <div className="mt-14" style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--color-accent-700)", fontWeight: 600 }}>
        {note}
      </div>
      <button
        type="button"
        className="btn btn-primary mt-14"
        onClick={async () => {
          setNotifyPerm(await requestPermission());
          goTab("home");
        }}
      >
        Enable reminders
      </button>
      <button type="button" className="btn-link mt-10" onClick={() => goTab("home")}>
        Skip for now
      </button>
    </>
  );
}

