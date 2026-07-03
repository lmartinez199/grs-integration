import { useQuery } from "@tanstack/react-query";

import {
  getIntegration,
  readActiveEvent,
  readActiveTeamEvent,
} from "@/api/grs/integrations";
import { DefinitionRow } from "@/components/ui/definition-row";

/**
 * Filas de config del backend para una integración en el dashboard: evento
 * activo (si el proveedor guarda `events`/`activeId`) e intervalo de auto-sync.
 * Consulta la misma queryKey que el resto — react-query deduplica.
 */
export function IntegrationInfoRows({
  provider,
  eventLabel = "Evento activo",
}: {
  provider: string;
  eventLabel?: string;
}) {
  const { data } = useQuery({
    queryKey: ["integrations", provider],
    queryFn: () => getIntegration(provider),
    retry: false,
  });
  if (!data) return null;

  const active = readActiveEvent(data.externalIds);
  // Solo judo la trae: zempo separa individual y equipos en 2 códigos.
  const activeTeam = readActiveTeamEvent(data.externalIds);
  const pollMs = data.pollIntervalMs ?? 0;
  // Providers del runner: activo = flag Iniciar/Detener. Arena (cron propio): poll>0.
  const runnerManaged = ["sporttech-gar", "sporttech-gry", "swimsystem"].includes(provider);
  const autoOn = runnerManaged ? data.enabled && !!data.autoSyncEnabled : pollMs > 0;
  const seconds = Math.round((pollMs > 0 ? pollMs : 300_000) / 1000);

  return (
    <dl className="space-y-1 text-sm">
      {active && <DefinitionRow label={eventLabel} value={active.label || active.id} />}
      {activeTeam && (
        <DefinitionRow
          label="Equipos (activa)"
          value={activeTeam.label || activeTeam.id}
        />
      )}
      <DefinitionRow
        label="Auto-sync"
        value={autoOn ? `cada ${seconds} s` : "manual"}
      />
    </dl>
  );
}
