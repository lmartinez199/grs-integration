import type { AthStartListEntry } from "@/api/ath";

/** Equipo de relevo: agrupa atletas de un mismo club/serie en una start list. */
export interface RelayTeam {
  key: string;
  club: string;
  codeClub: string;
  lane: number;
  serie: number;
  result: string | null;
  athletes: AthStartListEntry[];
}

/**
 * Tipos de prueba donde los "intentos" son medidas con sentido (lanzamientos,
 * saltos horizontales: ej. "38.72"). En salto de altura/pértiga ("Vertical")
 * los intentos son notación por altura (O/X/-) y NO se muestran como lista;
 * en pista y relevos no aplican.
 */
export function showsAttempts(e: AthStartListEntry): boolean {
  const t = e.Type?.toLowerCase() ?? "";
  return !["vertical", "pista", "reveza"].includes(t);
}

/**
 * Marcas de intentos legibles: solo medidas decimales reales (ej. "38.72") y
 * el marcador de nulo "x" (intento fallido en lanzamientos). Descarta basura
 * como "07" o "-".
 */
export function attemptsText(e: AthStartListEntry): string {
  if (!showsAttempts(e)) return "";
  const marks = (e.attempts ?? [])
    .map((a) => a.marca?.trim())
    .filter((m): m is string => !!m && (/\d[.,]\d/.test(m) || /^x$/i.test(m)));
  return marks.join(" · ");
}

/** Resultado mostrable de una entrada: resultado final o mejor marca. */
export function startListResult(e: AthStartListEntry): string | null {
  if (e.FinalResult && e.FinalResult.trim() !== "") return e.FinalResult;
  if (e.BestMark && e.BestMark.trim() !== "") return `Mejor: ${e.BestMark}`;
  return null;
}

/** Etiqueta legible del género de una prueba. */
export function genderLabel(g: string): string {
  const v = g?.toUpperCase();
  if (v === "F") return "Femenino";
  if (v === "M") return "Masculino";
  return g || "Mixto";
}

/** ¿Es una prueba de relevos? */
export function isRelay(entries: AthStartListEntry[]): boolean {
  return entries[0]?.Type?.toLowerCase() === "reveza";
}

/** Agrupa las entradas de un relevo por equipo (club/serie), preservando orden. */
export function groupRelayTeams(entries: AthStartListEntry[]): RelayTeam[] {
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
        result: startListResult(e),
        athletes: [],
      };
      teams.push(team);
    }
    team.athletes.push(e);
    if (!team.result) team.result = startListResult(e);
  }
  return teams;
}
