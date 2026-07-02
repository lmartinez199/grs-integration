import { useQuery } from "@tanstack/react-query";
import { Play, Square, RefreshCw, Swords } from "lucide-react";

import { SYNC_INTERVAL } from "@/lib/constants";
import { useMutationWithToast } from "@/hooks/useMutationWithToast";
import {
  getArenaSettings,
  startAutoSync,
  stopAutoSync,
  triggerFullSync,
  syncResults,
} from "@/api/grs/arena";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { RetryNotice } from "@/components/ui/retry-notice";
import { SyncCard } from "@/components/ui/sync-card";
import { DefinitionRow } from "@/components/ui/definition-row";
import { IntegrationInfoRows } from "@/components/integration/integration-info-rows";

export function ArenaSyncCard() {
  const settings = useQuery({
    queryKey: ["arena", "settings"],
    queryFn: getArenaSettings,
    refetchInterval: SYNC_INTERVAL,
  });

  const start = useMutationWithToast({
    mutationFn: startAutoSync,
    successMsg: "Sync automática de WRE activada",
    invalidateKeys: [["arena", "settings"]],
  });
  const stop = useMutationWithToast({
    mutationFn: stopAutoSync,
    successMsg: "Sync automática de WRE detenida",
    invalidateKeys: [["arena", "settings"]],
  });
  const full = useMutationWithToast({
    mutationFn: triggerFullSync,
    successMsg: "Sincronización completa disparada",
  });
  const results = useMutationWithToast({
    mutationFn: syncResults,
    successMsg: "Resultados sincronizados",
  });

  const enabled = settings.data?.isEnabled;

  return (
    <SyncCard
      title="WRE (lucha)"
      icon={<Swords className="size-4 text-(--color-primary)" />}
      status={
        <StatusBadge loading={settings.isLoading} error={settings.isError}>
          {enabled ? (
            <Badge variant="success">auto-sync activa</Badge>
          ) : (
            <Badge variant="secondary">auto-sync inactiva</Badge>
          )}
        </StatusBadge>
      }
    >
        {settings.isError ? (
          <RetryNotice
            message="No se pudo conectar con el GRS."
            onRetry={() => settings.refetch()}
            isRetrying={settings.isFetching}
          />
        ) : (
        <>
        <dl className="space-y-1 text-sm">
          <DefinitionRow label="Evento" value={settings.data?.eventCode || "—"} />
          <DefinitionRow label="URL de WRE" value={settings.data?.baseUrl || "—"} />
        </dl>

        <IntegrationInfoRows provider="arena" />

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            icon={<Play />}
            onClick={() => start.mutate()}
            disabled={enabled || start.isPending}
          >
            Iniciar
          </Button>
          <Button
            size="sm"
            variant="outline"
            icon={<Square />}
            onClick={() => stop.mutate()}
            disabled={!enabled || stop.isPending}
          >
            Detener
          </Button>
          <Button
            size="sm"
            variant="secondary"
            icon={<RefreshCw />}
            loading={full.isPending}
            onClick={() => full.mutate()}
          >
            Sync completa
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => results.mutate()}
            disabled={results.isPending}
          >
            Resultados
          </Button>
        </div>
        </>
        )}
    </SyncCard>
  );
}
