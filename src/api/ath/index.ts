import { request } from "@/lib/http";

/**
 * ath-microservice — ACL de atletismo (CBAT → GRS).
 * Endpoints bajo /api/ath. ath responde objetos crudos (sin envoltura
 * { message, value } como el GRS); las lecturas traen { message, data }.
 */

// ---- Estado del loop -----------------------------------------------------

export interface AthJobsStatus {
  active: boolean;
  message?: string;
  date?: string;
  hour?: string;
  startedAt?: string;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  lastGroupsSyncAt?: string;
  lastGroupsSyncStatus?: string;
  /** Si el loop reconcilia units (setup-units periódico, elimina huérfanas). */
  reconcileUnits?: boolean;
  lastUnitsReconcileAt?: string;
  lastUnitsReconcileStatus?: string;
}

export interface StartSyncOptions {
  date?: string;
  hour?: string;
  /** Incluir la sincronización de units (setup-units cada 5 min): refleja
   * eliminaciones del proveedor BORRANDO units huérfanas. Opt-in. */
  reconcileUnits?: boolean;
}

/** GET /api/ath/status-jobs — estado del loop de sincronización. */
export const getJobsStatus = () => request<AthJobsStatus>("ath", "/status-jobs");

/** POST /api/ath/start-sync-data — inicia el loop automático. */
export const startSyncData = (body: StartSyncOptions = {}) =>
  request<unknown>("ath", "/start-sync-data", { method: "POST", body });

/** POST /api/ath/stop-sync-data — detiene el loop. */
export const stopSyncData = () =>
  request<unknown>("ath", "/stop-sync-data", { method: "POST" });

// ---- Envío de resultados / sync manual -----------------------------------

/** Respuesta común de las acciones: incluye un mensaje legible. */
export interface AthActionResult {
  message?: string;
  [key: string]: unknown;
}

/**
 * POST /api/ath/manual-sync — envía solo UNIDADES a GRS para la fecha/hora
 * dadas (o defaults del backend). No devuelve detalle.
 */
export const manualSync = (body?: Record<string, unknown>) =>
  request<AthActionResult>("ath", "/manual-sync", { method: "POST", body: body ?? {} });

/**
 * POST /api/ath/manual-sync-mapped — envía UNIDADES + RESULTADOS a GRS y
 * devuelve el detalle mapeado (totalUnits, units[]).
 */
export const manualSyncMapped = (body?: Record<string, unknown>) =>
  request<AthActionResult>("ath", "/manual-sync-mapped", { method: "POST", body: body ?? {} });

// ---- Setup en GRS --------------------------------------------------------

/** POST /api/ath/setup — setup completo de competiciones en GRS. */
export const setup = () => request<AthActionResult>("ath", "/setup", { method: "POST" });

/** POST /api/ath/setup-categories. */
export const setupCategories = () =>
  request<AthActionResult>("ath", "/setup-categories", { method: "POST" });

/** POST /api/ath/setup-sport-events — crea los sport-events del evento en el catálogo GRS. */
export const setupSportEvents = () =>
  request<AthActionResult>("ath", "/setup-sport-events", { method: "POST" });

/** POST /api/ath/setup-phases. */
export const setupPhases = () =>
  request<AthActionResult>("ath", "/setup-phases", { method: "POST" });

/** POST /api/ath/setup-units. */
export const setupUnits = () =>
  request<AthActionResult>("ath", "/setup-units", { method: "POST" });

// ---- Sincronización de entidades a GRS -----------------------------------

/** POST /api/ath/sync-organisations — clubes/UFs. */
export const syncOrganisations = () =>
  request<AthActionResult>("ath", "/sync-organisations", { method: "POST" });

/** POST /api/ath/sync-participants — atletas. */
export const syncParticipants = () =>
  request<AthActionResult>("ath", "/sync-participants", { method: "POST" });

/** POST /api/ath/sync-groups — equipos de relevo. */
export const syncGroups = () =>
  request<AthActionResult>("ath", "/sync-groups", { method: "POST" });

/** POST /api/ath/sync-medals — medallas (awards). */
export const syncMedals = () =>
  request<AthActionResult>("ath", "/sync-medals", { method: "POST" });

// ---- Lectura (CBAT) ------------------------------------------------------

interface AthDataEnvelope {
  message?: string;
  data: unknown;
}

/** GET /api/ath/event-categories — categorías del evento (CBAT). */
export const getEventCategories = () =>
  request<AthDataEnvelope>("ath", "/event-categories").then((r) => r.data);

export interface ScheduleFilters {
  date?: string;
  time?: string;
  testId?: number;
  stageId?: number;
}

/** Fila de horario tal como la devuelve el CBAT. */
export interface AthSchedule {
  TestId: number;
  TestName: string;
  TestType: string;
  Date: string;
  Time: string;
  PhaseId: number;
  PhaseName: string;
  Gender: string;
  StageId: number;
  CategoryId: number;
  HasInitialList: string; // "S" | "N"
  HasResult: string; // "S" | "N"
  Andamento: string; // "S" | "N" (en curso)
  /** Rol respecto a la unit en GRS (lo anota el backend). own = genera unit propia. */
  unitRole?: "own" | "partial" | "merged" | "none";
}

/** GET /api/ath/competition-schedules — horarios (filtros opcionales). */
export const getCompetitionSchedules = (filters: ScheduleFilters = {}) => {
  const qs = new URLSearchParams();
  if (filters.date) qs.set("date", filters.date);
  if (filters.time) qs.set("time", filters.time);
  if (filters.testId != null) qs.set("testId", String(filters.testId));
  if (filters.stageId != null) qs.set("stageId", String(filters.stageId));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return request<AthDataEnvelope>("ath", `/competition-schedules${suffix}`).then(
    (r) => (r.data ?? []) as AthSchedule[],
  );
};

export interface AthAttempt {
  index: number;
  nome: string | null;
  marca: string | null;
  vento: string | null;
}

/** Competidor en una start list (datos del CBAT). */
export interface AthStartListEntry {
  Time: string;
  TestId: number;
  TestName: string;
  PhaseName: string;
  AtletaNumber: number;
  Bib: number;
  Serie: number;
  Gender: string;
  Lane: number;
  RkPo: number;
  FinalResult: string;
  BestMark: string;
  /** Tiempo de reacción de salida (tacos), ej. "0.199". Solo pruebas de pista. */
  ReactionTime?: string | number;
  /** Puntos (combinadas: decatlón/heptatlón/…). Llega como number desde CBAT. */
  Points?: string | number;
  CompetitorName: string;
  Club: string;
  CodeClub: string;
  Status: string;
  /** Tipo de prueba: "Reveza" (relevo), "Arremesso", "Vertical", "Pista"… */
  Type?: string;
  attempts?: AthAttempt[];
}

/**
 * GET /api/ath/start-list-details — start list de una prueba.
 * prova = TestId, hora = Time, etapa = StageId (vienen del horario).
 */
export const getStartListDetails = (prova: number, hora: string, etapa: number) => {
  const qs = new URLSearchParams({ prova: String(prova), hora, etapa: String(etapa) });
  return request<AthDataEnvelope>("ath", `/start-list-details?${qs.toString()}`).then(
    (r) => (r.data ?? []) as AthStartListEntry[],
  );
};
