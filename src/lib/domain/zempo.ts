import type { ZempoOrdemLuta, ZempoResultado } from "@/api/grs/zempo-sync";
import type { ZempoSchedule } from "@/api/zempo";

/** Emoji de medalla por colocación de pódio. */
export const MEDAL: Record<string, string> = { "1º": "🥇", "2º": "🥈", "3º": "🥉" };

/** Parsea un string a número, devolviendo +∞ si no es numérico (para ordenar al final). */
function numOrInfinity(s: string): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

/** Agrupa el orden de lutas por área (numérica si aplica) y ordena cada grupo por `ordem`. */
export function groupFightOrderByArea(
  lutas: ZempoOrdemLuta[],
): [string, ZempoOrdemLuta[]][] {
  const map = new Map<string, ZempoOrdemLuta[]>();
  for (const l of lutas) {
    const k = l.area || "—";
    const arr = map.get(k);
    if (arr) arr.push(l);
    else map.set(k, [l]);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => numOrInfinity(a.ordem) - numOrInfinity(b.ordem));
  }
  return [...map.entries()].sort((a, b) => numOrInfinity(a[0]) - numOrInfinity(b[0]));
}

/** Agrupa resultados por categoría y ordena cada pódio por colocación. */
export function groupResultsByCategoria(
  rows: ZempoResultado[],
): [string, ZempoResultado[]][] {
  const map = new Map<string, ZempoResultado[]>();
  for (const r of rows) {
    const k = r.id_categoria || r.categoria_peso || "—";
    const arr = map.get(k);
    if (arr) arr.push(r);
    else map.set(k, [r]);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => numOrInfinity(a.colocacao_orden) - numOrInfinity(b.colocacao_orden));
  }
  return [...map.entries()];
}

/** Competiciones con sync activa: descarta entradas sin código. */
export function filterActiveSchedules(data: unknown): ZempoSchedule[] {
  return (Array.isArray(data) ? (data as ZempoSchedule[]) : []).filter(
    (s) => String(s.competicaoCodigo ?? "").trim() !== "",
  );
}
