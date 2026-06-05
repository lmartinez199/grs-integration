import { request } from "@/lib/http";

// ---- Tipos ARENA ---------------------------------------------------------

export interface ArenaSettings {
  id: string;
  baseUrl: string;
  isEnabled: boolean;
  eventCode: string;
  updatedAt: string;
}

/** Evento deportivo de Arena (datos crudos; se exponen los campos usados). */
export interface ArenaSportEvent {
  id?: string;
  name?: string;
  fullName?: string;
  startDate?: string;
  endDate?: string;
  address?: string;
  addressLocality?: string;
  isIndividualEvent?: boolean;
  isTeamEvent?: boolean;
  athlete1Color?: string;
  athlete1TextColor?: string;
  athlete2Color?: string;
  athlete2TextColor?: string;
  [key: string]: unknown;
}

/** Categoría de peso de Arena (incluye conteos de peleas y atletas). */
export interface ArenaCategory {
  id: string | number;
  name?: string;
  shortName?: string;
  maxWeight?: number;
  countFighters?: number;
  countFights?: number;
  [key: string]: unknown;
}

interface ArenaTechnicalPoints {
  fullName?: string;
  total?: number;
  /** Indexado por UUID del round; `number` es el round 1-based, `total` sus puntos. */
  rounds?: Record<string, { number: number; total: number }>;
}

export interface ArenaFight {
  id?: string;
  fighter1Id: string;
  fighter2Id: string;
  roundFriendlyName: string;
  displayOrderInRound: number;
  matName?: string;
  sessionName?: string;
  sessionStartDate?: string;
  team1Name: string;
  team1AlternateName?: string;
  team2Name: string;
  team2AlternateName?: string;
  /** true cuando la pelea ya terminó en Arena. */
  isCompleted: boolean;
  /** UUIDs de los rounds (para resolver el número de round de forma fiable). */
  round1Id?: string;
  round2Id?: string;
  roundIds?: Record<string, string>;
  /** fighterId del ganador (coincide con fighter1Id o fighter2Id). */
  winnerFighter?: string | null;
  /** Código de victoria Arena (VSU1, VFO, DSQ…). */
  victoryType?: string | null;
  /** Resultado legible, ej. "5-0(0-0) by VFO". */
  result?: string | null;
  /** Puntos técnicos indexados por fighterId. */
  technicalPoints?: Record<string, ArenaTechnicalPoints>;

  // ── Campos enriquecidos por el backend (ArenaFightDto) ──
  /** Nombre del luchador 1/2 resuelto por el backend (individual). */
  fighter1Name?: string | null;
  fighter2Name?: string | null;
  /** Marcadores planos por lado (atajo de technicalPoints[id].total). */
  score1?: number | null;
  score2?: number | null;
  /** Etiqueta legible del tipo de victoria (ej. "Forfait"). */
  victoryLabel?: string | null;
  /** Estado derivado por el backend. */
  status?: "scheduled" | "live" | "completed";
}

export interface ArenaWebhook {
  id: number;
  name: string;
  url: string;
  status: number; // 1 = enabled, 0 = disabled
}

// ---- Settings ------------------------------------------------------------

export const getArenaSettings = () => request<ArenaSettings>("grs", "/arena/settings");

export const updateArenaBaseUrl = (baseUrl: string) =>
  request<ArenaSettings>("grs", "/arena/settings/base-url", {
    method: "PUT",
    body: { baseUrl },
  });

export const updateArenaEventCode = (eventCode: string) =>
  request<ArenaSettings>("grs", "/arena/settings/event-code", {
    method: "PUT",
    body: { eventCode },
  });

// ---- Sync (lectura) ------------------------------------------------------

export const getCurrentEvent = () =>
  request<ArenaSportEvent>("grs", "/arena/sync/current-event");

export const getCategories = () => request<ArenaCategory[]>("grs", "/arena/sync/categories");

export const getCategoryFights = (categoryId: string | number) =>
  request<ArenaFight[]>("grs", `/arena/sync/categories/${categoryId}/fights`);

// ---- Sync (acciones) -----------------------------------------------------

/**
 * Resumen de un sync de Arena (espejo de `SyncSummaryResponseDto` del GRS).
 * Cada endpoint rellena los campos que aplican a su naturaleza; el resto queda
 * en 0 / [].
 */
export interface ArenaSyncSummary {
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export const triggerFullSync = () =>
  request<ArenaSyncSummary>("grs", "/arena/sync", { method: "POST" });

export const startAutoSync = () =>
  request<{ isEnabled: boolean }>("grs", "/arena/sync/start", { method: "POST" });

export const stopAutoSync = () =>
  request<{ isEnabled: boolean }>("grs", "/arena/sync/stop", { method: "POST" });

export const syncResults = () =>
  request<ArenaSyncSummary>("grs", "/arena/sync/results", { method: "POST" });

/** Re-sincroniza el bracket completo de una categoría (POST /arena/sync/category/:id). */
export const syncCategory = (categoryId: string | number) =>
  request<ArenaSyncSummary>("grs", `/arena/sync/category/${categoryId}`, {
    method: "POST",
  });

/** Re-sincroniza una sola pelea (POST /arena/sync/fight/:id). */
export const syncFight = (fightId: string) =>
  request<ArenaSyncSummary>("grs", `/arena/sync/fight/${fightId}`, {
    method: "POST",
  });

export const syncParticipants = () =>
  request<ArenaSyncSummary>("grs", "/arena/sync/participants", { method: "POST" });

export const syncGroups = () =>
  request<ArenaSyncSummary>("grs", "/arena/sync/groups", { method: "POST" });

// ---- Webhooks ------------------------------------------------------------

export interface CreateArenaWebhook {
  url: string;
  name?: string;
  token?: string;
}

export const listWebhooks = () => request<ArenaWebhook[]>("grs", "/arena/webhooks");

/** Registra GRS como receptor de webhooks en Arena (POST /arena/webhooks). */
export const createWebhook = (body: CreateArenaWebhook) =>
  request<ArenaWebhook>("grs", "/arena/webhooks", { method: "POST", body });

export const enableWebhook = (id: number) =>
  request<void>("grs", `/arena/webhooks/${id}/enable`, { method: "POST" });

export const disableWebhook = (id: number) =>
  request<void>("grs", `/arena/webhooks/${id}/disable`, { method: "POST" });

export const removeWebhook = (id: number) =>
  request<void>("grs", `/arena/webhooks/${id}`, { method: "DELETE" });
