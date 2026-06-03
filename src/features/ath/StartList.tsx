import { Users } from "lucide-react";

import type { AthStartListEntry } from "@/api/ath";

/**
 * Tipos de prueba donde los "intentos" son medidas con sentido (lanzamientos,
 * saltos horizontales: ej. "38.72"). En salto de altura/pértiga ("Vertical")
 * los intentos son notación por altura (O/X/-) y NO se muestran como lista;
 * en pista y relevos no aplican.
 */
function showsAttempts(e: AthStartListEntry): boolean {
  const t = e.Type?.toLowerCase() ?? "";
  return !["vertical", "pista", "reveza"].includes(t);
}

/**
 * Marcas de intentos legibles: solo medidas decimales reales (ej. "38.72") y
 * el marcador de nulo "x" (intento fallido en lanzamientos). Descarta basura
 * como "07" o "-".
 */
function attemptsText(e: AthStartListEntry): string {
  if (!showsAttempts(e)) return "";
  const marks = (e.attempts ?? [])
    .map((a) => a.marca?.trim())
    .filter((m): m is string => !!m && (/\d[.,]\d/.test(m) || /^x$/i.test(m)));
  return marks.join(" · ");
}

function result(e: AthStartListEntry): string | null {
  if (e.FinalResult && e.FinalResult.trim() !== "") return e.FinalResult;
  if (e.BestMark && e.BestMark.trim() !== "") return `Mejor: ${e.BestMark}`;
  return null;
}

export function StartList({ entries }: { entries: AthStartListEntry[] }) {
  if (!entries.length) {
    return (
      <p className="text-sm text-[var(--color-muted-foreground)]">
        Sin competidores en esta start list.
      </p>
    );
  }

  const isRelay = entries[0]?.Type?.toLowerCase() === "reveza";
  return isRelay ? <RelayList entries={entries} /> : <IndividualList entries={entries} />;
}

// ---- Pruebas individuales ------------------------------------------------

function IndividualList({ entries }: { entries: AthStartListEntry[] }) {
  return (
    <ul className="space-y-1.5">
      {entries.map((e, i) => {
        const attempts = attemptsText(e);
        const res = result(e);
        return (
          <li
            key={`${e.CompetitorName}-${e.Bib}-${i}`}
            className="rounded-md bg-[var(--color-background)] px-3 py-2"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 rounded bg-[var(--color-muted)] px-1.5 py-0.5 text-xs font-medium tabular-nums text-[var(--color-muted-foreground)]">
                  {e.Lane ? `Carril ${e.Lane}` : `#${e.Bib}`}
                </span>
                <span className="truncate text-sm font-medium">{e.CompetitorName}</span>
                {e.Club && (
                  <span className="shrink-0 text-xs text-[var(--color-muted-foreground)]">
                    ({e.Club})
                  </span>
                )}
              </div>
              {res && <span className="shrink-0 text-right text-xs font-semibold tabular-nums">{res}</span>}
            </div>
            {attempts && (
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
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

interface RelayTeam {
  key: string;
  club: string;
  codeClub: string;
  lane: number;
  serie: number;
  result: string | null;
  athletes: AthStartListEntry[];
}

function RelayList({ entries }: { entries: AthStartListEntry[] }) {
  const teams: RelayTeam[] = [];
  for (const e of entries) {
    const key = e.CodeClub || `${e.Club}-${e.Lane}-${e.Serie}`;
    let team = teams.find((t) => t.key === key);
    if (!team) {
      team = {
        key,
        club: e.Club,
        codeClub: e.CodeClub,
        lane: e.Lane,
        serie: e.Serie,
        result: result(e),
        athletes: [],
      };
      teams.push(team);
    }
    team.athletes.push(e);
    if (!team.result) team.result = result(e);
  }

  return (
    <ul className="space-y-2">
      {teams.map((team) => (
        <li key={team.key} className="rounded-md bg-[var(--color-background)] p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Users className="size-4 shrink-0 text-[var(--color-primary)]" />
              <span className="truncate text-sm font-semibold">
                {team.club}
                {team.codeClub ? (
                  <span className="text-[var(--color-muted-foreground)]"> ({team.codeClub})</span>
                ) : null}
              </span>
              <span className="shrink-0 text-xs text-[var(--color-muted-foreground)]">
                {team.lane ? `· Carril ${team.lane}` : ""}
                {team.serie ? ` · Serie ${team.serie}` : ""}
              </span>
            </div>
            {team.result && (
              <span className="shrink-0 text-xs font-semibold tabular-nums">{team.result}</span>
            )}
          </div>
          <ol className="mt-1.5 ml-6 list-decimal space-y-0.5 text-sm text-[var(--color-foreground)] marker:text-[var(--color-muted-foreground)]">
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
