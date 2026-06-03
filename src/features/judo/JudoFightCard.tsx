import { Trophy } from "lucide-react";

import type { JudoCompetitor, JudoFight } from "@/api/grs/judo";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

function ScoreChips({ c }: { c: JudoCompetitor }) {
  const chips: { label: string; value: number; tone: string }[] = [
    { label: "I", value: c.ippon, tone: "text-[var(--color-success)]" },
    { label: "W", value: c.wazaAri, tone: "text-[var(--color-primary)]" },
    { label: "Y", value: c.yuko, tone: "text-[var(--color-muted-foreground)]" },
  ];
  return (
    <div className="flex items-center gap-1.5 text-xs tabular-nums">
      {chips.map((ch) => (
        <span key={ch.label} className={cn("font-semibold", ch.value > 0 ? ch.tone : "opacity-40")}>
          {ch.label} {ch.value}
        </span>
      ))}
      {c.shido > 0 && (
        <span className="font-semibold text-[var(--color-warning)]">S {c.shido}</span>
      )}
    </div>
  );
}

function Competitor({ c, decided }: { c: JudoCompetitor | null; decided: boolean }) {
  if (!c) {
    return (
      <div className="flex items-center gap-3 rounded-md bg-[var(--color-muted)]/40 px-2.5 py-2">
        <span className="size-4 shrink-0" />
        <span className="text-sm text-[var(--color-muted-foreground)]">Por definir</span>
      </div>
    );
  }
  const isLoser = decided && !c.isWinner;
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md px-2.5 py-2",
        c.isWinner && "bg-[var(--color-success)]/12",
      )}
    >
      <Trophy
        className={cn(
          "size-4 shrink-0",
          c.isWinner ? "text-[var(--color-success)]" : "text-transparent",
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm leading-tight",
            c.isWinner ? "font-semibold" : "font-medium",
            isLoser && "text-[var(--color-muted-foreground)]",
          )}
        >
          {c.name}
          {c.delegation ? (
            <span className="text-[var(--color-muted-foreground)]"> ({c.delegation})</span>
          ) : null}
        </p>
        {c.irm ? (
          <p className="text-xs text-[var(--color-destructive)]">{c.irm}</p>
        ) : null}
      </div>
      <ScoreChips c={c} />
    </div>
  );
}

function StatusBadge({ status }: { status: JudoFight["status"] }) {
  if (status === "completed") return <Badge variant="success">finalizada</Badge>;
  if (status === "live") return <Badge variant="warning">en vivo</Badge>;
  return <Badge variant="secondary">programada</Badge>;
}

export function JudoFightCard({ fight }: { fight: JudoFight }) {
  const decided = !!(fight.competitor1?.isWinner || fight.competitor2?.isWinner);
  return (
    <div className="overflow-hidden rounded-lg border bg-[var(--color-card)]">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-muted)]/30 px-3 py-1.5">
        <span className="truncate text-xs font-medium text-[var(--color-muted-foreground)]">
          {fight.round || "Luta"}
          {fight.order ? ` · #${fight.order}` : ""}
        </span>
        <StatusBadge status={fight.status} />
      </div>
      <div className="space-y-1 p-2">
        <Competitor c={fight.competitor1} decided={decided} />
        <Competitor c={fight.competitor2} decided={decided} />
      </div>
    </div>
  );
}
