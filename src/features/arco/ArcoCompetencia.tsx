import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ChevronRight } from "lucide-react";

import { getArcoCategories, getArcoMatches, type ArcoCategory, type ArcoMatch } from "@/api/grs/arco";
import { SYNC_INTERVAL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { RetryNotice } from "@/components/ui/retry-notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArcoMatchCard } from "./ArcoMatchCard";

/** Agrupa los matches por ronda preservando el orden de llegada. */
function groupByRound(matches: ArcoMatch[]): { round: string; items: ArcoMatch[] }[] {
  const rounds: { round: string; items: ArcoMatch[] }[] = [];
  for (const m of matches) {
    const round = m.round || "Sin ronda";
    let r = rounds.find((x) => x.round === round);
    if (!r) {
      r = { round, items: [] };
      rounds.push(r);
    }
    r.items.push(m);
  }
  return rounds;
}

export function ArcoCompetencia() {
  const [selected, setSelected] = useState<ArcoCategory | null>(null);

  const categories = useQuery({
    queryKey: ["arco", "categories"],
    queryFn: getArcoCategories,
    refetchInterval: SYNC_INTERVAL,
  });

  const matches = useQuery({
    queryKey: ["arco", "matches", selected?.sportEvent, selected?.gender, selected?.category],
    queryFn: () => getArcoMatches(selected!.sportEvent, selected!.gender, selected!.category),
    enabled: selected != null,
    refetchInterval: SYNC_INTERVAL,
  });

  const rounds = groupByRound(matches.data ?? []);

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-4 lg:grid-cols-[1fr_1.6fr]">
      <Card className="flex min-h-0 flex-col">
        <CardHeader className="shrink-0 flex-row items-center justify-between space-y-0">
          <CardTitle>Categorías</CardTitle>
          {categories.data && <Badge variant="secondary">{categories.data.length}</Badge>}
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-auto">
          {categories.isLoading ? (
            <Loader2 className="size-5 animate-spin text-(--color-muted-foreground)" aria-hidden />
          ) : categories.isError ? (
            <RetryNotice
              message="Error al cargar las categorías de arco."
              onRetry={() => categories.refetch()}
              isRetrying={categories.isFetching}
            />
          ) : (categories.data ?? []).length === 0 ? (
            <p className="text-sm text-(--color-muted-foreground)">
              No hay categorías de arco sincronizadas todavía.
            </p>
          ) : (
            <ul className="space-y-1 pr-1">
              {(categories.data ?? []).map((c) => {
                const isSel =
                  selected?.sportEvent === c.sportEvent &&
                  selected?.gender === c.gender &&
                  selected?.category === c.category;
                return (
                  <li key={`${c.sportEvent}|${c.gender}|${c.category}`}>
                    <button
                      onClick={() => setSelected(c)}
                      aria-current={isSel}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-md border border-transparent px-3 py-2 text-left transition-colors",
                        isSel
                          ? "border-(--color-primary) bg-(--color-primary)/12"
                          : "hover:bg-(--color-muted)",
                      )}
                    >
                      <span
                        className={cn(
                          "truncate text-sm font-medium",
                          isSel && "text-(--color-primary)",
                        )}
                      >
                        {c.name}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-xs text-(--color-muted-foreground)">
                          {c.countCompleted}/{c.countMatches}
                        </span>
                        <ChevronRight className="size-4" aria-hidden />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="flex min-h-0 flex-col">
        <CardHeader className="shrink-0 flex-row items-center justify-between space-y-0">
          <CardTitle>
            Matches
            {selected ? (
              <span className="ml-2 text-sm font-normal text-(--color-muted-foreground)">
                {selected.name}
              </span>
            ) : null}
          </CardTitle>
          {matches.data && <Badge variant="secondary">{matches.data.length}</Badge>}
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-auto">
          {selected == null ? (
            <p className="text-sm text-(--color-muted-foreground)">
              Selecciona una categoría para ver sus matches.
            </p>
          ) : matches.isLoading ? (
            <Loader2 className="size-5 animate-spin text-(--color-muted-foreground)" aria-hidden />
          ) : matches.isError ? (
            <RetryNotice
              message="Error al cargar los matches."
              onRetry={() => matches.refetch()}
              isRetrying={matches.isFetching}
            />
          ) : rounds.length === 0 ? (
            <p className="text-sm text-(--color-muted-foreground)">
              Esta categoría no tiene matches.
            </p>
          ) : (
            <div className="space-y-4 pr-1">
              {rounds.map((r) => (
                <div key={r.round}>
                  <h3 className="mb-1.5 text-sm font-semibold text-(--color-primary)">
                    {r.round}
                    <span className="ml-2 font-normal text-(--color-muted-foreground)">
                      {r.items.length}
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {r.items.map((m) => (
                      <ArcoMatchCard key={m.id} match={m} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
