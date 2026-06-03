import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Play, Square, RefreshCw, Timer } from "lucide-react";

import { getJobsStatus, startSyncData, stopSyncData, manualSyncMapped } from "@/api/ath";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { RetryNotice } from "@/components/ui/retry-notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AthSyncCard() {
  const qc = useQueryClient();
  const status = useQuery({
    queryKey: ["ath", "status-jobs"],
    queryFn: getJobsStatus,
    refetchInterval: 15_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["ath", "status-jobs"] });

  const start = useMutation({
    mutationFn: startSyncData,
    onSuccess: () => {
      toast.success("Sync de ath iniciada");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const stop = useMutation({
    mutationFn: stopSyncData,
    onSuccess: () => {
      toast.success("Sync de ath detenida");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const manual = useMutation({
    mutationFn: () => manualSyncMapped(),
    onSuccess: () => toast.success("Sync manual (mapped) disparada"),
    onError: (e: Error) => toast.error(e.message),
  });

  const data = status.data;
  const active = data?.active === true;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Timer className="size-4 text-[var(--color-primary)]" />
          ATH (atletismo)
        </CardTitle>
        {status.isLoading ? (
          <Loader2 className="size-4 animate-spin text-[var(--color-muted-foreground)]" />
        ) : status.isError ? (
          <Badge variant="destructive">sin conexión</Badge>
        ) : active ? (
          <Badge variant="success">sincronizando</Badge>
        ) : (
          <Badge variant="secondary">inactivo</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {status.isError ? (
          <RetryNotice
            message="No se pudo conectar con el servicio de atletismo."
            onRetry={() => status.refetch()}
            isRetrying={status.isFetching}
          />
        ) : active ? (
          <dl className="space-y-1 text-sm">
            <StatusRow label="Fecha" value={data?.date ?? "—"} />
            <StatusRow label="Hora" value={data?.hour || "todas"} />
            <StatusRow label="Iniciado" value={formatDateTime(data?.startedAt)} />
            <StatusRow label="Última sincronización" value={formatDateTime(data?.lastSyncAt)} />
            <StatusRow
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
      </CardContent>
    </Card>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-[var(--color-muted-foreground)]">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}
