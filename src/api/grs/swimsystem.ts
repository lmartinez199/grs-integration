import { request } from "@/lib/http";

/**
 * Observabilidad de la integración SwimSystem (natación) vía GRS — servicio
 * "grs", viaja con el JWT del operador. Los endpoints `/swimsystem/inspect/*`
 * son `@InternalService`: el guard deja pasar cualquier Bearer con forma de JWT,
 * así que NO se requiere API key desde la app.
 *
 * Espejo de `SwimSystemInspectController` (grs-backend-v2). Esta es la
 * herramienta de OPERACIÓN (no de resultados): saber si el webhook está vivo,
 * ver qué manda el proveedor y cómo viene estructurado, y disparar el sync.
 */

const enc = encodeURIComponent;

/** Flags de configuración de la integración (sin valores de secretos). */
export interface SwmConfigStatus {
  apiBase: string;
  apiKeyConfigured: boolean;
  webhookSecretConfigured: boolean;
  writeEnabled: boolean;
  writeCpfEnabled: boolean;
  pollIntervalMs: number;
  pollMeetIds: string[];
  isProduction: boolean;
}

/** Salud: conectividad al proveedor + estado de config. */
export interface SwmHealth {
  connected: boolean;
  error?: string;
  probedMeetId?: string;
  config: SwmConfigStatus;
}

/** Una entrega de webhook (job retenido en la cola). */
export interface SwmWebhookDelivery {
  jobId: string;
  event?: string;
  meetId?: string;
  eventId?: string;
  state: "completed" | "failed";
  timestamp: number;
  attemptsMade: number;
  failedReason?: string;
}

/** Log de webhook: conteos de la cola + entregas recientes. */
export interface SwmWebhookLog {
  counts: Record<string, number>;
  recent: SwmWebhookDelivery[];
}

/** Validación de un meet: conteos por recurso + chequeo del mapeo a RSC. */
export interface SwmValidation {
  meetId: string;
  counts: {
    events: number;
    clubs: number;
    athletes: number;
    results: number;
    scoring: number;
    medals: number;
  };
  rsc: {
    ok: number;
    unmapped: number;
    rows: {
      eventId?: string;
      eventCode?: string;
      rsc?: string;
      known: boolean;
      round?: string;
      gender?: string;
      error?: string;
    }[];
  };
}

/** Resumen de un syncMeet manual. */
export interface SwmSyncSummary {
  meetId: string;
  clubs: number;
  athletes: number;
  events: number;
  results: number;
}

/** Recursos crudos que expone el proveedor (passthrough). */
export type SwmResource =
  | "events"
  | "results"
  | "clubs"
  | "athletes"
  | "scoring"
  | "medals";

export const SWM_RESOURCES: SwmResource[] = [
  "events",
  "results",
  "clubs",
  "athletes",
  "scoring",
  "medals",
];

/** GET /swimsystem/inspect/health — conectividad + flags de config. */
export const swmHealth = () =>
  request<SwmHealth>("grs", "/swimsystem/inspect/health");

/** GET /swimsystem/inspect/webhooks — log de entregas + conteos de la cola. */
export const swmWebhookLog = (limit?: number) => {
  const qs = limit ? `?limit=${limit}` : "";
  return request<SwmWebhookLog>("grs", `/swimsystem/inspect/webhooks${qs}`);
};

/** GET /swimsystem/inspect/validate/:meetId — conteos + mapeo provider→RSC. */
export const swmValidate = (meetId: string) =>
  request<SwmValidation>("grs", `/swimsystem/inspect/validate/${enc(meetId)}`);

/** GET /swimsystem/inspect/:meetId/:resource — JSON crudo del proveedor. */
export const swmInspect = (meetId: string, resource: SwmResource) =>
  request<unknown>("grs", `/swimsystem/inspect/${enc(meetId)}/${resource}`);

/** POST /swimsystem/sync/:meetId — dispara un pull completo del meet. */
export const swmSyncMeet = (meetId: string) =>
  request<SwmSyncSummary>("grs", `/swimsystem/sync/${enc(meetId)}`, {
    method: "POST",
  });

/**
 * Etapas del sync (espejo de los endpoints granulares de grs-backend, patrón
 * ATH). Tienen orden de dependencia: structure → participants → start-lists →
 * results. Cada etapa es idempotente y re-asegura la estructura que necesita.
 */
export type SwmStage = "structure" | "participants" | "start-lists" | "results";

export const SWM_STAGES: { stage: SwmStage; label: string }[] = [
  { stage: "structure", label: "1 · Estructura" },
  { stage: "participants", label: "2 · Participantes" },
  { stage: "start-lists", label: "3 · Start-lists" },
  { stage: "results", label: "4 · Resultados" },
];

/** Resumen de una etapa individual del sync (contadores parciales). */
export interface SwmStageSummary {
  meetId: string;
  stage: SwmStage;
  clubs?: number;
  athletes?: number;
  events?: number;
  results?: number;
}

/** POST /swimsystem/sync/:meetId/:stage — dispara una etapa concreta. */
export const swmSyncStage = (meetId: string, stage: SwmStage) =>
  request<SwmStageSummary>("grs", `/swimsystem/sync/${enc(meetId)}/${stage}`, {
    method: "POST",
  });
