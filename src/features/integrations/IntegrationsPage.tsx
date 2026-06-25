import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import {
  listIntegrations,
  setIntegrationEnabled,
  updateIntegrationExternalIds,
  type Integration,
  type IntegrationRun,
} from "@/api/grs/integrations";
import { useMutationWithToast } from "@/hooks/useMutationWithToast";
import { formatDateTime, humanizeKey } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const meetIds = (ids.meetIds as string[] | undefined) ?? [];
  const [raw, setRaw] = useState(meetIds.join(", "));

  return (
    <div className="space-y-1">
      <Label htmlFor="swm-meetIds">meetIds (separados por coma)</Label>
      <Input
        id="swm-meetIds"
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value);
          const arr = e.target.value
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          onChange({ ...ids, meetIds: arr });
        }}
        placeholder="uuid1, uuid2, ..."
      />
      <p className="text-xs text-(--color-muted-foreground)">
        {meetIds.length} meet{meetIds.length !== 1 ? "s" : ""} configurado{meetIds.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

function SportTechFields({ ids, onChange }: {
  ids: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor="sporttech-eventId">eventId (UUID del OVS)</Label>
      <Input
        id="sporttech-eventId"
        value={String(ids.eventId ?? "")}
        onChange={(e) => onChange({ ...ids, eventId: e.target.value })}
        placeholder="uuid del evento de esta disciplina"
      />
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

        <RunHistory runs={integration.runs} />
      </CardContent>
    </Card>
  );
}

/** Línea de tiempo de las últimas corridas (más reciente arriba). */
function RunHistory({ runs }: { runs?: IntegrationRun[] }) {
  if (!runs?.length) return null;
  const recent = [...runs].reverse();
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-(--color-muted-foreground)">
        Historial ({recent.length})
      </p>
      <ul className="space-y-1">
        {recent.map((run, i) => (
          <li
            key={i}
            className="rounded-md border border-(--color-border) px-2 py-1 text-xs"
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-(--color-muted-foreground)">
                {formatDateTime(run.at)}
              </span>
              <span className="font-medium">{run.stage}</span>
              <Badge
                variant={run.status === "ok" ? "success" : "destructive"}
                className="text-[10px]"
              >
                {run.status}
              </Badge>
              {run.counts && Object.keys(run.counts).length > 0 && (
                <span className="text-(--color-muted-foreground)">
                  {Object.entries(run.counts)
                    .map(([k, v]) => `${humanizeKey(k)} ${v}`)
                    .join(" · ")}
                </span>
              )}
            </div>
            {run.errorCount > 0 && run.errors?.length ? (
              <ul className="mt-0.5 list-disc pl-4 text-(--color-destructive)">
                {run.errors.map((e, j) => (
                  <li key={j}>{e}</li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
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
