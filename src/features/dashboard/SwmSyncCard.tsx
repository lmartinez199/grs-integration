import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw, Waves } from "lucide-react";

import { swmHealth, swmSyncMeet, swmWebhookLog } from "@/api/grs/swimsystem";
import { SYNC_INTERVAL } from "@/lib/constants";
import { useMutationWithToast } from "@/hooks/useMutationWithToast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DefinitionRow } from "@/components/ui/definition-row";
import { Input } from "@/components/ui/input";
import { RetryNotice } from "@/components/ui/retry-notice";
import { SyncCard } from "@/components/ui/sync-card";

const fmt = (ts?: number) => (ts ? new Date(ts).toLocaleString() : "—");

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

  const sync = useMutationWithToast({
    mutationFn: (id: string) => swmSyncMeet(id),
    successMsg: "Sync de natación (SWM) disparada",
    invalidateKeys: [
      ["swm", "health"],
      ["swm", "webhooks"],
    ],
  });

  const last = webhooks.data?.recent[0];

  return (
    <SyncCard
      title="SWM (natación)"
      icon={<Waves className="size-4 text-(--color-primary)" />}
      status={
        health.isLoading ? (
          <Loader2 className="size-4 animate-spin text-(--color-muted-foreground)" />
        ) : health.isError ? (
          <Badge variant="destructive">sin conexión</Badge>
        ) : health.data?.connected ? (
          <Badge variant="success">conectado</Badge>
        ) : (
          <Badge variant="secondary">sin probe</Badge>
        )
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
            label="Webhook secret"
            value={health.data?.config.webhookSecretConfigured ? "Sí" : "No"}
          />
          <DefinitionRow
            label="Última entrega"
            value={last ? `${last.event ?? "—"} · ${fmt(last.timestamp)}` : "—"}
          />
        </dl>
      )}

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
        <Button type="submit" size="sm" disabled={sync.isPending}>
          {sync.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Sincronizar
        </Button>
      </form>
    </SyncCard>
  );
}
