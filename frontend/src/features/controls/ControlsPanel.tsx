/**
 * Painel lateral direito com abas Visual / Presets / Timeline.
 */
import { useState } from "react";
import { Tabs } from "../../ui";
import type { TabItem } from "../../ui";
import { VisualTab } from "./VisualTab";
import { PresetsTab } from "./PresetsTab";
import { TimelineTab } from "./TimelineTab";
import "./controls.css";

const TAB_ITEMS: readonly TabItem[] = [
  { id: "visual", label: "Visual" },
  { id: "presets", label: "Presets" },
  { id: "timeline", label: "Timeline" },
];

/** Prefixo estável dos ids tab/painel (associação ARIA tab ↔ tabpanel). */
const TABS_ID = "controls-tabs";

export function ControlsPanel() {
  const [tab, setTab] = useState("visual");

  return (
    <aside className="side-panel" aria-label="Painel de controles visuais">
      <Tabs
        id={TABS_ID}
        items={TAB_ITEMS}
        value={tab}
        onChange={setTab}
        label="Controles do visualizador"
      />
      <div
        className="side-panel__content"
        role="tabpanel"
        id={`${TABS_ID}-panel-${tab}`}
        aria-labelledby={`${TABS_ID}-tab-${tab}`}
        tabIndex={0}
      >
        {tab === "visual" ? <VisualTab /> : null}
        {tab === "presets" ? <PresetsTab /> : null}
        {tab === "timeline" ? <TimelineTab /> : null}
      </div>
    </aside>
  );
}
