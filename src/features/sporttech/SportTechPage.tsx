import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Save } from "lucide-react";

import {
  getIntegration,
  updateIntegrationExternalIds,
} from "@/api/grs/integrations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { SportTechSyncSteps } from "./SportTechSyncSteps";

export function SportTechPage({
  provider,
  title,
}: {
  provider: string;
  title: string;
}) {
  const [eventId, setEventId] = useState("");
  const id = eventId.trim();

  // Esta disciplina tiene UN solo evento del OVS; se guarda en su integración.
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

  function saveEventId(value: string) {
    if (!value || value === savedEventId) return;
    updateIntegrationExternalIds(provider, { eventId: value })
      .then(() => integration.refetch())
      .catch(() => {}); // sin registro de integración → no bloquea
  }

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <header className="shrink-0">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-(--color-muted-foreground)">
          Operación de la integración con SportTech.io (OVS). Pegá el UUID del
          evento del OVS de esta disciplina y dispará el pull por etapa.
        </p>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-auto">
        <div className="space-y-1">
          <div className="flex max-w-xl gap-2">
            <Input
              placeholder="eventId de SportTech (UUID del OVS)"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
            />
            <Button
              size="sm"
              variant="secondary"
              disabled={!id || id === savedEventId}
              onClick={() => saveEventId(id)}
            >
              <Save className="size-4" />
              Guardar
            </Button>
          </div>
          <p className="text-xs text-(--color-muted-foreground)">
            {savedEventId ? (
              <>
                Evento guardado: <span className="font-mono">{savedEventId}</span>
              </>
            ) : (
              "Aún no hay evento guardado para esta disciplina."
            )}
          </p>
        </div>

        <SportTechSyncSteps eventId={id} />
      </div>
    </div>
  );
}
