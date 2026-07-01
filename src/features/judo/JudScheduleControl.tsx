import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, Activity } from "lucide-react";

import { listSchedules, startSchedule, stopSchedule } from "@/api/zempo";
import { SYNC_INTERVAL } from "@/lib/constants";
import { filterActiveSchedules } from "@/lib/domain/zempo";
import { useMutationWithToast } from "@/hooks/useMutationWithToast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RetryNotice } from "@/components/ui/retry-notice";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function JudScheduleControl() {
  const [codigo, setCodigo] = useState("");

  const schedules = useQuery({
    queryKey: ["zempo", "schedules"],
    queryFn: listSchedules,
    refetchInterval: SYNC_INTERVAL,
  });

  const start = useMutationWithToast({
    mutationFn: (c: string) => startSchedule(c),
    successMsg: "Sincronización de judo activada",
    invalidateKeys: [["zempo", "schedules"]],
    onSuccess: () => setCodigo(""),
  });
  const stop = useMutationWithToast({
    mutationFn: (c: string) => stopSchedule(c),
    successMsg: "Sincronización detenida",
    invalidateKeys: [["zempo", "schedules"]],
  });

  const list = filterActiveSchedules(schedules.data);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-4 text-(--color-primary)" aria-hidden />
            Sincronización (zempo)
          </CardTitle>
          <CardDescription>
            Activa/detén la sincronización periódica de una competición de judo (cada 15s).
          </CardDescription>
        </div>
        {schedules.isLoading ? (
          <Loader2 className="size-4 animate-spin text-(--color-muted-foreground)" aria-hidden />
        ) : schedules.isError ? (
          <Badge variant="destructive">sin conexión</Badge>
        ) : (
          <Badge variant="secondary">{list.length} activas</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {schedules.isError && (
          <RetryNotice
            message="No se pudo conectar con el servicio de judo (zempo)."
            onRetry={() => schedules.refetch()}
            isRetrying={schedules.isFetching}
          />
        )}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (codigo.trim()) start.mutate(codigo.trim());
          }}
        >
          <Input
            className="max-w-xs"
            placeholder="Código de competición"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />
          <Button type="submit" size="sm" icon={<Plus aria-hidden />} loading={start.isPending}>
            Agregar
          </Button>
        </form>

        <ul className="space-y-1">
          {list.length === 0 ? (
            <li className="text-sm text-(--color-muted-foreground)">
              Sin competiciones en sincronización.
            </li>
          ) : (
            list.map((s) => {
              const code = String(s.competicaoCodigo ?? "");
              return (
                <li
                  key={code}
                  className="flex items-center justify-between rounded-md bg-(--color-muted) px-3 py-1.5 text-sm"
                >
                  <span className="font-medium">{code}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => stop.mutate(code)}
                    disabled={stop.isPending}
                    aria-label={`Detener sincronización de ${code}`}
                  >
                    <Trash2 className="size-4 text-(--color-destructive)" aria-hidden />
                  </Button>
                </li>
              );
            })
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
