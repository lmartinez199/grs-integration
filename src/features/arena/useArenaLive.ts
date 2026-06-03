import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { settingsSnapshot } from "@/stores/settings.store";

/**
 * Suscripción en vivo a las actualizaciones de ARENA (SSE) del GRS.
 * Al recibir un evento (pelea/categoría actualizada) invalida las queries de
 * ARENA para refrescar sin polling. El stream es público y solo envía
 * notificaciones (sin datos sensibles); EventSource reconecta solo.
 */
export function useArenaLive(): void {
  const qc = useQueryClient();

  useEffect(() => {
    const base = settingsSnapshot().grsBaseUrl.replace(/\/+$/, "");
    const url = `${base}/arena/sync/stream`;

    let es: EventSource | null = null;
    try {
      es = new EventSource(url);
      es.onmessage = (e) => {
        // Ignorar el heartbeat; cualquier otro evento dispara refresco.
        try {
          if (JSON.parse(e.data)?.type === "ping") return;
        } catch {
          /* payload no-JSON: refrescar igual */
        }
        qc.invalidateQueries({ queryKey: ["arena"] });
      };
      // EventSource reintenta la conexión automáticamente ante errores.
    } catch {
      /* EventSource no disponible o URL inválida: se queda en polling/manual */
    }

    return () => es?.close();
  }, [qc]);
}
