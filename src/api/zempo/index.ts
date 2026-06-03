import { request } from "@/lib/http";

/**
 * jud-integration-zempo — orquestador de sincronización de judo.
 * Endpoints bajo el prefijo /zempo. (Migrará al monolito en el futuro;
 * aislado aquí para que ese cambio sólo toque este módulo.)
 */

export interface ZempoSchedule {
  codigo: string;
  [key: string]: unknown;
}

/** GET /zempo/schedule — competiciones con sync activa. */
export const listSchedules = () => request<ZempoSchedule[]>("zempo", "/schedule");

/** POST /zempo/schedule/:codigo — activa sync periódica (cada 15s). */
export const startSchedule = (codigo: string) =>
  request<unknown>("zempo", `/schedule/${encodeURIComponent(codigo)}`, { method: "POST" });

/** DELETE /zempo/schedule/:codigo — detiene la sync. */
export const stopSchedule = (codigo: string) =>
  request<unknown>("zempo", `/schedule/${encodeURIComponent(codigo)}`, { method: "DELETE" });

/** POST /zempo/sync/luta/:codigo/:lutaId — sincroniza una lucha puntual. */
export const syncLuta = (codigo: string, lutaId: string) =>
  request<unknown>(
    "zempo",
    `/sync/luta/${encodeURIComponent(codigo)}/${encodeURIComponent(lutaId)}`,
    { method: "POST" },
  );
