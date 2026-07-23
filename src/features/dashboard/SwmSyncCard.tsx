import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Play, RefreshCw, Square, Waves } from "lucide-react";

import { swmHealth, swmSyncMeet, swmWebhookLog } from "@/api/grs/swimsystem";
import { getIntegration, setIntegrationAutoSync } from "@/api/grs/integrations";
import { SYNC_INTERVAL } from "@/lib/constants";
import { useMutationWithToast } from "@/hooks/useMutationWithToast";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { DefinitionRow } from "@/components/ui/definition-row";
import { Input } from "@/components/ui/input";
import { RetryNotice } from "@/components/ui/retry-notice";
import { SyncCard } from "@/components/ui/sync-card";
import { IntegrationInfoRows } from "@/components/integration/integration-info-rows";

const fmt = (ts?: number) => (ts ? new Date(ts).toLocaleString() : "—");

/** Ventana para considerar el webhook "activo" según la última entrega. */
const WEBHOOK_ACTIVE_WINDOW_MS = 10 * 60_000;

export function SwmSyncCard() {
  const [meetId, setMeetId] = useState("");

  const health = useQuery({
    queryKey: ["swm", "health"],
    queryFn: swmHealth,
    refetchInterval: SYNC_INTERVAL,
  });
  const webhooks = useQuery({
    queryKey: ["swm", "webhooks"],
    queryFn: () => swmWebhookLog(1),
    refetchInterval: SYNC_INTERVAL,
  });
  // Mismo queryKey que IntegrationInfoRows (react-query deduplica): de aquí sale
  // `autoSyncEnabled` para gatear los botones Iniciar/Detener.
  const integration = useQuery({
    queryKey: ["integrations", "swimsystem"],
    queryFn: () => getIntegration("swimsystem"),
    retry: false,
  });

  const sync = useMutationWithToast({
    mutationFn: (id: string) => swmSyncMeet(id),
    successMsg: "Sync de natación (SWM) disparada",
    invalidateKeys: [
      ["swm", "health"],
      ["swm", "webhooks"],
    ],
  });
  const start = useMutationWithToast({
    mutationFn: () => setIntegrationAutoSync("swimsystem", true),
    successMsg: "Auto-sync de natación (SWM) activada",
    invalidateKeys: [["integrations", "swimsystem"]],
  });
  const stop = useMutationWithToast({
    mutationFn: () => setIntegrationAutoSync("swimsystem", false),
    successMsg: "Auto-sync de natación (SWM) detenida",
    invalidateKeys: [["integrations", "swimsystem"]],
  });

  const autoOn = !!integration.data?.autoSyncEnabled;

  const last = webhooks.data?.recent[0];
  // Evaluado contra la hora del último fetch (puro en render); el query
  // repollea cada SYNC_INTERVAL, así que se mantiene fresco.
  const webhookActive = last
    ? webhooks.dataUpdatedAt - last.timestamp < WEBHOOK_ACTIVE_WINDOW_MS
    : false;

  return (
    <SyncCard
      title="SWM (natación)"
      icon={<Waves className="size-4 text-(--color-primary)" />}
      status={
        <StatusBadge loading={health.isLoading} error={health.isError}>
          {webhookActive ? (
            <Badge variant="success">webhook activo</Badge>
          ) : autoOn ? (
            <Badge variant="success">auto-sync activo</Badge>
          ) : (
            <Badge variant="secondary">sin actividad</Badge>
          )}
        </StatusBadge>
      }
    >
      {health.isError ? (
        <RetryNotice
          message="No se pudo consultar el estado de la integración SWM."
          onRetry={() => health.refetch()}
          isRetrying={health.isFetching}
        />
      ) : (
        <dl className="space-y-1 text-sm">
          <DefinitionRow
            label="Secreto del webhook"
            value={health.data?.config.webhookSecretConfigured ? "Sí" : "No"}
          />
          <DefinitionRow
            label="Última entrega"
            value={last ? `${fmt(last.timestamp)} · ${last.event ?? "—"}` : "—"}
          />
        </dl>
      )}

      <IntegrationInfoRows provider="swimsystem" eventLabel="Meet activo" />

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          icon={<Play />}
          onClick={() => start.mutate()}
          disabled={autoOn || start.isPending}
        >
          Iniciar
        </Button>
        <Button
          size="sm"
          variant="outline"
          icon={<Square />}
          onClick={() => stop.mutate()}
          disabled={!autoOn || stop.isPending}
        >
          Detener
        </Button>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (meetId.trim()) sync.mutate(meetId.trim());
        }}
      >
        <Input
          placeholder="meetId de SwimSystem"
          value={meetId}
          onChange={(e) => setMeetId(e.target.value)}
        />
        <Button type="submit" size="sm" variant="secondary" icon={<RefreshCw />} loading={sync.isPending}>
          Sincronizar
        </Button>
      </form>
    </SyncCard>
  );
}
