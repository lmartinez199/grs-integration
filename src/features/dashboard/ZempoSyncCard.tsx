import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, Activity } from "lucide-react";

import { listSchedules, startSchedule, stopSchedule } from "@/api/zempo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { RetryNotice } from "@/components/ui/retry-notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ZempoSyncCard() {
  const qc = useQueryClient();
  const [codigo, setCodigo] = useState("");

  const schedules = useQuery({
    queryKey: ["zempo", "schedules"],
    queryFn: listSchedules,
    refetchInterval: 15_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["zempo", "schedules"] });

  const start = useMutation({
    mutationFn: (c: string) => startSchedule(c),
    onSuccess: () => {
      toast.success("Sync de zempo activada");
      setCodigo("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stop = useMutation({
    mutationFn: (c: string) => stopSchedule(c),
    onSuccess: () => {
      toast.success("Sync de zempo detenida");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = Array.isArray(schedules.data) ? schedules.data : [];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Activity className="size-4 text-[var(--color-primary)]" />
          JUD (judo)
        </CardTitle>
        {schedules.isLoading ? (
          <Loader2 className="size-4 animate-spin text-[var(--color-muted-foreground)]" />
        ) : schedules.isError ? (
          <Badge variant="destructive">sin conexión</Badge>
        ) : (
          <Badge variant="secondary">{list.length} activas</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {schedules.isError && (
          <RetryNotice
            message="No se pudo conectar con el servicio de judo (JUD)."
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
            placeholder="Código de competición"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />
          <Button type="submit" size="sm" disabled={start.isPending}>
            {start.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Agregar
          </Button>
        </form>

        <ul className="space-y-1">
          {list.length === 0 ? (
            <li className="text-sm text-[var(--color-muted-foreground)]">
              Sin competiciones en sync.
            </li>
          ) : (
            list.map((s) => {
              const code = String(s.codigo ?? s.id ?? "");
              return (
                <li
                  key={code}
                  className="flex items-center justify-between rounded-md bg-[var(--color-muted)] px-3 py-1.5 text-sm"
                >
                  <span className="font-medium">{code}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => stop.mutate(code)}
                    disabled={stop.isPending}
                    aria-label={`Detener sincronización de ${code}`}
                  >
                    <Trash2 className="size-4 text-[var(--color-destructive)]" aria-hidden />
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
