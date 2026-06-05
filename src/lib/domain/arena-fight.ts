import type { ArenaFight } from "@/api/grs/arena";

/** Filtro de estado para listar peleas. */
export type FightStatusFilter = "all" | "done" | "pending";

/** Marcador por lado: usa score plano del backend, con fallback a technicalPoints. */
export function score(fight: ArenaFight, side: 1 | 2): number | null {
  const flat = side === 1 ? fight.score1 : fight.score2;
  if (flat != null) return flat;
  const fighterId = side === 1 ? fight.fighter1Id : fight.fighter2Id;
  return fight.technicalPoints?.[fighterId]?.total ?? null;
}

/** Puntos técnicos por round, resolviendo el número desde el UUID (como el backend). */
export function roundBreakdown(fight: ArenaFight): { n: number; p1: number; p2: number }[] {
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

/** Texto buscable de una pelea: id + nombres + equipos (en minúsculas). */
export function fightSearchText(f: ArenaFight): string {
  return [
    f.id,
    f.fighter1Name,
    f.fighter2Name,
    f.team1Name,
    f.team2Name,
    f.team1AlternateName,
    f.team2AlternateName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** ¿La pelea pasa el filtro de estado? */
export function matchesFightStatus(f: ArenaFight, filter: FightStatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "done") return !!f.isCompleted;
  return !f.isCompleted;
}
