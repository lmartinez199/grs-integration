import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import {
  listIntegrations,
  setIntegrationEnabled,
  setIntegrationPollInterval,
  updateIntegrationExternalIds,
  type Integration,
  type IntegrationEventRef,
} from "@/api/grs/integrations";
import { useMutationWithToast } from "@/hooks/useMutationWithToast";
import { EventListEditor } from "@/components/integration/event-list-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Lee la lista de eventos + el activo de un externalIds loose. */
function readEvents(ids: Record<string, unknown>): {
  events: IntegrationEventRef[];
  activeId: string;
} {
  return {
    events: (ids.events as IntegrationEventRef[] | undefined) ?? [],
    activeId: String(ids.activeId ?? ""),
  };
}

const PROVIDER_LABELS: Record<string, string> = {
  swimsystem: "SWM — SwimSystem (natación)",
  arena: "WRE — Arena (lucha)",
  "sporttech-gar": "GAR — Gimnasia Artística (SportTech)",
  "sporttech-gry": "GRY — Gimnasia Rítmica (SportTech)",
};

function fmt(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es", { dateStyle: "short", timeStyle: "short" });
}

function SwimSystemFields({ ids, onChange }: {
  ids: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const { events, activeId } = readEvents(ids);
  return (
    <div className="space-y-1">
      <Label>Meets (1 por año · activá el actual)</Label>
      <EventListEditor
        noun="meet"
        events={events}
        activeId={activeId}
        onChange={(events, activeId) => onChange({ ...ids, events, activeId })}
      />
    </div>
  );
}

function SportTechFields({ ids, onChange }: {
  ids: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const { events, activeId } = readEvents(ids);
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Eventos (1 por año · activá el actual)</Label>
        <EventListEditor
          noun="evento"
          events={events}
          activeId={activeId}
          onChange={(events, activeId) => onChange({ ...ids, events, activeId })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="sporttech-eventCode">Código de edición (eventCode)</Label>
        <Input
          id="sporttech-eventCode"
          value={String(ids.eventCode ?? "")}
          onChange={(e) => onChange({ ...ids, eventCode: e.target.value })}
          placeholder="JJB"
        />
      </div>
    </div>
  );
}

function ArenaFields({ ids, onChange }: {
  ids: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="arena-baseUrl">Base URL</Label>
        <Input
          id="arena-baseUrl"
          value={String(ids.baseUrl ?? "")}
          onChange={(e) => onChange({ ...ids, baseUrl: e.target.value })}
          placeholder="https://arena.example.com"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="arena-eventCode">Event code</Label>
        <Input
          id="arena-eventCode"
          value={String(ids.eventCode ?? "")}
          onChange={(e) => onChange({ ...ids, eventCode: e.target.value })}
          placeholder="JJB2026"
        />
      </div>
    </div>
  );
}

/** Editor del intervalo de auto-sync (runner). En segundos; 0 = sin auto-sync. */
function PollIntervalField({ integration }: { integration: Integration }) {
  const currentSeconds = Math.round((integration.pollIntervalMs ?? 0) / 1000);
  const [seconds, setSeconds] = useState(String(currentSeconds));
  const save = useMutationWithToast({
    mutationFn: () =>
      setIntegrationPollInterval(
        integration.provider,
        Math.max(0, Math.round(Number(seconds) || 0)) * 1000,
      ),
    successMsg: `${integration.provider} — auto-sync actualizado`,
    invalidateKeys: [["integrations"]],
  });
  const dirty = (Number(seconds) || 0) !== currentSeconds;
  return (
    <div className="space-y-1">
      <Label htmlFor={`poll-${integration.provider}`}>
        Auto-sync cada (segundos · 0 = off)
      </Label>
      <div className="flex max-w-xs items-center gap-2">
        <Input
          id={`poll-${integration.provider}`}
          type="number"
          min={0}
          value={seconds}
          onChange={(e) => setSeconds(e.target.value)}
          className="w-28"
        />
        <Button
          size="sm"
          variant="secondary"
          disabled={!dirty || save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? <Loader2 className="size-3 animate-spin" /> : "Guardar"}
        </Button>
        {currentSeconds > 0 && (
          <span className="text-xs text-(--color-success)">
            runner activo · cada {currentSeconds}s
          </span>
        )}
      </div>
    </div>
  );
}

function IntegrationCard({ integration }: { integration: Integration }) {
  const [externalIds, setExternalIds] = useState(integration.externalIds);

  const toggleEnabled = useMutationWithToast({
    mutationFn: () => setIntegrationEnabled(integration.provider, !integration.enabled),
    successMsg: `${integration.provider} ${integration.enabled ? "deshabilitado" : "habilitado"}`,
    invalidateKeys: [["integrations"]],
  });

  const saveIds = useMutationWithToast({
    mutationFn: () => updateIntegrationExternalIds(integration.provider, externalIds),
    successMsg: `${integration.provider} — external IDs guardados`,
    invalidateKeys: [["integrations"]],
  });

  const hasChanges =
    JSON.stringify(externalIds) !== JSON.stringify(integration.externalIds);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
        <CardTitle className="text-base">
          {PROVIDER_LABELS[integration.provider] ?? integration.provider}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant={integration.enabled ? "default" : "secondary"}>
            {integration.enabled ? "habilitado" : "deshabilitado"}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toggleEnabled.mutate()}
            disabled={toggleEnabled.isPending}
          >
            {toggleEnabled.isPending ? (
              <Loader2 className="size-3 animate-spin" />
            ) : integration.enabled ? (
              "Deshabilitar"
            ) : (
              "Habilitar"
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {integration.provider === "swimsystem" && (
          <SwimSystemFields ids={externalIds} onChange={setExternalIds} />
        )}
        {integration.provider === "arena" && (
          <ArenaFields ids={externalIds} onChange={setExternalIds} />
        )}
        {(integration.provider === "sporttech-gar" ||
          integration.provider === "sporttech-gry") && (
          <SportTechFields ids={externalIds} onChange={setExternalIds} />
        )}

        <PollIntervalField integration={integration} />

        {hasChanges && (
          <Button
            size="sm"
            onClick={() => saveIds.mutate()}
            disabled={saveIds.isPending}
          >
            {saveIds.isPending ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              "Guardar"
            )}
          </Button>
        )}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-(--color-muted-foreground)">Último sync</dt>
          <dd>{fmt(integration.lastSyncAt)}</dd>
          <dt className="text-(--color-muted-foreground)">Estado</dt>
          <dd>
            {integration.lastSyncStatus ? (
              <Badge
                variant={integration.lastSyncStatus === "ok" ? "default" : "destructive"}
                className="text-xs"
              >
                {integration.lastSyncStatus}
              </Badge>
            ) : (
              "—"
            )}
          </dd>
          {integration.lastSyncError && (
            <>
              <dt className="text-(--color-muted-foreground)">Error</dt>
              <dd className="truncate text-xs text-(--color-destructive)">
                {integration.lastSyncError}
              </dd>
            </>
          )}
          <dt className="text-(--color-muted-foreground)">Actualizado</dt>
          <dd>{fmt(integration.updatedAt)}</dd>
        </dl>
      </CardContent>
    </Card>
  );
}

export function IntegrationsPage() {
  const integrations = useQuery({
    queryKey: ["integrations"],
    queryFn: listIntegrations,
  });

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <header className="shrink-0">
        <h1 className="text-2xl font-semibold">Integraciones</h1>
        <p className="text-sm text-(--color-muted-foreground)">
          Config operativa por proveedor — habilitar/deshabilitar y editar IDs externos.
          Los secretos (API keys, webhook secrets) siguen en variables de entorno del servidor.
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        {integrations.isLoading && (
          <div className="flex items-center gap-2 text-sm text-(--color-muted-foreground)">
            <Loader2 className="size-4 animate-spin" />
            Cargando...
          </div>
        )}
        {integrations.isError && (
          <p className="text-sm text-(--color-destructive)">
            Error al cargar integraciones: {(integrations.error as Error).message}
          </p>
        )}
        {integrations.data && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {integrations.data.map((integration) => (
              <IntegrationCard key={integration.provider} integration={integration} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
