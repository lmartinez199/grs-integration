import { request } from "@/lib/http";

/**
 * Sincronización Zempo vía GRS — servicio "grs", por lo que viaja con el JWT
 * del operador. Los endpoints /zempo/* aceptan ese Bearer: el ApiKeyGuard cede
 * a JWT cuando no hay x-api-key, y el InternalServiceGuard deja pasar cualquier
 * Bearer con formato JWT. Por eso NO se requiere API key desde la app.
 *
 * Espejo de `ZempoController` (grs-backend-v2). Estos endpoints devuelven el DTO
 * directo (sin envoltura { message, value }).
 */

/** Resumen de una fase de sincronización (created/processed/skipped + errores). */
export interface ZempoSyncSummary {
  processed: number;
  created: number;
  skipped: number;
  errors: string[];
}

/** Respuesta de los endpoints que encolan trabajo asíncrono (resultados). */
export interface ZempoQueued {
  jobId: string | undefined;
  queued: boolean;
}

const enc = encodeURIComponent;

/** Fase 1 — crea competiciones, fases y units desde las categorías de Zempo. */
export const zempoSetup = (
  cod: string,
  body: { eventCode: string; startDate?: string; endDate?: string },
) =>
  request<ZempoSyncSummary>("grs", `/zempo/sync/setup/${enc(cod)}`, {
    method: "POST",
    body,
  });

/** Fase 2 — sincroniza los participantes inscritos. */
export const zempoSyncParticipants = (cod: string, idCategoria?: string) =>
  request<ZempoSyncSummary>("grs", `/zempo/sync/participants/${enc(cod)}`, {
    method: "POST",
    body: { id_categoria: idCategoria },
  });

/** Fase 2b — asigna participantes a sus units de luta (start list). */
export const zempoSyncStartList = (cod: string, idCategoria?: string) =>
  request<ZempoSyncSummary>("grs", `/zempo/sync/start-list/${enc(cod)}`, {
    method: "POST",
    body: { id_categoria: idCategoria },
  });

/** Equipos — crea o actualiza los grupos (equipos) en GRS. */
export const zempoSyncTeamGroups = (
  cod: string,
  body: { category?: string; startDate?: string; endDate?: string } = {},
) =>
  request<ZempoSyncSummary>("grs", `/zempo/sync/team-groups/${enc(cod)}`, {
    method: "POST",
    body,
  });

/** Fase 3 — encola la sincronización de resultados (asíncrono, vía cola). */
export const zempoSyncResults = (cod: string, idCategoria?: string) =>
  request<ZempoQueued>("grs", `/zempo/sync/results/${enc(cod)}`, {
    method: "POST",
    body: { id_categoria: idCategoria },
  });

/** Encola el resultado de una luta puntual. */
export const zempoSyncLutaResult = (cod: string, lutaId: string) =>
  request<ZempoQueued>(
    "grs",
    `/zempo/sync/results/${enc(cod)}/luta/${enc(lutaId)}`,
    { method: "POST" },
  );

/** Fase 4 — sincroniza el ranking final. */
export const zempoSyncRankings = (cod: string) =>
  request<ZempoSyncSummary>("grs", `/zempo/sync/rankings/${enc(cod)}`, {
    method: "POST",
  });

/** Federaciones de Zempo → organizaciones en GRS. */
export const zempoSyncFederacoes = () =>
  request<ZempoSyncSummary>("grs", `/zempo/sync/federacoes`, { method: "POST" });

/** Técnicos y árbitros desde Zempo hacia GRS. */
export const zempoSyncStaff = (cod: string) =>
  request<ZempoSyncSummary>("grs", `/zempo/sync/staff/${enc(cod)}`, {
    method: "POST",
  });

/** Inicia el auto-sync de resultados (worker jud-integration-zempo) vía GRS. */
export const zempoAutoSyncStart = (cod: string) =>
  request<unknown>("grs", `/zempo/auto-sync/start/${enc(cod)}`, {
    method: "POST",
  });

/** Detiene el auto-sync de resultados de una competición vía GRS. */
export const zempoAutoSyncStop = (cod: string) =>
  request<unknown>("grs", `/zempo/auto-sync/stop/${enc(cod)}`, {
    method: "DELETE",
  });

// ---- Lecturas directas de Zempo (vía GRS, sin persistir) -------------------

/** Preview de una competición (nombre + conteos), sin sincronizar. */
export interface ZempoPreview {
  competicaoNome: string;
  totalCategorias: number;
  sorteadas: number;
  totalInscritos: number;
}

/** Diagnóstico de conexión GRS↔Zempo. */
export interface ZempoHealth {
  connected: boolean;
  error?: string;
}

/** Una luta dentro del orden del día (tatami schedule). Valores string (Zempo). */
export interface ZempoOrdemLuta {
  id: string;
  id_luta: string;
  ordem: string;
  area: string;
  dia: string;
  turno: string;
  numero: string;
  rodada: string;
  competidor1_nome_completo: string;
  competidor1_estado: string;
  competidor2_nome_completo: string | null;
  competidor2_estado: string | null;
  encerrada: string;
  tecnica_vencedora: string | null;
  vencedor_numero: string;
  id_categoria: string;
  categoria_peso: string;
  sexo_nome: string;
}

/** Un puesto del pódio final de una categoría. */
export interface ZempoResultado {
  colocacao: string;
  colocacao_orden: string;
  atleta_codigo: string;
  atleta_nome_completo: string;
  atleta_federacao_sigla: string;
  id_categoria: string;
  categoria_peso: string;
}

export interface FightOrderFilters {
  dia?: string;
  turno?: string;
  area?: string;
  id_categoria?: string;
  encerradas?: "1";
  agendadas?: "1";
}

/** GET /zempo/preview/:cod — nombre + conteos de la competición. */
export const getZempoPreview = (cod: string) =>
  request<ZempoPreview>("grs", `/zempo/preview/${enc(cod)}`);

/** GET /zempo/results/:cod — resultados finales (pódio). */
export const getZempoResults = (cod: string, idCategoria?: string) => {
  const qs = idCategoria
    ? `?${new URLSearchParams({ id_categoria: idCategoria }).toString()}`
    : "";
  return request<ZempoResultado[]>("grs", `/zempo/results/${enc(cod)}${qs}`);
};

/** GET /zempo/fight-order/:cod — orden de lutas (tatami) con filtros. */
export const getFightOrder = (cod: string, filters: FightOrderFilters = {}) => {
  const entries = Object.entries(filters).filter(([, v]) => v != null && v !== "");
  const qs = entries.length
    ? `?${new URLSearchParams(Object.fromEntries(entries) as Record<string, string>).toString()}`
    : "";
  return request<ZempoOrdemLuta[]>("grs", `/zempo/fight-order/${enc(cod)}${qs}`);
};

/** GET /zempo/health — diagnóstico de conexión con Zempo. */
export const zempoHealth = () => request<ZempoHealth>("grs", "/zempo/health");
