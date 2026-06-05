import type { ArcoCompetitor, ArcoMatch } from "@/api/grs/arco";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CompetitorRow } from "@/components/ui/competitor-row";

function StatusBadge({ status }: { status: ArcoMatch["status"] }) {
  if (status === "completed") return <Badge variant="success">finalizado</Badge>;
  if (status === "live") return <Badge variant="warning">en vivo</Badge>;
  return <Badge variant="secondary">programado</Badge>;
}

/** Decoradores de puntaje no triviales (X/10/9/AVG…) como chips. */
function ScoreChips({ scores }: { scores: ArcoCompetitor["scores"] }) {
  const shown = scores.filter((s) => s.value && s.value !== "0");
  if (shown.length === 0) return null;
  return (
    <p className="flex flex-wrap items-center gap-1.5 text-xs tabular-nums text-(--color-muted-foreground)">
      {shown.map((s) => (
        <span key={s.code}>
          <span className="font-medium">{s.code}</span> {s.value}
        </span>
      ))}
    </p>
  );
}

function Competitor({ c, decided }: { c: ArcoCompetitor | null; decided: boolean }) {
  if (!c) {
    return (
      <div className="flex items-center gap-3 rounded-md bg-(--color-muted)/40 px-2.5 py-2">
        <span className="size-4 shrink-0" />
        <span className="text-sm text-(--color-muted-foreground)">Por definir</span>
      </div>
    );
  }
  return (
    <CompetitorRow
      isWinner={c.isWinner}
      isLoser={decided && !c.isWinner}
      name={
        <>
          {c.name}
          {c.delegation ? (
            <span className="text-(--color-muted-foreground)"> ({c.delegation})</span>
          ) : null}
        </>
      }
      secondary={
        c.irm ? (
          <p className="text-xs text-(--color-destructive)">{c.irm}</p>
        ) : (
          <ScoreChips scores={c.scores} />
        )
      }
      trailing={
        <span
          className={cn(
            "flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-base font-semibold tabular-nums",
            c.isWinner
              ? "bg-(--color-success) text-(--color-success-foreground)"
              : "bg-(--color-muted) text-(--color-foreground)",
            decided && !c.isWinner && "opacity-70",
          )}
        >
          {c.score || "—"}
        </span>
      }
    />
  );
}

export function ArcoMatchCard({ match }: { match: ArcoMatch }) {
  const decided = !!(match.competitor1?.isWinner || match.competitor2?.isWinner);
  return (
    <div className="overflow-hidden rounded-lg border bg-(--color-card)">
      <div className="flex items-center justify-between gap-2 border-b border-(--color-border) bg-(--color-muted)/30 px-3 py-1.5">
        <span className="truncate text-xs font-medium text-(--color-muted-foreground)">
          {match.round || "Match"}
          {match.order ? ` · #${match.order}` : ""}
        </span>
        <StatusBadge status={match.status} />
      </div>
      <div className="space-y-1 p-2">
        <Competitor c={match.competitor1} decided={decided} />
        <Competitor c={match.competitor2} decided={decided} />
      </div>
    </div>
  );
}
