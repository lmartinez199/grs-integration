import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, PersonStanding, RefreshCw } from "lucide-react";

import { getIntegration } from "@/api/grs/integrations";
import { sportTechSyncEvent } from "@/api/grs/sporttech";
import { useMutationWithToast } from "@/hooks/useMutationWithToast";
import { Badge } from "@/components/ui/badge";
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
  const savedEventId =
    (integration.data?.externalIds?.eventId as string | undefined) ?? "";

  useEffect(() => {
    if (savedEventId && !eventId) setEventId(savedEventId);
  }, [savedEventId]);

  const sync = useMutationWithToast({
    mutationFn: (id: string) => sportTechSyncEvent(id),
    successMsg: "Sync de gimnasia (SportTech) disparada",
  });

  const summary = sync.data;
  const errorCount = summary?.errors.length ?? 0;

  return (
    <SyncCard
      title={title}
      icon={<PersonStanding className="size-4 text-(--color-primary)" />}
      status={
        sync.isPending ? (
          <Loader2 className="size-4 animate-spin text-(--color-muted-foreground)" />
        ) : sync.isError ? (
          <Badge variant="destructive">error</Badge>
        ) : summary ? (
          errorCount > 0 ? (
            <Badge variant="warning">{errorCount} con error</Badge>
          ) : (
            <Badge variant="success">sincronizado</Badge>
          )
        ) : (
          <Badge variant="secondary">manual</Badge>
        )
      }
    >
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
        <Button type="submit" size="sm" disabled={sync.isPending}>
          {sync.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Sincronizar
        </Button>
      </form>
    </SyncCard>
  );
}
