import { Users } from "lucide-react";

import type { AthStartListEntry } from "@/api/ath";
import {
  attemptsText,
  startListResult,
  reactionTime,
  pointsText,
  isRelay,
  groupRelayTeams,
} from "@/lib/domain/ath-start-list";

export function StartList({ entries }: { entries: AthStartListEntry[] }) {
  if (!entries.length) {
    return (
      <p className="text-sm text-(--color-muted-foreground)">
        Sin competidores en esta start list.
      </p>
    );
  }

  return isRelay(entries) ? <RelayList entries={entries} /> : <IndividualList entries={entries} />;
}

// ---- Pruebas individuales ------------------------------------------------

function IndividualList({ entries }: { entries: AthStartListEntry[] }) {
  return (
    <ul className="space-y-1.5">
      {entries.map((e, i) => {
        const attempts = attemptsText(e);
        const res = startListResult(e);
        const reac = reactionTime(e);
        const pts = pointsText(e);
        return (
          <li
            key={`${e.CompetitorName}-${e.Bib}-${i}`}
            className="rounded-md bg-(--color-background) px-3 py-2"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 rounded bg-(--color-muted) px-1.5 py-0.5 text-xs font-medium tabular-nums text-(--color-muted-foreground)">
                  {e.Lane ? `Carril ${e.Lane}` : `#${e.Bib}`}
                </span>
                <span className="truncate text-sm font-medium">{e.CompetitorName}</span>
                {e.Club && (
                  <span className="shrink-0 text-xs text-(--color-muted-foreground)">
                    ({e.Club})
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2 text-right">
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
                {res && <span className="text-xs font-semibold tabular-nums">{res}</span>}
              </div>
            </div>
            {attempts && (
              <p className="mt-1 text-xs text-(--color-muted-foreground)">
                Intentos: <span className="tabular-nums">{attempts}</span>
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ---- Relevos (agrupados por equipo) --------------------------------------

function RelayList({ entries }: { entries: AthStartListEntry[] }) {
  const teams = groupRelayTeams(entries);

  return (
    <ul className="space-y-2">
      {teams.map((team) => (
        <li key={team.key} className="rounded-md bg-(--color-background) p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Users className="size-4 shrink-0 text-(--color-primary)" />
              <span className="truncate text-sm font-semibold">
                {team.club}
                {team.codeClub ? (
                  <span className="text-(--color-muted-foreground)"> ({team.codeClub})</span>
                ) : null}
              </span>
              <span className="shrink-0 text-xs text-(--color-muted-foreground)">
                {team.lane ? `· Carril ${team.lane}` : ""}
                {team.serie ? ` · Serie ${team.serie}` : ""}
              </span>
            </div>
            {team.result && (
              <span className="shrink-0 text-xs font-semibold tabular-nums">{team.result}</span>
            )}
          </div>
          <ol className="mt-1.5 ml-6 list-decimal space-y-0.5 text-sm text-(--color-foreground) marker:text-(--color-muted-foreground)">
            {team.athletes.map((a, i) => (
              <li key={`${a.CompetitorName}-${i}`} className="pl-1">
                {a.CompetitorName}
              </li>
            ))}
          </ol>
        </li>
      ))}
    </ul>
  );
}
