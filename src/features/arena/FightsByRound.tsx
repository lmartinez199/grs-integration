import { useId, useState } from "react";
import { ChevronRight, Search } from "lucide-react";

import type { ArenaFight } from "@/api/grs/arena";
import {
  fightSearchText,
  matchesFightStatus,
  type FightStatusFilter,
} from "@/lib/domain/arena-fight";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FightCard } from "./FightCard";

const FILTERS: { key: FightStatusFilter; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "done", label: "Finalizadas" },
  { key: "pending", label: "Pendientes" },
];

export function FightsByRound({ fights }: { fights: ArenaFight[] }) {
  const [filter, setFilter] = useState<FightStatusFilter>("all");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const visible = fights
    .filter((f) => matchesFightStatus(f, filter))
    .filter((f) => (q ? fightSearchText(f).includes(q) : true));

  // Agrupar por ronda preservando el orden de llegada (bracket).
  const rounds: { name: string; items: ArenaFight[] }[] = [];
  for (const f of visible) {
    const name = f.roundFriendlyName || "Sin ronda";
    let r = rounds.find((x) => x.name === name);
    if (!r) {
      r = { name, items: [] };
      rounds.push(r);
    }
    r.items.push(f);
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-(--color-muted-foreground)"
          aria-hidden
        />
        <Input
          className="pl-8"
          placeholder="Buscar por ID, atleta o equipo…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="flex gap-1.5">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? "default" : "outline"}
            className="h-7 px-2.5"
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {rounds.length === 0 ? (
        <p className="text-sm text-(--color-muted-foreground)">
          {q ? "Sin coincidencias para la búsqueda." : "No hay peleas para este filtro."}
        </p>
      ) : (
        <RoundGroups rounds={rounds} />
      )}
    </div>
  );
}

function RoundGroups({ rounds }: { rounds: { name: string; items: ArenaFight[] }[] }) {
  const baseId = useId();
  // Estado invertido: guarda las rondas que el usuario CERRÓ. Así las rondas
  // nacen abiertas por defecto (suelen ser pocas) sin necesidad de un efecto.
  const [closed, setClosed] = useState<Set<string>>(new Set());

  const toggle = (name: string) =>
    setClosed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  return (
    <div className="space-y-2">
      {rounds.map((round, idx) => {
        const isOpen = !closed.has(round.name);
        const done = round.items.filter((f) => f.isCompleted).length;
        const panelId = `${baseId}-${idx}`;
        return (
          <div key={round.name} className="rounded-md border">
            <button
              onClick={() => toggle(round.name)}
              aria-expanded={isOpen}
              aria-controls={panelId}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-(--color-muted)/50"
            >
              <span className="flex items-center gap-2">
                <ChevronRight
                  className={cn(
                    "size-4 text-(--color-muted-foreground) transition-transform",
                    isOpen && "rotate-90",
                  )}
                  aria-hidden
                />
                <span className="text-sm font-semibold text-(--color-primary)">
                  {round.name}
                </span>
              </span>
              <Badge variant="secondary">
                {done}/{round.items.length}
              </Badge>
            </button>
            {isOpen && (
              <div id={panelId} className="space-y-2 p-3 pt-0">
                {round.items.map((f, i) => (
                  <FightCard key={f.id ?? `${round.name}-${i}`} fight={f} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
