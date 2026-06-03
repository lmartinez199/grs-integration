import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trophy, RefreshCw, Loader2, Copy } from "lucide-react";

import { syncFight, type ArenaFight } from "@/api/grs/arena";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

/** Marcador por lado: usa score plano del backend, con fallback a technicalPoints. */
function score(fight: ArenaFight, side: 1 | 2): number | null {
  const flat = side === 1 ? fight.score1 : fight.score2;
  if (flat != null) return flat;
  const fighterId = side === 1 ? fight.fighter1Id : fight.fighter2Id;
  return fight.technicalPoints?.[fighterId]?.total ?? null;
}

/** Puntos técnicos por round, resolviendo el número desde el UUID (como el backend). */
function roundBreakdown(fight: ArenaFight): { n: number; p1: number; p2: number }[] {
  const tp = fight.technicalPoints ?? {};
  const tp1 = tp[fight.fighter1Id];
  const tp2 = tp[fight.fighter2Id];

  const numByUuid = new Map<string, number>();
  for (const [num, uuid] of Object.entries(fight.roundIds ?? {})) {
    const n = Number(num);
    if (uuid && n > 0) numByUuid.set(uuid, n);
  }
  if (fight.round1Id && !numByUuid.has(fight.round1Id)) numByUuid.set(fight.round1Id, 1);
  if (fight.round2Id && !numByUuid.has(fight.round2Id)) numByUuid.set(fight.round2Id, 2);

  const map = new Map<number, { p1: number; p2: number }>();
  const add = (rounds: Record<string, { number: number; total: number }> | undefined, side: 1 | 2) => {
    for (const [uuid, r] of Object.entries(rounds ?? {})) {
      const n = numByUuid.get(uuid) ?? (r.number > 0 ? r.number : 1);
      const e = map.get(n) ?? { p1: 0, p2: 0 };
      if (side === 1) e.p1 += r.total;
      else e.p2 += r.total;
      map.set(n, e);
    }
  };
  add(tp1?.rounds, 1);
  add(tp2?.rounds, 2);

  return [...map.entries()].sort(([a], [b]) => a - b).map(([n, { p1, p2 }]) => ({ n, p1, p2 }));
}

function Competitor({
  name,
  team,
  points,
  isWinner,
  decided,
}: {
  name: string;
  team?: string;
  points: number | null;
  isWinner: boolean;
  /** true cuando la pelea ya tiene ganador (para atenuar al perdedor). */
  decided: boolean;
}) {
  const isLoser = decided && !isWinner;
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md px-2.5 py-2 transition-colors",
        isWinner && "bg-[var(--color-success)]/12",
      )}
    >
      <Trophy
        className={cn(
          "size-4 shrink-0",
          isWinner ? "text-[var(--color-success)]" : "text-transparent",
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm leading-tight",
            isWinner ? "font-semibold" : "font-medium",
            isLoser && "text-[var(--color-muted-foreground)]",
          )}
        >
          {name}
        </p>
        {team && (
          <p className="truncate text-xs text-[var(--color-muted-foreground)]">{team}</p>
        )}
      </div>
      <span
        className={cn(
          "flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-base font-semibold tabular-nums",
          isWinner
            ? "bg-[var(--color-success)] text-[var(--color-success-foreground)]"
            : "bg-[var(--color-muted)] text-[var(--color-foreground)]",
          isLoser && "opacity-70",
        )}
      >
        {points ?? "—"}
      </span>
    </div>
  );
}

function StatusBadge({ fight }: { fight: ArenaFight }) {
  const status = fight.status ?? (fight.isCompleted ? "completed" : "scheduled");
  if (status === "completed") return <Badge variant="success">finalizada</Badge>;
  if (status === "live") return <Badge variant="warning">en vivo</Badge>;
  return <Badge variant="secondary">programada</Badge>;
}

export function FightCard({ fight }: { fight: ArenaFight }) {
  const qc = useQueryClient();
  const win1 = !!fight.winnerFighter && fight.winnerFighter === fight.fighter1Id;
  const win2 = !!fight.winnerFighter && fight.winnerFighter === fight.fighter2Id;
  const decided = !!fight.winnerFighter;

  const sync = useMutation({
    mutationFn: () => syncFight(fight.id!),
    onSuccess: () => {
      toast.success("Pelea sincronizada");
      qc.invalidateQueries({ queryKey: ["arena", "fights"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Si el backend resolvió el nombre del atleta, se muestra como principal y el
  // equipo (estado) como afiliación. Si no, el equipo es el principal.
  const name1 = fight.fighter1Name || fight.team1Name;
  const name2 = fight.fighter2Name || fight.team2Name;
  const team1 = fight.fighter1Name ? fight.team1Name : fight.team1AlternateName;
  const team2 = fight.fighter2Name ? fight.team2Name : fight.team2AlternateName;

  const rounds = roundBreakdown(fight);

  return (
    <div className="overflow-hidden rounded-lg border bg-[var(--color-card)]">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-muted)]/30 px-3 py-1.5">
        <span className="truncate text-xs font-medium text-[var(--color-muted-foreground)]">
          {fight.roundFriendlyName}
          {fight.displayOrderInRound ? ` · Pelea ${fight.displayOrderInRound}` : ""}
          {fight.matName ? ` · ${fight.matName}` : ""}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          <StatusBadge fight={fight} />
          {fight.id && (
            <Button
              size="icon"
              variant="ghost"
              className="size-6"
              onClick={() => sync.mutate()}
              disabled={sync.isPending}
              aria-label="Sincronizar esta pelea"
              title="Sincronizar esta pelea"
            >
              {sync.isPending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="size-3.5" aria-hidden />
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="p-2">
        <Competitor
          name={name1}
          team={team1}
          points={score(fight, 1)}
          isWinner={win1}
          decided={decided}
        />
        <div className="my-0.5 flex items-center gap-2 px-2.5">
          <span className="h-px flex-1 bg-[var(--color-border)]" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
            vs
          </span>
          <span className="h-px flex-1 bg-[var(--color-border)]" />
        </div>
        <Competitor
          name={name2}
          team={team2}
          points={score(fight, 2)}
          isWinner={win2}
          decided={decided}
        />
      </div>

      {rounds.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--color-border)] px-3 py-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
            Rounds
          </span>
          {rounds.map((r) => (
            <span
              key={r.n}
              className="rounded bg-[var(--color-muted)] px-1.5 py-0.5 text-xs tabular-nums"
              title={`Round ${r.n}`}
            >
              <span className="text-[var(--color-muted-foreground)]">R{r.n}</span>{" "}
              <span className="font-medium">
                {r.p1}–{r.p2}
              </span>
            </span>
          ))}
        </div>
      )}

      {(fight.victoryLabel || fight.result || fight.id) && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-[var(--color-border)] px-3 py-1.5">
          {fight.victoryLabel && (
            <Badge variant="outline" className="border-[var(--color-border)]">
              {fight.victoryLabel}
            </Badge>
          )}
          {fight.result && (
            <span className="text-xs tabular-nums text-[var(--color-muted-foreground)]">
              {fight.result}
            </span>
          )}
          {fight.id && (
            <button
              type="button"
              onClick={() => copyId(fight.id!)}
              className="ml-auto flex items-center gap-1 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
              title="Copiar ID de la pelea"
            >
              <span className="font-mono">ID {fight.id.slice(0, 8)}…</span>
              <Copy className="size-3" aria-hidden />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

async function copyId(id: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(id);
    toast.success("ID de la pelea copiado");
  } catch {
    toast.error("No se pudo copiar el ID");
  }
}
