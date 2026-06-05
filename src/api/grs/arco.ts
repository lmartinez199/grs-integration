import { request } from "@/lib/http";

/**
 * Lectura de ARCO (tiro con arco) desde GRS. Dos familias:
 * - Monitor de ingesta: documentos ODF crudos recibidos de IANSEO por SFTP.
 * - Competencia (F2/F3): categorías → fases → matches (units/results normalizados).
 */

// ---- Monitor de ingesta --------------------------------------------------

export interface ArcoDocumentSummary {
  id: string;
  /** ISO date string. */
  date: string;
  documentType: string;
  /** FeedFlag del header ODF: "T" = Test, "P" = Producción (vacío si no viene). */
  feedFlag: string;
  competitionCode: string;
  documentCode: string;
  version: string;
  unitCount: number;
}

export interface ArcoDocumentList {
  items: ArcoDocumentSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ArcoDocumentDetail extends ArcoDocumentSummary {
  /** Contenido crudo del ODF (JSON parseado; string si no era JSON). */
  content: unknown;
  unitCodes: string[];
}

export interface ArcoDocumentsParams {
  type?: string;
  competition?: string;
  documentCode?: string;
  page?: number;
  pageSize?: number;
}

/** GET /arco/documents — documentos ODF de arco recibidos (monitor de ingesta). */
export const getArcoDocuments = (params: ArcoDocumentsParams = {}) => {
  const qs = new URLSearchParams();
  if (params.type) qs.set("type", params.type);
  if (params.competition) qs.set("competition", params.competition);
  if (params.documentCode) qs.set("documentCode", params.documentCode);
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("pageSize", String(params.pageSize));
  const q = qs.toString();
  return request<ArcoDocumentList>("grs", `/arco/documents${q ? `?${q}` : ""}`);
};

/** GET /arco/documents/:id — detalle de un documento ODF con su contenido crudo. */
export const getArcoDocument = (id: string) =>
  request<ArcoDocumentDetail>("grs", `/arco/documents/${encodeURIComponent(id)}`);

// ---- Competencia ---------------------------------------------------------

export interface ArcoCategory {
  sportEvent: string;
  gender: string;
  category: string;
  name: string;
  countMatches: number;
  countCompleted: number;
}

export interface ArcoScore {
  code: string;
  value: string;
}

export interface ArcoCompetitor {
  name: string;
  delegation: string;
  isGroup: boolean;
  score: string;
  scores: ArcoScore[];
  isWinner: boolean;
  wlt: string;
  irm: string;
}

export interface ArcoMatch {
  id: string;
  matchId: string | null;
  round: string;
  order: number;
  status: "scheduled" | "live" | "completed";
  competitor1: ArcoCompetitor | null;
  competitor2: ArcoCompetitor | null;
}

/** GET /arco/categories — categorías de arco con conteos. */
export const getArcoCategories = () => request<ArcoCategory[]>("grs", "/arco/categories");

/** GET /arco/matches — matches de una categoría (sportEvent + gender + category). */
export const getArcoMatches = (sportEvent: string, gender: string, category: string) => {
  const qs = new URLSearchParams({ sportEvent, gender, category });
  return request<ArcoMatch[]>("grs", `/arco/matches?${qs.toString()}`);
};
