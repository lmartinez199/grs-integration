import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Play, Square, RefreshCw, Timer } from "lucide-react";

import { getJobsStatus, startSyncData, stopSyncData, manualSyncMapped } from "@/api/ath";
import { formatDateTime } from "@/lib/utils";
import { SYNC_INTERVAL } from "@/lib/constants";
import { useMutationWithToast } from "@/hooks/useMutationWithToast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { RetryNotice } from "@/components/ui/retry-notice";
import { SyncCard } from "@/components/ui/sync-card";
import { DefinitionRow } from "@/components/ui/definition-row";
import { ReconcileUnitsCheckbox } from "@/features/ath/ReconcileUnitsCheckbox";

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

  // Opt-in: incluir setup-units en el loop (elimina huérfanas). Apagado por
  // defecto porque BORRA — solo activar si se confía en los ajustes del proveedor.
  const [reconcileUnits, setReconcileUnits] = useState(false);

  const data = status.data;
  const active = data?.active === true;

  return (
    <SyncCard
      title="ATH (atletismo)"
      icon={<Timer className="size-4 text-(--color-primary)" />}
      status={
        <StatusBadge loading={status.isLoading} error={status.isError}>
          {active ? (
            <Badge variant="success">sincronizando</Badge>
          ) : (
            <Badge variant="secondary">inactivo</Badge>
          )}
        </StatusBadge>
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
            {data?.reconcileUnits && (
              <DefinitionRow
                label="Sync de units"
                value={
                  data?.lastUnitsReconcileAt
                    ? formatDateTime(data.lastUnitsReconcileAt)
                    : "pendiente…"
                }
              />
            )}
          </dl>
        ) : (
          <p className="text-sm text-(--color-muted-foreground)">
            Sin sincronización activa.
          </p>
        )}

        <ReconcileUnitsCheckbox
          checked={reconcileUnits}
          disabled={active}
          onChange={setReconcileUnits}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            icon={<Play />}
            onClick={() => start.mutate({ reconcileUnits })}
            disabled={start.isPending}
          >
            Iniciar
          </Button>
          <Button
            size="sm"
            variant="outline"
            icon={<Square />}
            onClick={() => stop.mutate()}
            disabled={stop.isPending}
          >
            Detener
          </Button>
          <Button
            size="sm"
            variant="secondary"
            icon={<RefreshCw />}
            loading={manual.isPending}
            onClick={() => manual.mutate()}
          >
            Sync manual
          </Button>
        </div>
    </SyncCard>
  );
}
