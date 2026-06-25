import { request } from "@/lib/http";

/** Un evento configurado del proveedor (id + etiqueta opcional). 1 por año; CRUD. */
export interface IntegrationEventRef {
  id: string;
  label?: string;
}

/** Una corrida de sync de UNA etapa (entrada del historial acotado). */
export interface IntegrationRun {
  at: string;
  stage: string;
  status: "ok" | "error";
  counts?: Record<string, number>;
  errorCount: number;
  errors?: string[];
}

/** Config operativa NO-secreta de una integración (espejo de IntegrationResponseDto). */
export interface Integration {
  id: string;
  provider: string;
  enabled: boolean;
  externalIds: Record<string, unknown>;
  pollIntervalMs: number;
  webhookReceiverUrl?: string;
  lastSyncAt?: string;
  lastSyncStatus?: "ok" | "error";
  lastSyncError?: string;
  /** Historial acotado de las últimas corridas (más reciente al final). */
  runs?: IntegrationRun[];
  updatedAt: string;
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

/** Intervalo de auto-sync del runner en ms (0 = sin auto-sync). */
export const setIntegrationPollInterval = (
  provider: string,
  pollIntervalMs: number,
) =>
  request<Integration>("grs", `/integrations/${provider}/poll-interval`, {
    method: "PUT",
    body: { pollIntervalMs },
  });
