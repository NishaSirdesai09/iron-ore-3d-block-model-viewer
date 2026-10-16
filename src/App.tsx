import { useEffect, useLayoutEffect } from "react";
import type { Tab } from "./model/types";
import { Scene } from "./scene/Scene";
import { effectiveTheme, useStore, type Palette } from "./state/store";
import { Compass } from "./ui/Compass";
import { ControlPanel } from "./ui/ControlPanel";
import { DrillLog } from "./ui/DrillLog";
import { DrillPlanPanel } from "./ui/DrillPlanPanel";
import { GuidePanel } from "./ui/GuidePanel";
import { Header } from "./ui/Header";
import { HoverCard } from "./ui/HoverCard";
import { panelId, tabId } from "./ui/tabs";
import { Inspector } from "./ui/Inspector";
import { Legend } from "./ui/Legend";
import { ResourceSummary } from "./ui/ResourceSummary";

function readPalette(): Palette {
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
  return {
    canvas: v("--canvas", "#181c21"),
    rockWaste: v("--rockWaste", "#6c727a"),
    ochre: v("--ochre", "#a06c16"),
    steel: v("--steel", "#5f6d7a"),
    text: v("--text", "#1e232a"),
    muted: v("--muted", "#888888"),
    line: v("--line", "#d0d5db"),
    focus: v("--focus", "#ffffff"),
  };
}

/** Applies the manual theme override and keeps the scene palette in sync with the CSS tokens. */
function useTheme() {
  const override = useStore((s) => s.themeOverride);
  const theme = useStore(effectiveTheme);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => useStore.getState().set({ systemDark: mq.matches });
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (override) root.dataset.theme = override;
    else delete root.dataset.theme;
    useStore.getState().set({ palette: readPalette() });
  }, [override, theme]);
}

function Panel({ id, tab, children }: { id: Tab; tab: Tab; children: React.ReactNode }) {
  return (
    <div id={panelId(id)} role="tabpanel" aria-labelledby={tabId(id)} hidden={tab !== id}>
      {children}
    </div>
  );
}

export function App() {
  useTheme();
  const tab = useStore((s) => s.tab);
  const planMode = useStore((s) => s.planMode);

  return (
    <div className="app">
      <Header />
      <ControlPanel />
      <main className="stage" aria-label="3D block model">
        <Scene />
        {planMode && (
          <div className="banner">Click anywhere on the ridge to place a planned core hole</div>
        )}
        <Compass />
        <Legend />
        <HoverCard />
      </main>
      <DrillLog />
      <aside className="right" aria-label="Details">
        <Panel id="model" tab={tab}>
          <ResourceSummary />
          <Inspector />
        </Panel>
        <Panel id="plan" tab={tab}>
          <DrillPlanPanel />
        </Panel>
        <Panel id="about" tab={tab}>
          <GuidePanel />
        </Panel>
      </aside>
    </div>
  );
}
