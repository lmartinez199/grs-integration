import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Play, Plus, Square, Trash2 } from "lucide-react";

import { listSchedules, startSchedule, stopSchedule } from "@/api/zempo";
import {
  getIntegration,
  readActiveEvent,
  readActiveTeamEvent,
  type IntegrationEventRef,
} from "@/api/grs/integrations";
import { SYNC_INTERVAL } from "@/lib/constants";
import { filterActiveSchedules } from "@/lib/domain/zempo";
import { useMutationWithToast } from "@/hooks/useMutationWithToast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { IntegrationInfoRows } from "@/components/integration/integration-info-rows";
import { Input } from "@/components/ui/input";
import { RetryNotice } from "@/components/ui/retry-notice";
import { SyncCard } from "@/components/ui/sync-card";

export function ZempoSyncCard() {
  const [codigo, setCodigo] = useState("");

  const schedules = useQuery({
    queryKey: ["zempo", "schedules"],
    queryFn: listSchedules,
    refetchInterval: SYNC_INTERVAL,
  });

  const start = useMutationWithToast({
    mutationFn: (c: string) => startSchedule(c),
    successMsg: "Sync de zempo activada",
    invalidateKeys: [["zempo", "schedules"]],
    onSuccess: () => setCodigo(""),
  });

  const stop = useMutationWithToast({
    mutationFn: (c: string) => stopSchedule(c),
    successMsg: "Sync de zempo detenida",
    invalidateKeys: [["zempo", "schedules"]],
  });

  const list = filterActiveSchedules(schedules.data);

  // Códigos activos de la config (fila `judo`): zempo separa individual y equipos.
  const integration = useQuery({
    queryKey: ["integrations", "judo"],
    queryFn: () => getIntegration("judo"),
    retry: false,
  });
  const configured = [
    readActiveEvent(integration.data?.externalIds ?? {}),
    readActiveTeamEvent(integration.data?.externalIds ?? {}),
  ].filter((e): e is IntegrationEventRef => !!e?.id);
  const running = new Set(list.map((s) => String(s.competicaoCodigo ?? "")));
  const allRunning =
    configured.length > 0 && configured.every((e) => running.has(e.id));

  const startConfigured = useMutationWithToast({
    mutationFn: async () => {
      for (const e of configured)
        if (!running.has(e.id)) await startSchedule(e.id);
    },
    successMsg: "Auto-sync de judo iniciada (códigos de la config)",
    invalidateKeys: [["zempo", "schedules"]],
  });
  const stopConfigured = useMutationWithToast({
    mutationFn: async () => {
      for (const e of configured)
        if (running.has(e.id)) await stopSchedule(e.id);
    },
    successMsg: "Auto-sync de judo detenida",
    invalidateKeys: [["zempo", "schedules"]],
  });

  return (
    <SyncCard
      title="JUD (judo)"
      icon={<Activity className="size-4 text-(--color-primary)" />}
      status={
        <StatusBadge loading={schedules.isLoading} error={schedules.isError}>
          <Badge variant={list.length > 0 ? "success" : "secondary"}>
            {list.length} activas
          </Badge>
        </StatusBadge>
      }
    >
        {schedules.isError && (
          <RetryNotice
            message="No se pudo conectar con el servicio de judo (JUD)."
            onRetry={() => schedules.refetch()}
            isRetrying={schedules.isFetching}
          />
        )}

        <IntegrationInfoRows provider="judo" eventLabel="Competición activa" />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            icon={<Play />}
            onClick={() => startConfigured.mutate()}
            disabled={
              configured.length === 0 || allRunning || startConfigured.isPending
            }
          >
            Iniciar auto-sync
          </Button>
          <Button
            size="sm"
            variant="outline"
            icon={<Square />}
            onClick={() => stopConfigured.mutate()}
            disabled={
              !configured.some((e) => running.has(e.id)) ||
              stopConfigured.isPending
            }
          >
            Detener
          </Button>
          {configured.length === 0 && (
            <span className="text-xs text-(--color-muted-foreground)">
              Configura los códigos (individual/equipos) en Integraciones.
            </span>
          )}
        </div>

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
          <Button type="submit" size="sm" icon={<Plus />} loading={start.isPending}>
            Agregar
          </Button>
        </form>

        <ul className="space-y-1">
          {list.length === 0 ? (
            <li className="text-sm text-(--color-muted-foreground)">
              Sin competiciones en sync.
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
    </SyncCard>
  );
}
