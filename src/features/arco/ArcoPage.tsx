import { useArcoStore } from "@/stores/arco.store";
import { Tabs, tabPanelId, tabTriggerId, type TabItem } from "@/components/ui/tabs";
import { ArcoMonitor } from "./ArcoMonitor";
import { ArcoCompetencia } from "./ArcoCompetencia";

const TABS: TabItem[] = [
  { value: "monitor", label: "Monitor de ingesta" },
  { value: "competencia", label: "Competencia" },
];

export function ArcoPage() {
  const tab = useArcoStore((s) => s.tab);
  const setTab = useArcoStore((s) => s.setTab);

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <header className="shrink-0">
        <h1 className="text-2xl font-semibold">ARC (tiro con arco)</h1>
        <p className="text-sm text-(--color-muted-foreground)">
          Monitor de ingesta del ODF de IANSEO y seguimiento de la competencia.
        </p>
      </header>

      <Tabs
        tabs={TABS}
        value={tab}
        onChange={setTab}
        aria-label="Secciones de arco"
        className="shrink-0"
      />

      {tab === "monitor" && (
        <div
          role="tabpanel"
          id={tabPanelId("monitor")}
          aria-labelledby={tabTriggerId("monitor")}
          className="min-h-0 flex-1"
        >
          <ArcoMonitor />
        </div>
      )}

      {tab === "competencia" && (
        <div
          role="tabpanel"
          id={tabPanelId("competencia")}
          aria-labelledby={tabTriggerId("competencia")}
          className="min-h-0 flex-1"
        >
          <ArcoCompetencia />
        </div>
      )}
    </div>
  );
}
