import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw, Save } from "lucide-react";

import {
  getIntegration,
  updateIntegrationExternalIds,
} from "@/api/grs/integrations";
import {
  sportTechInspectEvent,
  type SportTechEventInspection,
  type SportTechInspectCompetition,
} from "@/api/grs/sporttech";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  tabPanelId,
  tabTriggerId,
  type TabItem,
} from "@/components/ui/tabs";

import { SportTechSyncSteps } from "./SportTechSyncSteps";

const TABS: TabItem[] = [
  { value: "competicion", label: "Competición" },
  { value: "sync", label: "Sync" },
];

export function SportTechPage({
  provider,
  title,
}: {
  provider: string;
  title: string;
}) {
  const [tab, setTab] = useState("competicion");
  const [eventId, setEventId] = useState("");
  const id = eventId.trim();

  // Esta disciplina tiene UN solo evento del OVS; se guarda en su integración.
  const integration = useQuery({
    queryKey: ["integrations", provider],
    queryFn: () => getIntegration(provider),
    retry: false,
  });
  const savedEventId =
    (integration.data?.externalIds?.eventId as string | undefined) ?? "";

  useEffect(() => {
    if (savedEventId && !eventId) setEventId(savedEventId);
  }, [savedEventId]);

  function saveEventId(value: string) {
    if (!value || value === savedEventId) return;
    updateIntegrationExternalIds(provider, { eventId: value })
      .then(() => integration.refetch())
      .catch(() => {}); // sin registro de integración → no bloquea
  }

  // Vista read-only de la competición del proveedor (no escribe en GRS).
  const inspect = useQuery({
    queryKey: ["sporttech", "inspect", id],
    queryFn: () => sportTechInspectEvent(id),
    enabled: tab === "competicion" && Boolean(id),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <header className="shrink-0">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-(--color-muted-foreground)">
          Operación de la integración con SportTech.io (OVS). Pegá el UUID del
          evento del OVS de esta disciplina, mirá la competición y dispará el
          pull por etapa.
        </p>
      </header>

      <div className="shrink-0 space-y-1">
        <div className="flex max-w-xl gap-2">
          <Input
            placeholder="eventId de SportTech (UUID del OVS)"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
          />
          <Button
            size="sm"
            variant="secondary"
            disabled={!id || id === savedEventId}
            onClick={() => saveEventId(id)}
          >
            <Save className="size-4" />
            Guardar
          </Button>
        </div>
        <p className="text-xs text-(--color-muted-foreground)">
          {savedEventId ? (
            <>
              Evento guardado: <span className="font-mono">{savedEventId}</span>
            </>
          ) : (
            "Aún no hay evento guardado para esta disciplina."
          )}
        </p>
      </div>

      <Tabs
        tabs={TABS}
        value={tab}
        onChange={setTab}
        aria-label="Secciones de la disciplina"
        className="shrink-0"
      />

      <div className="min-h-0 flex-1 overflow-auto">
        {tab === "competicion" && (
          <div
            role="tabpanel"
            id={tabPanelId("competicion")}
            aria-labelledby={tabTriggerId("competicion")}
            className="space-y-4"
          >
            {!id ? (
              <p className="text-sm text-(--color-muted-foreground)">
                Pegá o guardá un eventId para ver la competición del proveedor.
              </p>
            ) : inspect.isLoading ? (
              <Loader2 className="size-5 animate-spin text-(--color-muted-foreground)" />
            ) : inspect.isError ? (
              <p role="alert" className="text-sm text-(--color-destructive)">
                {(inspect.error as Error)?.message ??
                  "Error al consultar la competición."}
              </p>
            ) : inspect.data ? (
              <InspectionView
                data={inspect.data}
                onRefresh={() => inspect.refetch()}
                refreshing={inspect.isFetching}
              />
            ) : null}
          </div>
        )}

        {tab === "sync" && (
          <div
            role="tabpanel"
            id={tabPanelId("sync")}
            aria-labelledby={tabTriggerId("sync")}
          >
            <SportTechSyncSteps eventId={id} />
          </div>
        )}
      </div>
    </div>
  );
}

/** Resumen del evento + una card por competición con su tabla de units. */
function InspectionView({
  data,
  onRefresh,
  refreshing,
}: {
  data: SportTechEventInspection;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const { counts } = data;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            {data.discipline ? (
              <Badge variant="default">{data.discipline}</Badge>
            ) : (
              <Badge variant="warning">sin disciplina</Badge>
            )}
            {data.title ?? "Evento"}
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={onRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Refrescar
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-(--color-muted-foreground)">
            <span>
              <strong className="text-(--color-foreground)">
                {counts.competitions}
              </strong>{" "}
              competiciones
            </span>
            <span>
              <strong className="text-(--color-foreground)">
                {counts.units}
              </strong>{" "}
              units
            </span>
            <span>
              <strong className="text-(--color-foreground)">
                {counts.athletes}
              </strong>{" "}
              atletas
            </span>
            <span>
              <strong
                className={
                  counts.unmapped > 0
                    ? "text-(--color-warning)"
                    : "text-(--color-foreground)"
                }
              >
                {counts.unmapped}
              </strong>{" "}
              sin mapear
            </span>
          </div>
          {(data.startDate || data.endDate) && (
            <p className="text-xs text-(--color-muted-foreground)">
              Fechas: {data.startDate?.slice(0, 10) ?? "—"} →{" "}
              {data.endDate?.slice(0, 10) ?? "—"}
            </p>
          )}
          <ErrorsBlock errors={data.errors} />
        </CardContent>
      </Card>

      {data.competitions.map((comp) => (
        <CompetitionCard key={comp.id} comp={comp} />
      ))}
    </div>
  );
}

function CompetitionCard({ comp }: { comp: SportTechInspectCompetition }) {
  return (
    <Card>
      <CardHeader className="space-y-0">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          {comp.title || "(sin título)"}
          <Badge variant="secondary">{comp.gender}</Badge>
          <Badge variant="outline">{comp.categoryName ?? comp.category}</Badge>
          {comp.isTeam && <Badge variant="default">conjunto</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--color-border) text-left text-xs text-(--color-muted-foreground)">
                <th className="py-1.5 pr-3 font-medium">Fase</th>
                <th className="py-1.5 pr-3 font-medium">Prueba</th>
                <th className="py-1.5 pr-3 font-medium">RSC</th>
                <th className="py-1.5 pr-3 font-medium">Catálogo</th>
              </tr>
            </thead>
            <tbody>
              {comp.units.map((u) => (
                <tr
                  key={u.unitCode}
                  className="border-b border-(--color-border)/50 last:border-0"
                >
                  <td className="py-1.5 pr-3">
                    {u.phaseName}{" "}
                    <span className="text-xs text-(--color-muted-foreground)">
                      ({u.phaseCode})
                    </span>
                    {u.hasMedals && (
                      <Badge variant="warning" className="ml-2">
                        medallas
                      </Badge>
                    )}
                  </td>
                  <td className="py-1.5 pr-3">
                    {u.eventName}{" "}
                    <span className="text-xs text-(--color-muted-foreground)">
                      ({u.sportEventCode})
                    </span>
                  </td>
                  <td className="py-1.5 pr-3 font-mono text-xs">{u.unitCode}</td>
                  <td className="py-1.5 pr-3">
                    {u.known ? (
                      <Badge variant="success">en catálogo</Badge>
                    ) : (
                      <Badge variant="warning">se creará</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/** Avisos no fatales del inspect (competiciones omitidas, roster ilegible, etc.). */
function ErrorsBlock({ errors }: { errors: string[] }) {
  if (!errors.length) return null;
  return (
    <div className="rounded-md border border-(--color-warning)/40 bg-(--color-warning)/5 p-3">
      <p className="text-sm font-medium text-(--color-warning)">
        {errors.length} aviso(s)
      </p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-(--color-muted-foreground)">
        {errors.map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ul>
    </div>
  );
}
