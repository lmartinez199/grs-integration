import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PersonStanding, Play, RefreshCw, Square } from "lucide-react";

import {
  getIntegration,
  readActiveEvent,
  setIntegrationAutoSync,
} from "@/api/grs/integrations";
import { IntegrationInfoRows } from "@/components/integration/integration-info-rows";
import { sportTechSyncEvent } from "@/api/grs/sporttech";
import { useMutationWithToast } from "@/hooks/useMutationWithToast";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { DefinitionRow } from "@/components/ui/definition-row";
import { Input } from "@/components/ui/input";
import { SyncCard } from "@/components/ui/sync-card";

/**
 * Card de una integración de gimnasia (SportTech) — una por disciplina
 * (`sporttech-gar`/`sporttech-gry`). Sin webhook: dispara el pull completo del
 * evento y muestra el resumen. La operación fina (por etapa) vive en su página.
 */
export function SportTechSyncCard({
  provider,
  title,
}: {
  provider: string;
  title: string;
}) {
  const [eventId, setEventId] = useState("");

  // Evento guardado de esta disciplina (1 por integración); pre-rellena el input.
  const integration = useQuery({
    queryKey: ["integrations", provider],
    queryFn: () => getIntegration(provider),
    retry: false,
  });
  const savedEventId = readActiveEvent(integration.data?.externalIds ?? {})?.id ?? "";

  useEffect(() => {
    if (savedEventId && !eventId) setEventId(savedEventId);
  }, [savedEventId]);

  const sync = useMutationWithToast({
    mutationFn: (id: string) => sportTechSyncEvent(id),
    successMsg: "Sync de gimnasia (SportTech) disparada",
  });

  // Auto-sync del runner (resultados cada pollIntervalMs, default 5 min).
  const autoOn =
    !!integration.data?.enabled && !!integration.data?.autoSyncEnabled;
  const setAuto = useMutationWithToast({
    mutationFn: (enabled: boolean) => setIntegrationAutoSync(provider, enabled),
    successMsg: `${title} — auto-sync actualizado`,
    invalidateKeys: [["integrations", provider], ["integrations"]],
  });

  const summary = sync.data;
  const errorCount = summary?.errors.length ?? 0;

  return (
    <SyncCard
      title={title}
      icon={<PersonStanding className="size-4 text-(--color-primary)" />}
      status={
        <StatusBadge loading={sync.isPending} error={sync.isError} errorLabel="error">
          {summary && errorCount > 0 ? (
            <Badge variant="warning">{errorCount} con error</Badge>
          ) : autoOn ? (
            <Badge variant="success">auto-sync activa</Badge>
          ) : summary ? (
            <Badge variant="success">sincronizado</Badge>
          ) : (
            <Badge variant="secondary">manual</Badge>
          )}
        </StatusBadge>
      }
    >
      <IntegrationInfoRows provider={provider} />

      {summary && (
        <dl className="space-y-1 text-sm">
          <DefinitionRow label="Units" value={String(summary.units)} />
          <DefinitionRow
            label="Participantes"
            value={String(summary.athletes)}
          />
          <DefinitionRow label="Grupos" value={String(summary.groups)} />
          <DefinitionRow
            label="Resultados · medallas"
            value={`${summary.results} · ${summary.awards}`}
          />
        </dl>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (eventId.trim()) sync.mutate(eventId.trim());
        }}
      >
        <Input
          placeholder="eventId de SportTech (UUID)"
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
        />
        <Button type="submit" size="sm" icon={<RefreshCw />} loading={sync.isPending}>
          Sincronizar
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          icon={<Play />}
          onClick={() => setAuto.mutate(true)}
          disabled={autoOn || setAuto.isPending}
        >
          Iniciar auto-sync
        </Button>
        <Button
          size="sm"
          variant="outline"
          icon={<Square />}
          onClick={() => setAuto.mutate(false)}
          disabled={!autoOn || setAuto.isPending}
        >
          Detener
        </Button>
      </div>
    </SyncCard>
  );
}
