import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Play, Square, Timer, Radio } from "lucide-react";

import { SYNC_INTERVAL } from "@/lib/constants";
import { useMutationWithToast } from "@/hooks/useMutationWithToast";
import {
  getArenaSettings,
  startAutoSync,
  stopAutoSync,
  triggerFullSync,
  syncParticipants,
  syncGroups,
  syncResults,
} from "@/api/grs/arena";
import { useArenaStore } from "@/stores/arena.store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  SetupSteps,
  type SetupStep,
} from "@/components/integration/setup-steps";

/**
 * Sincronización de Arena (WRE). Arena es push/live-first (webhooks + SSE), por
 * lo que su «estructura» se crea con la Sync completa del header; aquí se
 * homologan las dos piezas que sí encajan con ATH/JUD: el loop periódico
 * (auto-sync) y los syncs de entidades.
 */

// ---- Loop de sincronización (auto-sync) ----------------------------------

export function ArenaLoopCard() {
  const settings = useQuery({
    queryKey: ["arena", "settings"],
    queryFn: getArenaSettings,
    refetchInterval: SYNC_INTERVAL,
  });

  const start = useMutationWithToast({
    mutationFn: startAutoSync,
    successMsg: "Auto-sync de Arena iniciado",
    invalidateKeys: [["arena", "settings"]],
  });
  const stop = useMutationWithToast({
    mutationFn: stopAutoSync,
    successMsg: "Auto-sync detenido",
    invalidateKeys: [["arena", "settings"]],
  });

  const active = settings.data?.isEnabled === true;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Timer className="size-4 text-(--color-primary)" aria-hidden />
            Loop de sincronización
          </CardTitle>
          <CardDescription className="flex items-center gap-1.5">
            <Radio className="size-3.5 text-(--color-success)" aria-hidden />
            Sondea Arena periódicamente como respaldo del webhook en vivo.
          </CardDescription>
        </div>
        {settings.isLoading ? (
          <Loader2 className="size-4 animate-spin text-(--color-muted-foreground)" aria-hidden />
        ) : settings.isError ? (
          <Badge variant="destructive">sin conexión</Badge>
        ) : active ? (
          <Badge variant="success">sincronizando</Badge>
        ) : (
          <Badge variant="secondary">inactivo</Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => start.mutate()}
            disabled={active || start.isPending}
          >
            <Play className="size-4" aria-hidden /> Iniciar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => stop.mutate()}
            disabled={!active || stop.isPending}
          >
            <Square className="size-4" aria-hidden /> Detener
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Estructura + entidades ----------------------------------------------

const ARENA_ENTITY_STEPS: SetupStep<Record<string, never>>[] = [
  {
    key: "participants",
    badge: "1",
    label: "Participantes",
    desc: "Sincroniza los atletas del evento desde Arena.",
    group: "entidades",
    run: async () => ({ kind: "summary", data: await syncParticipants() }),
  },
  {
    key: "groups",
    badge: "2",
    label: "Grupos / equipos",
    desc: "Sincroniza los equipos del evento.",
    group: "entidades",
    run: async () => ({ kind: "summary", data: await syncGroups() }),
  },
  {
    key: "results",
    badge: "3",
    label: "Resultados",
    desc: "Sincroniza los resultados de las peleas.",
    group: "entidades",
    run: async () => ({ kind: "summary", data: await syncResults() }),
  },
];

const ARENA_CTX: Record<string, never> = {};

export function ArenaSyncSteps() {
  const qc = useQueryClient();
  const results = useArenaStore((s) => s.stepResults);
  const setStepResult = useArenaStore((s) => s.setStepResult);

  // El paso de estructura usa el sync completo de Arena (crea competiciones,
  // fases y units de todas las categorías) e invalida las queries para refrescar
  // las listas, igual que hacía el antiguo botón «Sync completa» del header.
  const steps: SetupStep<Record<string, never>>[] = [
    {
      key: "structure",
      label: "Crear estructura del evento",
      desc: "Crea competiciones, fases y units de todas las categorías (sync completa).",
      group: "estructura",
      run: async () => {
        const data = await triggerFullSync();
        qc.invalidateQueries({ queryKey: ["arena"] });
        return { kind: "summary", data };
      },
    },
    ...ARENA_ENTITY_STEPS,
  ];

  return (
    <SetupSteps<Record<string, never>>
      title="Setup en GRS"
      description="Crea la estructura del evento y re-sincroniza entidades bajo demanda. El webhook mantiene los datos al día en vivo."
      steps={steps}
      ctx={ARENA_CTX}
      results={results}
      onResult={setStepResult}
    />
  );
}
