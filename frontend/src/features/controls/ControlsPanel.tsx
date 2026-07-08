/**
 * Painel lateral direito com abas Visual / Presets / Timeline.
 */
import { useState } from "react";
import { Tabs } from "../../ui";
import type { TabItem } from "../../ui";
import { VisualTab } from "./VisualTab";
import { PresetsTab } from "./PresetsTab";
import { TimelineTab } from "./TimelineTab";

const TAB_ITEMS: readonly TabItem[] = [
  { id: "visual", label: "Visual" },
  { id: "presets", label: "Presets" },
  { id: "timeline", label: "Timeline" },
];

export function ControlsPanel() {
  const [tab, setTab] = useState("visual");

  return (
    <aside className="side-panel" aria-label="Painel de controles visuais">
      <Tabs
        items={TAB_ITEMS}
        value={tab}
        onChange={setTab}
        label="Controles do visualizador"
      />
      <div className="side-panel__content">
        {tab === "visual" ? <VisualTab /> : null}
        {tab === "presets" ? <PresetsTab /> : null}
        {tab === "timeline" ? <TimelineTab /> : null}
      </div>
    </aside>
  );
}
