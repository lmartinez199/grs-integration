import { useQuery } from "@tanstack/react-query";

import { getIntegration, readActiveEvent } from "@/api/grs/integrations";
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
  const pollMs = data.pollIntervalMs ?? 0;

  return (
    <dl className="space-y-1 text-sm">
      {active && <DefinitionRow label={eventLabel} value={active.label || active.id} />}
      <DefinitionRow
        label="Auto-sync"
        value={pollMs > 0 ? `cada ${Math.round(pollMs / 1000)} s` : "manual"}
      />
    </dl>
  );
}
