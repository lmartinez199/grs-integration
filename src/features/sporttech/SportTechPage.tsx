import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";

import {
  getIntegration,
  updateIntegrationExternalIds,
  type IntegrationEventRef,
} from "@/api/grs/integrations";
import {
  sportTechInspectEvent,
  sportTechRawResource,
  SPORTTECH_RAW_RESOURCES,
  type SportTechEventInspection,
  type SportTechInspectCompetition,
  type SportTechRawResource,
} from "@/api/grs/sporttech";
import { ActiveEventSelector } from "@/components/integration/active-event-selector";
import { SyncHistoryCard } from "@/components/integration/sync-history-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataView } from "@/components/ui/data-view";
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
  { value: "proveedor", label: "Proveedor" },
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
  const [rawResource, setRawResource] =
    useState<SportTechRawResource>("athletes");
  const [rosterFilter, setRosterFilter] = useState("");

  // La lista de eventos (1 por año) + el activo se gestionan en Integraciones;
  // acá solo se elige cuál opera (el activo) para inspect/sync.
  const integration = useQuery({
    queryKey: ["integrations", provider],
    queryFn: () => getIntegration(provider),
    retry: false,
  });
  const externalIds = integration.data?.externalIds ?? {};
  const events = (externalIds.events as IntegrationEventRef[] | undefined) ?? [];
  const savedActiveId = String(externalIds.activeId ?? "");
  // Id operado = el activo si está en la lista, si no el primero configurado.
  const id = events.find((e) => e.id === savedActiveId)?.id ?? events[0]?.id ?? "";

  function setActive(newId: string) {
    if (newId === id) return;
    updateIntegrationExternalIds(provider, { ...externalIds, activeId: newId })
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

  // Passthrough crudo del proveedor (lo que el OVS manda, sin interpretación).
  const raw = useQuery({
    queryKey: ["sporttech", "raw", id, rawResource],
    queryFn: () => sportTechRawResource(id, rawResource),
    enabled: tab === "proveedor" && Boolean(id),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  // Los atletas vienen como mapa id→atleta; a array para las tarjetas colapsables.
  const rosterArray =
    rawResource === "athletes" && raw.data ? Object.values(raw.data) : null;
  // Filtro del roster: match en cualquier campo (nombre, país, ExternalID…).
  const rosterQuery = rosterFilter.trim().toLowerCase();
  const filteredRoster =
    rosterArray && rosterQuery
      ? rosterArray.filter((a) =>
          JSON.stringify(a).toLowerCase().includes(rosterQuery),
        )
      : rosterArray;
  const rawDisplay = rosterArray ? filteredRoster : raw.data;

  // Al cambiar de recurso, limpia el filtro (no aplica a la estructura).
  useEffect(() => {
    setRosterFilter("");
  }, [rawResource]);

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <header className="shrink-0">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-(--color-muted-foreground)">
          Operación de la integración con SportTech.io (OVS). Elegí el evento
          activo (se configuran en Integraciones), mirá la competición y dispará
          el pull por etapa.
        </p>
      </header>

      <div className="shrink-0">
        <ActiveEventSelector
          events={events}
          activeId={id}
          onSetActive={setActive}
          noun="Evento"
        />
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

        {tab === "proveedor" && (
          <div
            role="tabpanel"
            id={tabPanelId("proveedor")}
            aria-labelledby={tabTriggerId("proveedor")}
            className="space-y-4"
          >
            <div className="flex flex-wrap gap-2">
              {SPORTTECH_RAW_RESOURCES.map((r) => (
                <Button
                  key={r.resource}
                  size="sm"
                  variant={r.resource === rawResource ? "default" : "outline"}
                  disabled={!id}
                  onClick={() => setRawResource(r.resource)}
                >
                  {r.label}
                </Button>
              ))}
            </div>
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                <CardTitle>
                  {SPORTTECH_RAW_RESOURCES.find((r) => r.resource === rawResource)
                    ?.label ?? "Proveedor"}
                  {rosterArray && (
                    <span className="ml-2 text-sm font-normal text-(--color-muted-foreground)">
                      {Array.isArray(rawDisplay) &&
                      rawDisplay.length !== rosterArray.length
                        ? `${rawDisplay.length} / ${rosterArray.length}`
                        : rosterArray.length}{" "}
                      registros
                    </span>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {rosterArray && rosterArray.length > 0 && (
                    <Input
                      placeholder="Buscar atleta (nombre, país…)"
                      value={rosterFilter}
                      onChange={(e) => setRosterFilter(e.target.value)}
                      className="h-8 w-56 text-xs"
                    />
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => raw.refetch()}
                    disabled={!id || raw.isFetching}
                  >
                    {raw.isFetching ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <RefreshCw className="size-4" />
                    )}
                    Refrescar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!id ? (
                  <p className="text-sm text-(--color-muted-foreground)">
                    Pegá o guardá un eventId para ver lo que manda el proveedor.
                  </p>
                ) : raw.isLoading ? (
                  <Loader2 className="size-5 animate-spin text-(--color-muted-foreground)" />
                ) : raw.isError ? (
                  <p role="alert" className="text-sm text-(--color-destructive)">
                    {(raw.error as Error)?.message ??
                      "Error al consultar el proveedor."}
                  </p>
                ) : rawResource === "structure" && raw.data ? (
                  <div className="max-h-[60vh] overflow-auto pr-1">
                    <RawStructureView data={raw.data} />
                  </div>
                ) : (
                  <div className="max-h-[60vh] overflow-auto pr-1">
                    <DataView data={rawDisplay} showTechnical collapsible />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "sync" && (
          <div
            role="tabpanel"
            id={tabPanelId("sync")}
            aria-labelledby={tabTriggerId("sync")}
            className="space-y-4"
          >
            <SportTechSyncSteps eventId={id} />
            <SyncHistoryCard provider={provider} />
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

// Catálogos de Stage.Kind por disciplina (del proveedor; solo HINT de lectura para
// la vista cruda — la fase canónica la deriva el backend en la pestaña Competición).
const RG_KINDS: Record<number, string> = {
  0: "All-Around",
  1: "All-Around Final",
  2: "Final por aparato",
};
const AG_KINDS: Record<number, string> = {
  0: "All-Around",
  1: "Clasificación",
  2: "Cuartos",
  3: "Semifinal",
  4: "Final",
  5: "Final por aparato",
  6: "All-Around Compulsory",
  7: "All-Around Optional",
};

/** Nombre legible del Kind de un stage (infiere disciplina por su forma). */
function stageFaseLabel(stage: Record<string, unknown>): string | undefined {
  const kind = stage.Kind;
  if (typeof kind !== "number") return undefined;
  const table =
    stage.Apparatuses != null
      ? RG_KINDS
      : stage.FrameTypes != null
        ? AG_KINDS
        : undefined;
  return table?.[kind];
}

/**
 * Estructura cruda del proveedor en secciones digeribles: Evento (solo campos
 * clave, no las ~40 flags `SHOW_*`) + Competiciones y Stages como arrays
 * colapsables (el objeto crudo entero aplanado era ilegible). A cada stage se le
 * antepone un `Fase` derivado del Kind (hint legible; el Kind crudo se conserva).
 */
function RawStructureView({ data }: { data: Record<string, unknown> }) {
  const event = (data.Event ?? {}) as Record<string, unknown>;
  const comps = Object.values(
    (data.Competitions ?? {}) as Record<string, unknown>,
  );
  const stages = Object.values(
    (data.Stages ?? {}) as Record<string, Record<string, unknown>>,
  ).map((s) => ({ Fase: stageFaseLabel(s) ?? "—", ...s }));
  const eventSummary = {
    Título: event.Title,
    Subtítulo: event.Subtitle,
    Inicio: event.StartDate,
    Fin: event.EndDate,
    Versión: event.Version,
    UUID: event.UUID,
  };
  return (
    <div className="space-y-5">
      <RawSection title="Evento">
        <DataView data={eventSummary} showTechnical />
      </RawSection>
      <RawSection title={`Competiciones (${comps.length})`}>
        <DataView data={comps} showTechnical collapsible />
      </RawSection>
      <RawSection title={`Stages (${stages.length})`}>
        <DataView data={stages} showTechnical collapsible />
      </RawSection>
    </div>
  );
}

function RawSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-(--color-muted-foreground)">
        {title}
      </h3>
      {children}
    </section>
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
