import { Tick } from "../components/bits";
import { CloseIcon, PhoneIcon } from "../components/Icons";
import { CALL_STEPS, CONCERNS, GRAB_GO } from "../domain/content";
import { useApp } from "../state/store";

/** Deliberately firmer than the rest of the app: alert red, 6px radii, no decoration. */
export function Emergency() {
  const { goTab } = useApp();
  return (
    <div className="em">
      <div className="em-close">
        <button type="button" aria-label="Close SOS" onClick={() => goTab("home")}>
          <CloseIcon />
        </button>
      </div>
      <Stage />
    </div>
  );
}

function GrabGoButton({ className }: { className: string }) {
  const { setUi } = useApp();
  return (
    <button type="button" className={"btn btn-ochre " + className} onClick={() => setUi({ emStage: "grabgo" })}>
      Grab and go checklist if you're going to the hospital
    </button>
  );
}

function Stage() {
  const { p, ui, set, setUi, goTab } = useApp();
  const stage = (emStage: typeof ui.emStage) => setUi({ emStage });

  if (ui.emStage === "call") {
    return (
      <>
        <div className="em-hero mt-10">
          <h2>Call 000 now</h2>
          <div style={{ fontSize: 15, lineHeight: 1.35, fontWeight: 700 }}>Fresh bleeding after tonsillectomy can be serious.</div>
        </div>
        <div style={{ padding: "18px 16px" }}>
          <div className="list em-steps">
            {CALL_STEPS.map((t, i) => (
              <div key={t}>
                <span>{i + 1}</span>
                <span>{t}</span>
              </div>
            ))}
          </div>
          <a className="btn btn-red mt-18" href="tel:000">
            <PhoneIcon />
            Call 000
          </a>
          <GrabGoButton className="mt-10" />
        </div>
      </>
    );
  }

  if (ui.emStage === "concerns") {
    return (
      <div style={{ padding: "4px 16px 20px" }}>
        <button type="button" className="btn-back" onClick={() => stage("question")}>
          ← Back
        </button>
        <h2 className="h2" style={{ fontSize: 24, lineHeight: 1.1 }}>
          What is worrying you?
        </h2>
        <div className="list">
          {CONCERNS.map((label) => {
            const on = !!ui.concerns[label];
            return (
              <button
                key={label}
                type="button"
                role="checkbox"
                aria-checked={on}
                className="list-row loose"
                style={{ alignItems: "center" }}
                onClick={() => setUi((u) => ({ concerns: { ...u.concerns, [label]: !u.concerns[label] } }))}
              >
                <Tick on={on} variant="square" />
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{label}</span>
              </button>
            );
          })}
        </div>
        <div className="alert-block mt-18" style={{ padding: 16, fontSize: 14, lineHeight: 1.45, fontWeight: 700 }}>
          If you think your child is seriously unwell, call 000 or attend an emergency department.
        </div>
        <button type="button" className="btn btn-ink mt-12" onClick={() => stage("call")}>
          Get urgent medical help
        </button>
      </div>
    );
  }

  if (ui.emStage === "grabgo") {
    return (
      <div style={{ padding: "4px 16px 20px" }}>
        <button type="button" className="btn-back" onClick={() => stage("question")}>
          ← Back to Emergency
        </button>
        <h2 className="h2">Grab and go checklist if you're going to the hospital</h2>
        <div className="list">
          {GRAB_GO.map((label) => {
            const on = !!p.grabGo[label];
            return (
              <button
                key={label}
                type="button"
                role="checkbox"
                aria-checked={on}
                className="list-row loose"
                style={{ alignItems: "center", padding: "13px 2px" }}
                onClick={() => set((prev) => ({ grabGo: { ...prev.grabGo, [label]: !prev.grabGo[label] } }))}
              >
                <Tick on={on} variant="square" />
                <span style={{ fontSize: 13.5, fontWeight: 600, textDecoration: on ? "line-through" : "none" }}>{label}</span>
              </button>
            );
          })}
        </div>
        <div className="ochre-note mt-18">
          During the high-risk recovery period, stay within about 1 hour of an appropriate hospital, such as John Hunter Hospital, Tamworth Hospital, your
          treating hospital, or a suitable emergency department.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "4px 16px 20px" }}>
      <h2 className="h2" style={{ marginBottom: 18 }}>
        Is your child bleeding from the mouth, vomiting blood, or bringing up clots?
      </h2>
      <button type="button" className="btn btn-red btn-yes" onClick={() => stage("call")}>
        Yes
      </button>
      <button type="button" className="btn btn-big-outline mt-10" onClick={() => stage("concerns")}>
        No, but I am worried
      </button>
      <button type="button" className="btn btn-info mt-10" onClick={() => goTab("questions")}>
        I'm not worried but want more information
      </button>
      <div className="rule mt-18" />
      <div className="mt-16 body-sm">Fresh bleeding after tonsillectomy can be serious. Do not wait to see if it settles.</div>
      <GrabGoButton className="mt-16" />
    </div>
  );
}
