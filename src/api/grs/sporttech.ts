import { request } from "@/lib/http";

/**
 * Cliente de la integración de gimnasia (SportTech.io / OVS). Solo disparo manual
 * del pull por etapas — SportTech NO tiene webhook ni inspect (a diferencia de
 * SWM): todo va por `POST /sporttech/sync/:eventId[/etapa]`.
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
