import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { getZempoPreview } from "@/api/grs/zempo-sync";
import {
  getIntegration,
  readActiveEvent,
  readActiveTeamEvent,
} from "@/api/grs/integrations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function JudCompeticionBar({
  codigo,
  setCodigo,
}: {
  codigo: string;
  setCodigo: (v: string) => void;
}) {
  const [debounced, setDebounced] = useState(codigo.trim());

  useEffect(() => {
    const t = setTimeout(() => setDebounced(codigo.trim()), 600);
    return () => clearTimeout(t);
  }, [codigo]);

  const preview = useQuery({
    queryKey: ["zempo", "preview", debounced],
    queryFn: () => getZempoPreview(debounced),
    enabled: debounced.length >= 3,
    retry: false,
  });

  // Códigos configurados en Integraciones (zempo separa individual y equipos):
  // un click en el chip evita re-tipear el código en cada lugar.
  const integration = useQuery({
    queryKey: ["integrations", "judo"],
    queryFn: () => getIntegration("judo"),
    retry: false,
  });
  const configured = [
    { label: "Individual", ref: readActiveEvent(integration.data?.externalIds ?? {}) },
    { label: "Equipos", ref: readActiveTeamEvent(integration.data?.externalIds ?? {}) },
  ].filter((o): o is { label: string; ref: { id: string; label?: string } } => !!o.ref?.id);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-(--color-border) bg-(--color-card) p-3 sm:flex-row sm:items-center">
      <label className="flex items-center gap-2">
        <span className="text-sm font-medium">Competición</span>
        <Input
          className="max-w-48"
          placeholder="código (ej. jj25)"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
        />
      </label>
      {configured.length > 0 && (
        <div className="flex items-center gap-1.5">
          {configured.map((o) => (
            <Button
              key={o.ref.id}
              size="sm"
              variant={codigo.trim() === o.ref.id ? "default" : "outline"}
              onClick={() => setCodigo(o.ref.id)}
            >
              {o.label} · {o.ref.id}
            </Button>
          ))}
        </div>
      )}
      <div className="min-h-5 text-sm sm:ml-2">
        {debounced.length < 3 ? null : preview.isLoading ? (
          <span className="flex items-center gap-1.5 text-(--color-muted-foreground)">
            <Loader2 className="size-3.5 animate-spin" aria-hidden /> Validando…
          </span>
        ) : preview.isError ? (
          <span className="text-(--color-destructive)">No se pudo validar el código.</span>
        ) : preview.data && preview.data.competicaoNome ? (
          <span>
            <span className="font-semibold">{preview.data.competicaoNome}</span>
            <span className="text-(--color-muted-foreground)">
              {" · "}
              {preview.data.totalCategorias} categorías ({preview.data.sorteadas} sorteadas) ·{" "}
              {preview.data.totalInscritos} inscritos
            </span>
          </span>
        ) : preview.data ? (
          <span className="text-(--color-warning)">
            Código sin categorías o no encontrado en Zempo.
          </span>
        ) : null}
      </div>
    </div>
  );
}
