import { request } from "@/lib/http";

/** Un evento configurado del proveedor (id + etiqueta opcional). 1 por año; CRUD. */
export interface IntegrationEventRef {
  id: string;
  label?: string;
}

/** Estado de una corrida: ok | error | skipped (no-op intencional, p.ej. una vía que no aplica al evento). */
export type IntegrationRunStatus = "ok" | "error" | "skipped";

/** Una corrida de sync de UNA etapa (entrada del historial acotado). */
export interface IntegrationRun {
  at: string;
  stage: string;
  status: IntegrationRunStatus;
  counts?: Record<string, number>;
  errorCount: number;
  errors?: string[];
}

/** Config operativa NO-secreta de una integración (espejo de IntegrationResponseDto). */
export interface Integration {
  id: string;
  provider: string;
  enabled: boolean;
  /** On/off del auto-sync del runner (Iniciar/Detener desde el dashboard). */
  autoSyncEnabled: boolean;
  externalIds: Record<string, unknown>;
  pollIntervalMs: number;
  webhookReceiverUrl?: string;
  lastSyncAt?: string;
  lastSyncStatus?: IntegrationRunStatus;
  lastSyncError?: string;
  /** Historial acotado de las últimas corridas (más reciente al final). */
  runs?: IntegrationRun[];
  updatedAt: string;
}

/**
 * Evento activo de una integración (el UUID que usan el dashboard y el runner).
 * Los IDs se guardan como `{ events: [{id,label}], activeId }` — no como `eventId`.
 */
export function readActiveEvent(
  externalIds: Record<string, unknown>,
): IntegrationEventRef | undefined {
  const events = (externalIds.events as IntegrationEventRef[] | undefined) ?? [];
  const activeId = String(externalIds.activeId ?? "");
  return events.find((e) => e.id === activeId) ?? (activeId ? { id: activeId } : undefined);
}

/**
 * Competición de EQUIPOS activa (judo: zempo separa individual y equipos en 2
 * códigos por edición — `{ teamEvents, activeTeamId }` junto a `{ events, activeId }`).
 */
export function readActiveTeamEvent(
  externalIds: Record<string, unknown>,
): IntegrationEventRef | undefined {
  const events = (externalIds.teamEvents as IntegrationEventRef[] | undefined) ?? [];
  const activeId = String(externalIds.activeTeamId ?? "");
  return events.find((e) => e.id === activeId) ?? (activeId ? { id: activeId } : undefined);
}

export const listIntegrations = () =>
  request<Integration[]>("grs", "/integrations");

export const getIntegration = (provider: string) =>
  request<Integration>("grs", `/integrations/${provider}`);

export const setIntegrationEnabled = (provider: string, enabled: boolean) =>
  request<Integration>("grs", `/integrations/${provider}/enabled`, {
    method: "PUT",
    body: { enabled },
  });

export const updateIntegrationExternalIds = (
  provider: string,
  externalIds: Record<string, unknown>,
) =>
  request<Integration>("grs", `/integrations/${provider}/external-ids`, {
    method: "PUT",
    body: { externalIds },
  });

/** Iniciar/Detener el auto-sync del runner (no toca `enabled`, el kill-switch). */
export const setIntegrationAutoSync = (provider: string, enabled: boolean) =>
  request<Integration>("grs", `/integrations/${provider}/auto-sync`, {
    method: "PUT",
    body: { enabled },
  });

/** Intervalo de auto-sync del runner en ms (0 = default del runner, 5 min). */
export const setIntegrationPollInterval = (
  provider: string,
  pollIntervalMs: number,
) =>
  request<Integration>("grs", `/integrations/${provider}/poll-interval`, {
    method: "PUT",
    body: { pollIntervalMs },
  });
