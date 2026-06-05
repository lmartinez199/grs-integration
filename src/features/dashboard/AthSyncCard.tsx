import { useQuery } from "@tanstack/react-query";
import { Loader2, Play, Square, RefreshCw, Timer } from "lucide-react";

import { getJobsStatus, startSyncData, stopSyncData, manualSyncMapped } from "@/api/ath";
import { formatDateTime } from "@/lib/utils";
import { SYNC_INTERVAL } from "@/lib/constants";
import { useMutationWithToast } from "@/hooks/useMutationWithToast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RetryNotice } from "@/components/ui/retry-notice";
import { SyncCard } from "@/components/ui/sync-card";
import { DefinitionRow } from "@/components/ui/definition-row";

export function AthSyncCard() {
  const status = useQuery({
    queryKey: ["ath", "status-jobs"],
    queryFn: getJobsStatus,
    refetchInterval: SYNC_INTERVAL,
  });

  const start = useMutationWithToast({
    mutationFn: startSyncData,
    successMsg: "Sync de ath iniciada",
    invalidateKeys: [["ath", "status-jobs"]],
  });
  const stop = useMutationWithToast({
    mutationFn: stopSyncData,
    successMsg: "Sync de ath detenida",
    invalidateKeys: [["ath", "status-jobs"]],
  });
  const manual = useMutationWithToast({
    mutationFn: () => manualSyncMapped(),
    successMsg: "Sync manual (mapped) disparada",
  });

  const data = status.data;
  const active = data?.active === true;

  return (
    <SyncCard
      title="ATH (atletismo)"
      icon={<Timer className="size-4 text-[var(--color-primary)]" />}
      status={
        status.isLoading ? (
          <Loader2 className="size-4 animate-spin text-[var(--color-muted-foreground)]" />
        ) : status.isError ? (
          <Badge variant="destructive">sin conexión</Badge>
        ) : active ? (
          <Badge variant="success">sincronizando</Badge>
        ) : (
          <Badge variant="secondary">inactivo</Badge>
        )
      }
    >
        {status.isError ? (
          <RetryNotice
            message="No se pudo conectar con el servicio de atletismo."
            onRetry={() => status.refetch()}
            isRetrying={status.isFetching}
          />
        ) : active ? (
          <dl className="space-y-1 text-sm">
            <DefinitionRow label="Fecha" value={data?.date ?? "—"} />
            <DefinitionRow label="Hora" value={data?.hour || "todas"} />
            <DefinitionRow label="Iniciado" value={formatDateTime(data?.startedAt)} />
            <DefinitionRow label="Última sincronización" value={formatDateTime(data?.lastSyncAt)} />
            <DefinitionRow
              label="Resultado última"
              value={data?.lastSyncStatus === "ok" ? "correcta" : data?.lastSyncStatus ?? "—"}
            />
          </dl>
        ) : (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Sin sincronización activa.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => start.mutate()} disabled={start.isPending}>
            <Play className="size-4" /> Iniciar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => stop.mutate()}
            disabled={stop.isPending}
          >
            <Square className="size-4" /> Detener
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => manual.mutate()}
            disabled={manual.isPending}
          >
            {manual.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Sync manual
          </Button>
        </div>
    </SyncCard>
  );
}
