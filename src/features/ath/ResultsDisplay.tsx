import { Trophy } from "lucide-react";

import type { AthStartListEntry } from "@/api/ath";
import {
  startListResult,
  reactionTime,
  pointsText,
  isRelay,
  groupRelayTeams,
} from "@/lib/domain/ath-start-list";

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

/** Solo entradas con marca; ordenadas por posición real (RkPo>0) y luego por orden de llegada. */
function ranked(entries: AthStartListEntry[]): AthStartListEntry[] {
  return entries
    .filter((e) => startListResult(e) !== null)
    .sort((a, b) => {
      const pa = a.RkPo > 0 ? a.RkPo : Number.MAX_SAFE_INTEGER;
      const pb = b.RkPo > 0 ? b.RkPo : Number.MAX_SAFE_INTEGER;
      return pa - pb;
    });
}

export function ResultsDisplay({
  entries,
  live,
}: {
  entries: AthStartListEntry[];
  live: boolean;
}) {
  if (!entries.length) {
    return (
      <p className="text-sm text-(--color-muted-foreground)">
        Sin resultados todavía.
      </p>
    );
  }

  const rows = ranked(entries);
  if (!rows.length) {
    return (
      <p className="text-sm text-(--color-muted-foreground)">
        Aún no hay marcas cargadas.
      </p>
    );
  }

  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-(--color-muted-foreground)">
        <Trophy className="size-3.5" />
        {live ? "En curso (provisional)" : "Resultados oficiales"}
      </p>
      {isRelay(entries) ? (
        <RelayResults entries={entries} />
      ) : (
        <ol className="space-y-1">
          {rows.map((e, i) => {
            const reac = reactionTime(e);
            const pts = pointsText(e);
            const hasPos = e.RkPo > 0;
            return (
              <li
                key={`${e.CompetitorName}-${e.Bib}-${i}`}
                className="flex items-center gap-2 rounded-md bg-(--color-background) px-3 py-1.5"
              >
                <span className="w-6 shrink-0 text-center text-sm font-semibold tabular-nums">
                  {hasPos ? (MEDAL[e.RkPo] ?? e.RkPo) : "–"}
                </span>
                <span className="min-w-0 truncate text-sm font-medium">
                  {e.CompetitorName}
                </span>
                {e.Club && (
                  <span className="shrink-0 truncate text-xs text-(--color-muted-foreground)">
                    ({e.Club})
                  </span>
                )}
                <span className="ml-auto flex shrink-0 items-center gap-2 text-right">
                  {reac && (
                    <span className="rounded bg-(--color-muted) px-1.5 py-0.5 text-xs tabular-nums text-(--color-muted-foreground)">
                      Reaç {reac}
                    </span>
                  )}
                  {pts && (
                    <span className="rounded bg-(--color-muted) px-1.5 py-0.5 text-xs tabular-nums text-(--color-muted-foreground)">
                      {pts} pts
                    </span>
                  )}
                  <span className="text-sm font-semibold tabular-nums">
                    {startListResult(e)}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

// ---- Relevos: resultado por equipo --------------------------------------

function RelayResults({ entries }: { entries: AthStartListEntry[] }) {
  const teams = groupRelayTeams(entries)
    .filter((t) => t.result)
    .sort((a, b) => (a.result ?? "").localeCompare(b.result ?? ""));

  return (
    <ol className="space-y-1">
      {teams.map((team, i) => (
        <li
          key={team.key}
          className="flex items-center gap-2 rounded-md bg-(--color-background) px-3 py-1.5"
        >
          <span className="w-6 shrink-0 text-center text-sm font-semibold tabular-nums">
            {MEDAL[i + 1] ?? i + 1}
          </span>
          <span className="min-w-0 truncate text-sm font-medium">{team.club}</span>
          <span className="ml-auto shrink-0 text-sm font-semibold tabular-nums">
            {team.result}
          </span>
        </li>
      ))}
    </ol>
  );
}
