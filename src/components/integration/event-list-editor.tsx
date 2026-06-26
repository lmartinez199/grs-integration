import { Plus, Trash2 } from "lucide-react";

import { type IntegrationEventRef } from "@/api/grs/integrations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * CRUD de los eventos configurados de una integración (uno por año): agregar,
 * editar (etiqueta + UUID), borrar y marcar el activo (el que usa el sync). El
 * estado vive en el padre (el editor de externalIds de la página Integraciones).
 */
export function EventListEditor({
  events,
  activeId,
  onChange,
  noun = "evento",
}: {
  events: IntegrationEventRef[];
  activeId: string;
  /** Devuelve la lista y el id activo nuevos (el padre persiste). */
  onChange: (events: IntegrationEventRef[], activeId: string) => void;
  /** Nombre singular para los textos ("evento" / "meet"). */
  noun?: string;
}) {
  function update(i: number, patch: Partial<IntegrationEventRef>) {
    onChange(
      events.map((e, j) => (j === i ? { ...e, ...patch } : e)),
      activeId,
    );
  }
  function remove(i: number) {
    const removingActive = events[i]?.id === activeId;
    const next = events.filter((_, j) => j !== i);
    onChange(next, removingActive ? (next[0]?.id ?? "") : activeId);
  }
  function add() {
    onChange([...events, { id: "", label: "" }], activeId);
  }

  return (
    <div className="space-y-2">
      {events.length === 0 ? (
        <p className="text-xs text-(--color-muted-foreground)">
          Sin {noun}s. Agregá el id del año.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {events.map((e, i) => (
            <li key={i} className="flex items-center gap-2">
              <Button
                size="sm"
                variant={activeId === e.id && e.id ? "default" : "outline"}
                disabled={!e.id}
                onClick={() => onChange(events, e.id)}
                className="w-20 shrink-0"
              >
                {activeId === e.id && e.id ? "Activo" : "Activar"}
              </Button>
              <Input
                value={e.label ?? ""}
                onChange={(ev) => update(i, { label: ev.target.value })}
                placeholder="Etiqueta (ej. 2026)"
                className="w-32"
              />
              <Input
                value={e.id}
                onChange={(ev) => update(i, { id: ev.target.value })}
                placeholder={`UUID del ${noun}`}
                className="flex-1 font-mono text-xs"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => remove(i)}
                aria-label={`Borrar ${noun}`}
                className="shrink-0"
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button size="sm" variant="outline" onClick={add}>
        <Plus className="size-4" />
        Agregar {noun}
      </Button>
    </div>
  );
}
