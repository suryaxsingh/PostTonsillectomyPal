import type { ReactNode } from "react";
import { InfoIcon } from "./Icons";

export function Tick({ on, variant }: { on: boolean; variant?: "square" | "sage" }) {
  return (
    <span className={"tick" + (on ? " on" : "") + (variant ? " " + variant : "")} aria-hidden="true">
      {on ? "✓" : ""}
    </span>
  );
}

export function CheckBox({ on, onToggle, children }: { on: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <button type="button" className="check-box" role="checkbox" aria-checked={on} onClick={onToggle}>
      <Tick on={on} />
      <span>{children}</span>
    </button>
  );
}

export function Kv({ k, v }: { k: ReactNode; v: ReactNode }) {
  return (
    <div className="kv">
      <span>{k}</span>
      <span>{v}</span>
    </div>
  );
}

export function AnaesthetistNote({ className }: { className?: string }) {
  return (
    <div className={"info-note" + (className ? " " + className : "")}>
      <InfoIcon />
      <span>
        <strong>Speak to your anaesthetist</strong> about pain scheduling and the best times to give each dose.
      </span>
    </div>
  );
}
