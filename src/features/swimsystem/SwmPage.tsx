import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw, Search } from "lucide-react";

import { getIntegration, updateIntegrationExternalIds } from "@/api/grs/integrations";
import {
  swmHealth,
  swmInspect,
  swmSyncMeet,
  swmValidate,
  swmWebhookLog,
  SWM_RESOURCES,
  type SwmResource,
} from "@/api/grs/swimsystem";
import { useMutationWithToast } from "@/hooks/useMutationWithToast";
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

import { SwmSyncSteps } from "./SwmSyncSteps";

const TABS: TabItem[] = [
  { value: "estado", label: "Estado" },
  { value: "proveedor", label: "Proveedor" },
  { value: "sync", label: "Sync" },
];

export function SwmPage() {
  const [tab, setTab] = useState("estado");
  const [meetId, setMeetId] = useState("");
  const [resource, setResource] = useState<SwmResource | null>(null);
  const [filter, setFilter] = useState("");
  const id = meetId.trim();

  const integration = useQuery({
    queryKey: ["integrations", "swimsystem"],
    queryFn: () => getIntegration("swimsystem"),
  });
  const knownMeetIds = (integration.data?.externalIds?.meetIds as string[] | undefined) ?? [];

  useEffect(() => {
    if (knownMeetIds.length === 1 && !meetId) setMeetId(knownMeetIds[0]);
  }, [knownMeetIds.length]);

  useEffect(() => { setFilter(""); }, [resource]);

  function saveMeetIdIfNew(meetIdToSave: string) {
    if (!meetIdToSave || knownMeetIds.includes(meetIdToSave)) return;
    updateIntegrationExternalIds("swimsystem", {
      meetIds: [...knownMeetIds, meetIdToSave],
    }).then(() => integration.refetch());
  }

  const health = useQuery({ queryKey: ["swm", "health"], queryFn: swmHealth });
  const webhooks = useQuery({
    queryKey: ["swm", "webhooks"],
    queryFn: () => swmWebhookLog(20),
  });
  const inspect = useQuery({
    queryKey: ["swm", "inspect", id, resource],
    queryFn: () => swmInspect(id, resource!),
    enabled: Boolean(id) && resource != null,
    staleTime: 5 * 60 * 1000,
  });
  const validation = useQuery({
    queryKey: ["swm", "validate", id],
    queryFn: () => swmValidate(id),
    enabled: false,
  });

  const q = filter.trim().toLowerCase();
  const inspectArray = Array.isArray(inspect.data) ? (inspect.data as Record<string, unknown>[]) : null;
  const filteredData: unknown = inspectArray && q
    ? inspectArray.filter((item) => JSON.stringify(item).toLowerCase().includes(q))
    : inspect.data;
  const sync = useMutationWithToast({
    mutationFn: () => swmSyncMeet(id),
    successMsg: "Sync de natación (SWM) disparada",
    invalidateKeys: [["swm", "webhooks"]],
  });

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <header className="shrink-0">
        <h1 className="text-2xl font-semibold">SWM (natación)</h1>
        <p className="text-sm text-(--color-muted-foreground)">
          Operación de la integración con SwimSystem.app: estado del webhook,
          qué manda el proveedor y disparo del sync.
        </p>
      </header>

      <Tabs
        tabs={TABS}
        value={tab}
        onChange={setTab}
        aria-label="Secciones de natación"
        className="shrink-0"
      />

      <div className="min-h-0 flex-1 overflow-auto">
        {tab === "estado" && (
          <div
            role="tabpanel"
            id={tabPanelId("estado")}
            aria-labelledby={tabTriggerId("estado")}
            className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2"
          >
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>Estado de la integración</CardTitle>
                {health.data &&
                  (health.data.connected ? (
                    <Badge variant="success">conectado</Badge>
                  ) : (
                    <Badge variant="secondary">sin probe</Badge>
                  ))}
              </CardHeader>
              <CardContent>
                {health.isLoading ? (
                  <Loader2 className="size-5 animate-spin text-(--color-muted-foreground)" />
                ) : health.isError ? (
                  <p
                    role="alert"
                    className="text-sm text-(--color-destructive)"
                  >
                    No se pudo consultar el estado.
                  </p>
                ) : (
                  <DataView data={health.data} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>Entregas de webhook</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => webhooks.refetch()}
                  disabled={webhooks.isFetching}
                >
                  <RefreshCw className="size-4" />
                  Refrescar
                </Button>
              </CardHeader>
              <CardContent>
                {webhooks.isLoading ? (
                  <Loader2 className="size-5 animate-spin text-(--color-muted-foreground)" />
                ) : webhooks.isError ? (
                  <p
                    role="alert"
                    className="text-sm text-(--color-destructive)"
                  >
                    No se pudo leer el log de webhook.
                  </p>
                ) : (
                  <DataView data={webhooks.data} />
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "proveedor" && (
          <div
            role="tabpanel"
            id={tabPanelId("proveedor")}
            aria-labelledby={tabTriggerId("proveedor")}
            className="space-y-4"
          >
            <MeetIdInput meetId={meetId} setMeetId={setMeetId} knownMeetIds={knownMeetIds} />
            <div className="flex flex-wrap gap-2">
              {SWM_RESOURCES.map((r) => (
                <Button
                  key={r}
                  size="sm"
                  variant={r === resource ? "default" : "outline"}
                  disabled={!id}
                  onClick={() => { setResource(r); saveMeetIdIfNew(id); }}
                >
                  {r}
                </Button>
              ))}
            </div>
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>
                  {resource ?? "Proveedor"}
                  {inspectArray && (
                    <span className="ml-2 text-sm font-normal text-(--color-muted-foreground)">
                      {Array.isArray(filteredData) && filteredData.length !== inspectArray.length
                        ? `${filteredData.length} / ${inspectArray.length}`
                        : `${inspectArray.length}`}{" "}
                      registros
                    </span>
                  )}
                </CardTitle>
                {inspectArray && inspectArray.length > 0 && (
                  <Input
                    placeholder="Buscar en cualquier campo…"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="h-7 w-56 text-xs"
                  />
                )}
              </CardHeader>
              <CardContent>
                {!id || !resource ? (
                  <p className="text-sm text-(--color-muted-foreground)">
                    Elige un recurso para inspeccionar lo que manda el proveedor.
                  </p>
                ) : inspect.isLoading ? (
                  <Loader2 className="size-5 animate-spin text-(--color-muted-foreground)" />
                ) : inspect.isError ? (
                  <p role="alert" className="text-sm text-(--color-destructive)">
                    {(inspect.error as Error)?.message ?? "Error al inspeccionar."}
                  </p>
                ) : (
                  <div className="max-h-[60vh] overflow-auto pr-1">
                    <DataView data={filteredData} collapsible />
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
            <MeetIdInput meetId={meetId} setMeetId={setMeetId} knownMeetIds={knownMeetIds} />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={!id || sync.isPending}
                onClick={() => { saveMeetIdIfNew(id); sync.mutate(); }}
              >
                {sync.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Sincronizar meet
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!id || validation.isFetching}
                onClick={() => validation.refetch()}
              >
                {validation.isFetching ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
                Validar (mapeo RSC)
              </Button>
            </div>

            <SwmSyncSteps meetId={id} />

            {sync.data && (
              <Card>
                <CardHeader>
                  <CardTitle>Resultado del sync</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <DataView data={omitErrors(sync.data)} />
                  <SyncErrors errors={sync.data.errors} />
                </CardContent>
              </Card>
            )}

            {validation.data && (
              <Card>
                <CardHeader>
                  <CardTitle>Validación provider→RSC</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataView data={validation.data} showTechnical />
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Quita `errors` del resumen para que el DataView no muestre el ruido vacío. */
function omitErrors<T extends { errors?: string[] }>(data: T): Omit<T, "errors"> {
  const { errors: _errors, ...rest } = data;
  return rest;
}

/** Lista de fallos del sync (rojo), solo cuando hay alguno. */
function SyncErrors({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <div className="rounded-md border border-(--color-destructive)/40 bg-(--color-destructive)/5 p-3">
      <p className="text-sm font-medium text-(--color-destructive)">
        {errors.length} con error
      </p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-(--color-muted-foreground)">
        {errors.map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ul>
    </div>
  );
}

function MeetIdInput({
  meetId,
  setMeetId,
  knownMeetIds = [],
}: {
  meetId: string;
  setMeetId: (v: string) => void;
  knownMeetIds?: string[];
}) {
  return (
    <div className="space-y-2">
      <Input
        placeholder="meetId de SwimSystem (UUID)"
        value={meetId}
        onChange={(e) => setMeetId(e.target.value)}
        className="max-w-md"
      />
      {knownMeetIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {knownMeetIds.map((id) => (
            <button
              key={id}
              onClick={() => setMeetId(id)}
              className={`rounded-md border px-2 py-0.5 font-mono text-xs transition-colors ${
                id === meetId
                  ? "border-transparent bg-(--color-primary) text-(--color-primary-foreground)"
                  : "border-(--color-border) text-(--color-muted-foreground) hover:text-(--color-foreground)"
              }`}
            >
              {id.slice(0, 8)}…
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
