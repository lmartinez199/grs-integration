import { RefreshCw, Loader2, Copy } from "lucide-react";

import { syncFight, type ArenaFight } from "@/api/grs/arena";
import { useMutationWithToast } from "@/hooks/useMutationWithToast";
import { score, roundBreakdown } from "@/lib/domain/arena-fight";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CompetitorRow } from "@/components/ui/competitor-row";
import { toast } from "@/components/ui/toast";

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
    <CompetitorRow
      className="transition-colors"
      isWinner={isWinner}
      isLoser={isLoser}
      name={name}
      secondary={
        team ? (
          <p className="truncate text-xs text-(--color-muted-foreground)">{team}</p>
        ) : undefined
      }
      trailing={
        <span
          className={cn(
            "flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-base font-semibold tabular-nums",
            isWinner
              ? "bg-(--color-success) text-(--color-success-foreground)"
              : "bg-(--color-muted) text-(--color-foreground)",
            isLoser && "opacity-70",
          )}
        >
          {points ?? "—"}
        </span>
      }
    />
  );
}

function StatusBadge({ fight }: { fight: ArenaFight }) {
  const status = fight.status ?? (fight.isCompleted ? "completed" : "scheduled");
  if (status === "completed") return <Badge variant="success">finalizada</Badge>;
  if (status === "live") return <Badge variant="warning">en vivo</Badge>;
  return <Badge variant="secondary">programada</Badge>;
}

export function FightCard({ fight }: { fight: ArenaFight }) {
  const win1 = !!fight.winnerFighter && fight.winnerFighter === fight.fighter1Id;
  const win2 = !!fight.winnerFighter && fight.winnerFighter === fight.fighter2Id;
  const decided = !!fight.winnerFighter;

  const sync = useMutationWithToast({
    mutationFn: () => syncFight(fight.id!),
    successMsg: "Pelea sincronizada",
    invalidateKeys: [["arena", "fights"]],
  });

  // Si el backend resolvió el nombre del atleta, se muestra como principal y el
  // equipo (estado) como afiliación. Si no, el equipo es el principal.
  const name1 = fight.fighter1Name || fight.team1Name;
  const name2 = fight.fighter2Name || fight.team2Name;
  const team1 = fight.fighter1Name ? fight.team1Name : fight.team1AlternateName;
  const team2 = fight.fighter2Name ? fight.team2Name : fight.team2AlternateName;

  const rounds = roundBreakdown(fight);

  return (
    <div className="overflow-hidden rounded-lg border bg-(--color-card)">
      <div className="flex items-center justify-between gap-2 border-b border-(--color-border) bg-(--color-muted)/30 px-3 py-1.5">
        <span className="truncate text-xs font-medium text-(--color-muted-foreground)">
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
          <span className="h-px flex-1 bg-(--color-border)" />
          <span className="text-2xs font-semibold uppercase tracking-wider text-(--color-muted-foreground)">
            vs
          </span>
          <span className="h-px flex-1 bg-(--color-border)" />
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
        <div className="flex flex-wrap items-center gap-1.5 border-t border-(--color-border) px-3 py-1.5">
          <span className="text-2xs font-semibold uppercase tracking-wide text-(--color-muted-foreground)">
            Rounds
          </span>
          {rounds.map((r) => (
            <span
              key={r.n}
              className="rounded bg-(--color-muted) px-1.5 py-0.5 text-xs tabular-nums"
              title={`Round ${r.n}`}
            >
              <span className="text-(--color-muted-foreground)">R{r.n}</span>{" "}
              <span className="font-medium">
                {r.p1}–{r.p2}
              </span>
            </span>
          ))}
        </div>
      )}

      {(fight.victoryLabel || fight.result || fight.id) && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-(--color-border) px-3 py-1.5">
          {fight.victoryLabel && (
            <Badge variant="outline" className="border-(--color-border)">
              {fight.victoryLabel}
            </Badge>
          )}
          {fight.result && (
            <span className="text-xs tabular-nums text-(--color-muted-foreground)">
              {fight.result}
            </span>
          )}
          {fight.id && (
            <button
              type="button"
              onClick={() => copyId(fight.id!)}
              className="ml-auto flex items-center gap-1 text-xs text-(--color-muted-foreground) hover:text-(--color-foreground)"
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
