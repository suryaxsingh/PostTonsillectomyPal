import { useEffect, useRef } from "react";
import { AlertIcon, CalendarIcon, HelpIcon, HomeIcon, PillIcon, SlidersIcon } from "../components/Icons";
import { HOSPITALS } from "../domain/content";
import { RULE_VERSION } from "../domain/rules";
import { useApp } from "../state/store";
import type { Tab } from "../state/types";
import { Emergency } from "./Emergency";
import { Home } from "./Home";
import { Medicines } from "./Medicines";
import { Questions } from "./Questions";
import { Settings } from "./Settings";
import { Timeline } from "./Timeline";

export function AppShell() {
  const { p, d, ui, goTab } = useApp();
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scroller.current) scroller.current.scrollTop = 0; }, [p.tab, ui.faqOpen, ui.emStage]);

  const hospital = HOSPITALS.find(([v]) => v === p.hospital)?.[1] ?? "Other hospital";
  const name = p.nickname.trim() || "Your child";
  const header: Record<Tab, [string, string]> = {
    home: [name + " · Day " + d.day, "Post-op day " + d.day + " · " + (p.hospital === "Other" ? "Other hospital" : hospital)],
    timeline: ["Recovery timeline", "Day 0 to Day 14"],
    medicines: ["Medicines", "Plan " + RULE_VERSION],
    questions: ["Common questions", "Answers for the first two weeks"],
    emergency: ["Emergency", "Bleeding after tonsillectomy is an emergency"],
    settings: ["Settings", "Profile, plan, reminders"],
  };
  const [title, sub] = header[p.tab];

  const tabs: [Tab, string, typeof HomeIcon][] = [
    ["home", "HOME", HomeIcon],
    ["timeline", "TIMELINE", CalendarIcon],
    ["medicines", "MEDICINES", PillIcon],
    ["questions", "QUESTIONS", HelpIcon],
  ];

  return (
    <div className="fill">
      <header className="app-header">
        <div className="stack" style={{ gap: 2, minWidth: 0 }}>
          <h1 className="app-title">{title}</h1>
          <div className="app-sub">{sub}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flex: "none" }}>
          <button type="button" className="icon-btn" aria-label="Settings" onClick={() => goTab("settings")}>
            <SlidersIcon />
          </button>
          <button type="button" className="sos-btn" onClick={() => goTab("emergency")}>
            <AlertIcon size={15} />
            SOS
          </button>
        </div>
      </header>

      <main className="scroll" ref={scroller}>
        {p.tab === "home" && <Home />}
        {p.tab === "timeline" && <Timeline />}
        {p.tab === "medicines" && <Medicines />}
        {p.tab === "questions" && <Questions />}
        {p.tab === "emergency" && <Emergency />}
        {p.tab === "settings" && <Settings />}
      </main>

      <nav className="tabbar" aria-label="Main">
        {tabs.map(([t, label, Icon]) => (
          <button key={t} type="button" className={p.tab === t ? "on" : ""} aria-current={p.tab === t ? "page" : undefined} onClick={() => goTab(t)}>
            <Icon />
            <span>{label}</span>
          </button>
        ))}
        <button
          type="button"
          className={"sos" + (p.tab === "emergency" ? " on" : "")}
          aria-current={p.tab === "emergency" ? "page" : undefined}
          onClick={() => goTab("emergency")}
        >
          <AlertIcon strokeWidth={2} />
          <span>SOS</span>
        </button>
      </nav>
    </div>
  );
}
