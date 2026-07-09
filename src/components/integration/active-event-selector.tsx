import { type IntegrationEventRef } from "@/api/grs/integrations";
import { Select } from "@/components/ui/select";

/** Etiqueta legible de un evento (etiqueta + UUID corto, o solo el UUID). */
function eventLabel(e: IntegrationEventRef): string {
  if (!e.id) return e.label || "(sin id)";
  const short = `${e.id.slice(0, 8)}…`;
  return e.label ? `${e.label} — ${short}` : e.id;
}

/**
 * Selector del evento activo para las páginas de operación (gimnasia/natación):
 * lee la lista configurada en Integraciones y deja cambiar cuál es el activo. El
 * CRUD (agregar/borrar/editar) vive en la página Integraciones.
 */
export function ActiveEventSelector({
  events,
  activeId,
  onSetActive,
  noun = "Evento",
}: {
  events: IntegrationEventRef[];
  activeId: string;
  onSetActive: (id: string) => void;
  noun?: string;
}) {
  const usable = events.filter((e) => e.id);
  if (usable.length === 0) {
    return (
      <p className="text-sm text-(--color-muted-foreground)">
        No hay {noun.toLowerCase()}s configurados. Agregalos en{" "}
        <strong>Integraciones</strong>.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-(--color-muted-foreground)">
        {noun} activo:
      </span>
      <Select value={activeId} onChange={(e) => onSetActive(e.target.value)}>
        {usable.map((e) => (
          <option key={e.id} value={e.id}>
            {eventLabel(e)}
          </option>
        ))}
      </Select>
    </div>
  );
}
