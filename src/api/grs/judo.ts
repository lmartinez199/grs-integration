import { request } from "@/lib/http";

/**
 * Lectura de judo (JUD) desde GRS — espejo de WRE/arena. Datos leídos de las
 * units/results ya sincronizados (vía el microservicio zempo).
 */

export interface JudoCategory {
  sportEvent: string;
  gender: string;
  category: string;
  name: string;
  countFights: number;
  countCompleted: number;
}

export interface JudoCompetitor {
  name: string;
  delegation: string;
  ippon: number;
  wazaAri: number;
  yuko: number;
  shido: number;
  total: number;
  isWinner: boolean;
  irm: string;
}

export interface JudoFight {
  id: string;
  lutaId: string | null;
  round: string;
  order: number;
  status: "scheduled" | "live" | "completed";
  competitor1: JudoCompetitor | null;
  competitor2: JudoCompetitor | null;
}

/** GET /api/judo/categories — categorías de judo con conteos. */
export const getJudoCategories = () => request<JudoCategory[]>("grs", "/judo/categories");

/** GET /api/judo/fights — lutas de una categoría (sportEvent + gender + category). */
export const getJudoFights = (sportEvent: string, gender: string, category: string) => {
  const qs = new URLSearchParams({ sportEvent, gender, category });
  return request<JudoFight[]>("grs", `/judo/fights?${qs.toString()}`);
};
