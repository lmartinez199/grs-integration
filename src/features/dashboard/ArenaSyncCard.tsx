import { useQuery } from "@tanstack/react-query";
import { Loader2, Play, Square, RefreshCw, Swords } from "lucide-react";

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
import { RetryNotice } from "@/components/ui/retry-notice";
import { SyncCard } from "@/components/ui/sync-card";
import { DefinitionRow } from "@/components/ui/definition-row";

export function ArenaSyncCard() {
  const settings = useQuery({
    queryKey: ["arena", "settings"],
    queryFn: getArenaSettings,
    refetchInterval: SYNC_INTERVAL,
  });

  const start = useMutationWithToast({
    mutationFn: startAutoSync,
    successMsg: "Sync automática de ARENA activada",
    invalidateKeys: [["arena", "settings"]],
  });
  const stop = useMutationWithToast({
    mutationFn: stopAutoSync,
    successMsg: "Sync automática de ARENA detenida",
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
        settings.isLoading ? (
          <Loader2 className="size-4 animate-spin text-(--color-muted-foreground)" />
        ) : settings.isError ? (
          <Badge variant="destructive">sin conexión</Badge>
        ) : enabled ? (
          <Badge variant="success">auto-sync ON</Badge>
        ) : (
          <Badge variant="secondary">auto-sync OFF</Badge>
        )
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

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => start.mutate()}
            disabled={enabled || start.isPending}
          >
            <Play className="size-4" /> Iniciar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => stop.mutate()}
            disabled={!enabled || stop.isPending}
          >
            <Square className="size-4" /> Detener
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => full.mutate()}
            disabled={full.isPending}
          >
            {full.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
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
