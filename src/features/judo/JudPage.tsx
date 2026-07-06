import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ChevronRight } from "lucide-react";

import { getJudoCategories, getJudoFights, type JudoCategory } from "@/api/grs/judo";
import { useJudoStore } from "@/stores/judo.store";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tabs, tabPanelId, tabTriggerId, type TabItem } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JudoFightCard } from "./JudoFightCard";
import { ZempoSetupCard } from "./ZempoSetupCard";
import { OrdemLutasCard } from "./OrdemLutasCard";
import { ResultadosCard } from "./ResultadosCard";
import { JudCompeticionBar } from "./JudCompeticionBar";
import { JudScheduleControl } from "./JudScheduleControl";

const TABS: TabItem[] = [
  { value: "config", label: "Configuración" },
  { value: "lutas", label: "Lutas" },
  { value: "orden", label: "Orden de lutas" },
  { value: "resultados", label: "Resultados" },
];

export function JudPage() {
  const codigo = useJudoStore((s) => s.codigo);
  const setCodigo = useJudoStore((s) => s.setCodigo);
  const tab = useJudoStore((s) => s.tab);
  const setTab = useJudoStore((s) => s.setTab);
  const [selected, setSelected] = useState<JudoCategory | null>(null);

  const categories = useQuery({ queryKey: ["judo", "categories"], queryFn: getJudoCategories });
  const fights = useQuery({
    queryKey: ["judo", "fights", selected?.sportEvent, selected?.gender, selected?.category],
    queryFn: () => getJudoFights(selected!.sportEvent, selected!.gender, selected!.category),
    enabled: selected != null,
  });

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <header className="shrink-0">
        <h1 className="text-2xl font-semibold">JUD (judo)</h1>
        <p className="text-sm text-(--color-muted-foreground)">
          Control de sincronización (zempo) y lutas sincronizadas en el GRS.
        </p>
      </header>

      <div className="shrink-0">
        <JudCompeticionBar codigo={codigo} setCodigo={setCodigo} />
      </div>

      <Tabs
        tabs={TABS}
        value={tab}
        onChange={setTab}
        aria-label="Secciones de judo"
        className="shrink-0"
      />

      <div className="min-h-0 flex-1 overflow-auto">
      {tab === "config" && (
        <div
          role="tabpanel"
          id={tabPanelId("config")}
          aria-labelledby={tabTriggerId("config")}
          className="space-y-6"
        >
          <ZempoSetupCard codigo={codigo} />
          <JudScheduleControl />
        </div>
      )}

      {tab === "lutas" && (
        <div
          role="tabpanel"
          id={tabPanelId("lutas")}
          aria-labelledby={tabTriggerId("lutas")}
          className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_1.6fr]"
        >
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Categorías</CardTitle>
              {categories.data && <Badge variant="secondary">{categories.data.length}</Badge>}
            </CardHeader>
            <CardContent>
              {categories.isLoading ? (
                <Loader2 className="size-5 animate-spin text-(--color-muted-foreground)" aria-hidden />
              ) : categories.isError ? (
                <p role="alert" className="text-sm text-(--color-destructive)">
                  Error al cargar categorías de judo.
                </p>
              ) : (categories.data ?? []).length === 0 ? (
                <p className="text-sm text-(--color-muted-foreground)">
                  No hay lutas de judo sincronizadas todavía.
                </p>
              ) : (
                <ul className="space-y-1 pr-1">
                  {(categories.data ?? []).map((c) => {
                    const isSel =
                      selected?.sportEvent === c.sportEvent &&
                      selected?.gender === c.gender &&
                      selected?.category === c.category;
                    return (
                      <li key={`${c.sportEvent}|${c.gender}|${c.category}`}>
                        <button
                          onClick={() => setSelected(c)}
                          aria-current={isSel}
                          className={cn(
                            "flex w-full items-center justify-between gap-2 rounded-md border border-transparent px-3 py-2 text-left transition-colors",
                            isSel
                              ? "border-(--color-primary) bg-(--color-primary)/12"
                              : "hover:bg-(--color-muted)",
                          )}
                        >
                          <span
                            className={cn(
                              "truncate text-sm font-medium",
                              isSel && "text-(--color-primary)",
                            )}
                          >
                            {c.name}
                            {/* El name del GRS repite "GENERAL · M/W"; lo que
                                distingue las filas es el código del sport-event
                                (el sufijo lleva el peso, ej. 14A1640). */}
                            {c.sportEvent && (
                              <span className="ml-1.5 font-normal text-(--color-muted-foreground)">
                                {c.sportEvent}
                              </span>
                            )}
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            <span className="text-xs text-(--color-muted-foreground)">
                              {c.countCompleted}/{c.countFights}
                            </span>
                            <ChevronRight className="size-4" aria-hidden />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>
                Lutas
                {selected ? (
                  <span className="ml-2 text-sm font-normal text-(--color-muted-foreground)">
                    {selected.name}
                    {selected.sportEvent ? ` · ${selected.sportEvent}` : ""}
                  </span>
                ) : null}
              </CardTitle>
              {fights.data && <Badge variant="secondary">{fights.data.length}</Badge>}
            </CardHeader>
            <CardContent>
              {selected == null ? (
                <p className="text-sm text-(--color-muted-foreground)">
                  Selecciona una categoría para ver sus lutas.
                </p>
              ) : fights.isLoading ? (
                <Loader2 className="size-5 animate-spin text-(--color-muted-foreground)" aria-hidden />
              ) : fights.isError ? (
                <p role="alert" className="text-sm text-(--color-destructive)">
                  Error al cargar lutas.
                </p>
              ) : fights.data && fights.data.length > 0 ? (
                <div className="space-y-2 pr-1">
                  {fights.data.map((f) => (
                    <JudoFightCard key={f.id} fight={f} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-(--color-muted-foreground)">
                  Esta categoría no tiene lutas.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "orden" && (
        <div role="tabpanel" id={tabPanelId("orden")} aria-labelledby={tabTriggerId("orden")}>
          <OrdemLutasCard codigo={codigo} />
        </div>
      )}

      {tab === "resultados" && (
        <div
          role="tabpanel"
          id={tabPanelId("resultados")}
          aria-labelledby={tabTriggerId("resultados")}
        >
          <ResultadosCard codigo={codigo} />
        </div>
      )}
      </div>
    </div>
  );
}
