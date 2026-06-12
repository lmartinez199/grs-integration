import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Play, Square, RefreshCw, Timer } from "lucide-react";

import * as ath from "@/api/ath";
import { SYNC_INTERVAL } from "@/lib/constants";
import { useMutationWithToast } from "@/hooks/useMutationWithToast";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionButton } from "@/components/ui/action-button";
import { RetryNotice } from "@/components/ui/retry-notice";
import { DefinitionRow } from "@/components/ui/definition-row";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AthLoopSection() {
  const status = useQuery({
    queryKey: ["ath", "status-jobs"],
    queryFn: ath.getJobsStatus,
    refetchInterval: SYNC_INTERVAL,
  });

  const start = useMutationWithToast({
    mutationFn: ath.startSyncData,
    successMsg: "Loop de sincronización iniciado",
    invalidateKeys: [["ath", "status-jobs"]],
  });
  const stop = useMutationWithToast({
    mutationFn: ath.stopSyncData,
    successMsg: "Loop detenido",
    invalidateKeys: [["ath", "status-jobs"]],
  });

  // Filtros opcionales para el sync manual (vacío = defaults del backend).
  const dateId = useId();
  const hourId = useId();
  const reconcileId = useId();
  const [date, setDate] = useState("");
  const [hour, setHour] = useState("");
  // Opt-in: incluir setup-units en el loop (elimina units huérfanas). Apagado
  // por defecto porque BORRA — solo activar si se confía en los ajustes del proveedor.
  const [reconcileUnits, setReconcileUnits] = useState(false);
  const dateValid = date.trim() === "" || /^\d{4}-\d{2}-\d{2}$/.test(date.trim());
  const hourValid = hour.trim() === "" || /^\d{1,2}:\d{2}$/.test(hour.trim());
  const filtersValid = dateValid && hourValid;
  const filters = () => {
    const body: Record<string, unknown> = {};
    if (date.trim()) body.date = date.trim();
    if (hour.trim()) body.hour = hour.trim();
    return body;
  };

  const data = status.data;
  const active = data?.active === true;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Timer className="size-4 text-(--color-primary)" />
          Loop de sincronización
        </CardTitle>
        {status.isLoading ? (
          <Loader2 className="size-4 animate-spin text-(--color-muted-foreground)" />
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
        ) : (
          <>
            {active && (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <DefinitionRow label="Fecha" value={data?.date ?? "—"} />
                <DefinitionRow label="Hora" value={data?.hour || "todas"} />
                <DefinitionRow label="Iniciado" value={formatDateTime(data?.startedAt)} />
                <DefinitionRow label="Última sync" value={formatDateTime(data?.lastSyncAt)} />
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
            )}
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor={dateId} className="text-xs">Fecha (opcional)</Label>
                <Input
                  id={dateId}
                  className="w-36"
                  placeholder="AAAA-MM-DD"
                  value={date}
                  aria-invalid={!dateValid}
                  aria-describedby={!dateValid ? `${dateId}-error` : undefined}
                  onChange={(e) => setDate(e.target.value)}
                />
                {!dateValid && (
                  <p id={`${dateId}-error`} role="alert" className="text-xs text-(--color-destructive)">
                    Formato AAAA-MM-DD
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor={hourId} className="text-xs">Hora (opcional)</Label>
                <Input
                  id={hourId}
                  className="w-24"
                  placeholder="08:30"
                  value={hour}
                  aria-invalid={!hourValid}
                  aria-describedby={!hourValid ? `${hourId}-error` : undefined}
                  onChange={(e) => setHour(e.target.value)}
                />
                {!hourValid && (
                  <p id={`${hourId}-error`} role="alert" className="text-xs text-(--color-destructive)">
                    Formato HH:MM
                  </p>
                )}
              </div>
            </div>

            <label htmlFor={reconcileId} className="flex items-start gap-2 text-sm">
              <input
                id={reconcileId}
                type="checkbox"
                className="mt-0.5 size-4 shrink-0 accent-(--color-primary)"
                checked={reconcileUnits}
                disabled={active}
                onChange={(e) => setReconcileUnits(e.target.checked)}
              />
              <span>
                Incluir sincronización de units
                <span className="block text-xs text-(--color-muted-foreground)">
                  Refleja ajustes del proveedor eliminando units huérfanas (cada 5 min). Borra
                  datos: actívalo solo si confías en los cambios del programa.
                </span>
              </span>
            </label>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => start.mutate({ reconcileUnits })} disabled={active || start.isPending}>
                <Play className="size-4" /> Iniciar
              </Button>
              <Button size="sm" variant="outline" onClick={() => stop.mutate()} disabled={!active || stop.isPending}>
                <Square className="size-4" /> Detener
              </Button>
              <ActionButton
                label="Sincronización manual"
                icon={<RefreshCw className="size-4" />}
                disabled={!filtersValid}
                action={() => ath.manualSync(filters())}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
