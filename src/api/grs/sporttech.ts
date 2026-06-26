import { request } from "@/lib/http";

/**
 * Cliente de la integración de gimnasia (SportTech.io / OVS). Sin webhook: el pull
 * va por `POST /sporttech/sync/:eventId[/etapa]` (disparo manual) y la vista
 * read-only de la competición por `GET /sporttech/inspect/:eventId`.
 */

/** Etapas del sync (orden de dependencia). */
export type SportTechStage =
  | "structure"
  | "participants"
  | "groups"
  | "results";

export const SPORTTECH_STAGES: { stage: SportTechStage; label: string }[] = [
  { stage: "structure", label: "Estructura" },
  { stage: "participants", label: "Participantes" },
  { stage: "groups", label: "Grupos" },
  { stage: "results", label: "Resultados" },
];

/** Resumen del pull completo de un evento. */
export interface SportTechEventSyncSummary {
  eventId: string;
  competitions: number;
  athletes: number;
  units: number;
  groups: number;
  results: number;
  awards: number;
  startLists?: number;
  sportEventsCreated: number;
  errors: string[];
}

/** Resumen de una etapa individual (contadores parciales). */
export interface SportTechStageSummary {
  eventId: string;
  stage: string;
  athletes?: number;
  competitions?: number;
  units?: number;
  groups?: number;
  results?: number;
  awards?: number;
  sportEventsCreated?: number;
  errors: string[];
}

/** Pull completo (estructura → participantes → grupos → resultados). */
export const sportTechSyncEvent = (eventId: string) =>
  request<SportTechEventSyncSummary>(
    "grs",
    `/sporttech/sync/${encodeURIComponent(eventId)}`,
    { method: "POST" },
  );

/** Dispara una etapa individual del sync. */
export const sportTechSyncStage = (eventId: string, stage: SportTechStage) =>
  request<SportTechStageSummary>(
    "grs",
    `/sporttech/sync/${encodeURIComponent(eventId)}/${stage}`,
    { method: "POST" },
  );

/**
 * Ingesta por CSV (export del proveedor) — vía alternativa al pull OVS. Sube el
 * archivo (multipart `file`) y corre el pipeline completo. La disciplina (GAR/GRY)
 * sale del propio CSV; `eventId` es solo traza. Idempotente.
 */
export const sportTechSyncCsv = (eventId: string, file: File) => {
  const form = new FormData();
  form.append("file", file);
  return request<SportTechEventSyncSummary>(
    "grs",
    `/sporttech/sync/${encodeURIComponent(eventId)}/csv`,
    { method: "POST", body: form },
  );
};

// ─── Inspect (vista read-only de la competición del proveedor) ────────────────

/** Una unit que la estructura produciría (preview, sin escribir en GRS). */
export interface SportTechInspectUnit {
  phaseCode: string;
  phaseName: string;
  sportEventCode: string;
  eventName: string;
  unitCode: string;
  hasMedals: boolean;
  /** El sport-event ya existe en el catálogo (si no, el sync lo auto-crea). */
  known: boolean;
}

/** Una competición del evento del proveedor, resumida con sus units. */
export interface SportTechInspectCompetition {
  id: string;
  title: string;
  gender: string;
  category: string;
  categoryName?: string;
  isTeam: boolean;
  units: SportTechInspectUnit[];
}

/** Vista read-only de un evento del OVS: qué hay y qué se crearía al sincronizar. */
export interface SportTechEventInspection {
  eventId: string;
  discipline?: string;
  title?: string;
  startDate?: string;
  endDate?: string;
  counts: {
    competitions: number;
    stages: number;
    units: number;
    athletes: number;
    unmapped: number;
  };
  competitions: SportTechInspectCompetition[];
  errors: string[];
}

/** Inspecciona el evento (read-only): estructura del proveedor + chequeo de catálogo. */
export const sportTechInspectEvent = (eventId: string) =>
  request<SportTechEventInspection>(
    "grs",
    `/sporttech/inspect/${encodeURIComponent(eventId)}`,
  );

// ─── Passthrough crudo (lo que el proveedor manda, sin interpretación) ────────

/** Recursos crudos del proveedor disponibles en la pestaña "Proveedor". */
export type SportTechRawResource = "structure" | "athletes";

export const SPORTTECH_RAW_RESOURCES: {
  resource: SportTechRawResource;
  label: string;
}[] = [
  { resource: "structure", label: "Estructura" },
  { resource: "athletes", label: "Atletas" },
];

/** JSON crudo de un recurso del proveedor (estructura = objeto, atletas = mapa id→atleta). */
export const sportTechRawResource = (
  eventId: string,
  resource: SportTechRawResource,
) =>
  request<Record<string, unknown>>(
    "grs",
    `/sporttech/inspect/${encodeURIComponent(eventId)}/raw/${resource}`,
  );
