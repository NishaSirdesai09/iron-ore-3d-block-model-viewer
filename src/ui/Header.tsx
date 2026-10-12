import { useRef, type KeyboardEvent } from "react";
import type { Tab } from "../model/types";
import { effectiveTheme, useStore } from "../state/store";
import { DownloadReportButton } from "./DownloadReportButton";
import { panelId, tabId } from "./tabs";

const TABS: ReadonlyArray<{ id: Tab; label: string }> = [
  { id: "model", label: "Model" },
  { id: "plan", label: "Drill plan" },
  { id: "about", label: "Guide" },
];

export function Header() {
  const tab = useStore((s) => s.tab);
  const selectTab = useStore((s) => s.selectTab);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const theme = useStore(effectiveTheme);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  // Arrow keys move between tabs (WAI-ARIA tabs pattern).
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, a: number) => {
    let next = -1;
    if (e.key === "ArrowRight") next = (a + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (a + TABS.length - 1) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    selectTab(TABS[next].id);
    refs.current[next]?.focus();
  };

  return (
    <header>
      <div className="tile" aria-hidden="true">
        <span className="z">26</span>
        <span className="s">Fe</span>
        <span className="m">55.845</span>
      </div>
      <div className="brand">
        <h1>Fe</h1>
        <p>Ridge lease R‑07, a banded iron formation block model built on synthetic data</p>
      </div>
      <nav aria-label="Panels">
        <div role="tablist" aria-label="Panels" style={{ display: "contents" }}>
          {TABS.map((t, a) => (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[a] = el;
              }}
              id={tabId(t.id)}
              role="tab"
              aria-selected={tab === t.id}
              aria-controls={panelId(t.id)}
              tabIndex={tab === t.id ? 0 : -1}
              onClick={() => selectTab(t.id)}
              onKeyDown={(e) => onKey(e, a)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <DownloadReportButton className="btn report" />
        <button
          className="btn theme"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          title="Switch theme"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8 1.8a6.2 6.2 0 0 1 0 12.4z" fill="currentColor" />
          </svg>
        </button>
      </nav>
    </header>
  );
}
