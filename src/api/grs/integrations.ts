import { request } from "@/lib/http";

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
  updatedAt: string;
}

export const listIntegrations = () =>
  request<Integration[]>("grs", "/integrations");

export const getIntegration = (provider: string) =>
  request<Integration>("grs", `/integrations/${provider}`);

export const setIntegrationEnabled = (provider: string, enabled: boolean) =>
  request<Integration>("grs", `/integrations/${provider}/enabled`, {
    method: "PUT",
    body: JSON.stringify({ enabled }),
  });

export const updateIntegrationExternalIds = (
  provider: string,
  externalIds: Record<string, unknown>,
) =>
  request<Integration>("grs", `/integrations/${provider}/external-ids`, {
    method: "PUT",
    body: JSON.stringify({ externalIds }),
  });
