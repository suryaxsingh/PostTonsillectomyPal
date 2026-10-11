import { RULE_VERSION } from "../domain/rules";
import { useApp } from "../state/store";

export function Splash() {
  const { p, d, go, goTab } = useApp();
  const hasSavedProfile = d.hasWeight && p.planConfirmed;
  return (
    <div className="splash">
      <div className="blob" style={{ top: -90, right: -120, width: 300, height: 300, background: "var(--brand-sage)", opacity: 0.16 }} />
      <div className="blob" style={{ bottom: 150, left: -90, width: 210, height: 210, background: "var(--brand-clay)", opacity: 0.12 }} />
      <div />
      <div className="stack gap-14">
        <div className="mark" aria-hidden="true" />
        <h1 className="wordmark">
          Post
          <br />
          Tonsillectomy
          <br />
          Pal
        </h1>
        <div className="rule" style={{ width: "100%" }} />
        <p style={{ fontSize: 14, lineHeight: 1.4, maxWidth: 250 }}>Post-tonsillectomy recovery support for parents.</p>
      </div>
      <div className="stack gap-10">
        <button type="button" className="btn btn-primary" onClick={() => go("welcome")}>
          Get started
        </button>
        {hasSavedProfile && (
          <button type="button" className="btn-link" onClick={() => goTab("home")}>
            Continue with {p.nickname.trim() || "this child"}
          </button>
        )}
        <div style={{ fontSize: 11, opacity: 0.55, lineHeight: 1.4 }}>Clinical rules {RULE_VERSION} · Data stays on this device</div>
      </div>
    </div>
  );
}
