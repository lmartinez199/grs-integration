import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Play, Square, RefreshCw, Swords } from "lucide-react";

import {
  getArenaSettings,
  startAutoSync,
  stopAutoSync,
  triggerFullSync,
  syncResults,
} from "@/api/grs/arena";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { RetryNotice } from "@/components/ui/retry-notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ArenaSyncCard() {
  const qc = useQueryClient();
  const settings = useQuery({
    queryKey: ["arena", "settings"],
    queryFn: getArenaSettings,
    refetchInterval: 15_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["arena", "settings"] });

  const start = useMutation({
    mutationFn: startAutoSync,
    onSuccess: () => {
      toast.success("Sync automática de ARENA activada");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const stop = useMutation({
    mutationFn: stopAutoSync,
    onSuccess: () => {
      toast.success("Sync automática de ARENA detenida");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const full = useMutation({
    mutationFn: triggerFullSync,
    onSuccess: () => toast.success("Sincronización completa disparada"),
    onError: (e: Error) => toast.error(e.message),
  });
  const results = useMutation({
    mutationFn: syncResults,
    onSuccess: () => toast.success("Resultados sincronizados"),
    onError: (e: Error) => toast.error(e.message),
  });

  const enabled = settings.data?.isEnabled;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Swords className="size-4 text-[var(--color-primary)]" />
          WRE (lucha)
        </CardTitle>
        {settings.isLoading ? (
          <Loader2 className="size-4 animate-spin text-[var(--color-muted-foreground)]" />
        ) : settings.isError ? (
          <Badge variant="destructive">sin conexión</Badge>
        ) : enabled ? (
          <Badge variant="success">auto-sync ON</Badge>
        ) : (
          <Badge variant="secondary">auto-sync OFF</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {settings.isError ? (
          <RetryNotice
            message="No se pudo conectar con el GRS."
            onRetry={() => settings.refetch()}
            isRetrying={settings.isFetching}
          />
        ) : (
        <>
        <dl className="space-y-1 text-sm">
          <Row label="Evento" value={settings.data?.eventCode || "—"} />
          <Row label="URL de WRE" value={settings.data?.baseUrl || "—"} />
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
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-[var(--color-muted-foreground)]">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}
