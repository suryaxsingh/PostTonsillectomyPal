import type { ReactNode } from "react";

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
