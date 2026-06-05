import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ChevronRight, RefreshCw, Radio, Search, Swords } from "lucide-react";

import {
  getCurrentEvent,
  getCategories,
  getCategoryFights,
  syncCategory,
  type ArenaCategory,
} from "@/api/grs/arena";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventSummary } from "./EventSummary";
import { FightsByRound } from "./FightsByRound";
import { WebhookConfig } from "./WebhookConfig";
import { ArenaLoopCard, ArenaSyncSteps } from "./ArenaSyncSection";
import { useArenaLive } from "./useArenaLive";

export function ArenaPage() {
  const [selected, setSelected] = useState<string | number | null>(null);
  const [catFilter, setCatFilter] = useState("");
  const qc = useQueryClient();

  // Suscripción en vivo (SSE): refresca al cambiar peleas/categorías en Arena.
  useArenaLive();

  const event = useQuery({ queryKey: ["arena", "current-event"], queryFn: getCurrentEvent });
  const categories = useQuery({ queryKey: ["arena", "categories"], queryFn: getCategories });
  const fights = useQuery({
    queryKey: ["arena", "fights", selected],
    queryFn: () => getCategoryFights(selected!),
    enabled: selected != null,
  });

  const selectedCategory = (categories.data ?? []).find((c) => c.id === selected);

  const categorySync = useMutation({
    mutationFn: (categoryId: string | number) => syncCategory(categoryId),
    onSuccess: () => {
      toast.success("Categoría sincronizada");
      qc.invalidateQueries({ queryKey: ["arena", "fights", selected] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">WRE (lucha)</h1>
        <p className="flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)]">
          <Radio className="size-3.5 text-[var(--color-success)]" aria-hidden />
          En vivo · se actualiza solo cuando Arena reporta cambios.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Evento actual</CardTitle>
        </CardHeader>
        <CardContent>
          {event.isLoading ? (
            <Loader2 className="size-5 animate-spin text-[var(--color-muted-foreground)]" aria-hidden />
          ) : event.isError || !event.data ? (
            <p role="alert" className="text-sm text-[var(--color-destructive)]">
              No se pudo cargar el evento. Verifica la conexión y el eventCode en Ajustes.
            </p>
          ) : (
            <EventSummary event={event.data} />
          )}
        </CardContent>
      </Card>

      <ArenaLoopCard />

      <WebhookConfig />

      <ArenaSyncSteps />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Categorías</CardTitle>
            {categories.data && (
              <Badge variant="secondary">{categories.data.length}</Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {categories.isLoading ? (
              <Loader2 className="size-5 animate-spin text-[var(--color-muted-foreground)]" aria-hidden />
            ) : categories.isError ? (
              <p role="alert" className="text-sm text-[var(--color-destructive)]">
                Error al cargar categorías.
              </p>
            ) : (
              <CategoryList
                categories={categories.data ?? []}
                selected={selected}
                onSelect={setSelected}
                filter={catFilter}
                onFilter={setCatFilter}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>
              Peleas
              {selectedCategory?.name ? (
                <span className="ml-2 text-sm font-normal text-[var(--color-muted-foreground)]">
                  {selectedCategory.name}
                </span>
              ) : null}
            </CardTitle>
            <div className="flex items-center gap-2">
              {fights.data && <Badge variant="secondary">{fights.data.length}</Badge>}
              {selected != null && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2"
                  onClick={() => categorySync.mutate(selected)}
                  disabled={categorySync.isPending}
                  title="Re-sincronizar esta categoría desde Arena"
                >
                  {categorySync.isPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <RefreshCw className="size-4" aria-hidden />
                  )}
                  Sincronizar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selected == null ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Selecciona una categoría para ver sus peleas.
              </p>
            ) : fights.isLoading ? (
              <Loader2 className="size-5 animate-spin text-[var(--color-muted-foreground)]" aria-hidden />
            ) : fights.isError ? (
              <p role="alert" className="text-sm text-[var(--color-destructive)]">
                Error al cargar peleas.
              </p>
            ) : fights.data && fights.data.length > 0 ? (
              <div className="max-h-[34rem] overflow-auto pr-1">
                <FightsByRound fights={fights.data} />
              </div>
            ) : (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Esta categoría no tiene peleas.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CategoryList({
  categories,
  selected,
  onSelect,
  filter,
  onFilter,
}: {
  categories: ArenaCategory[];
  selected: string | number | null;
  onSelect: (id: string | number) => void;
  filter: string;
  onFilter: (v: string) => void;
}) {
  const q = filter.trim().toLowerCase();
  const visible = q
    ? categories.filter((c) => (c.name ?? "").toLowerCase().includes(q))
    : categories;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted-foreground)]"
          aria-hidden
        />
        <Input
          className="pl-8"
          placeholder="Buscar categoría…"
          value={filter}
          onChange={(e) => onFilter(e.target.value)}
        />
      </div>

      {visible.length === 0 ? (
        <p className="px-1 py-2 text-sm text-[var(--color-muted-foreground)]">
          Sin coincidencias.
        </p>
      ) : (
        <ul className="max-h-[26rem] space-y-1 overflow-auto pr-1">
          {visible.map((c) => {
            const isSel = selected === c.id;
            return (
              <li key={String(c.id)}>
                <button
                  onClick={() => onSelect(c.id)}
                  aria-current={isSel}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-md border border-transparent py-2 pl-2 pr-2.5 text-left transition-colors",
                    isSel
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/12"
                      : "hover:bg-[var(--color-muted)]",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-md text-xs font-semibold",
                      isSel
                        ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                        : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]",
                    )}
                  >
                    <Swords className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-sm",
                        isSel ? "font-semibold text-[var(--color-primary)]" : "font-medium",
                      )}
                    >
                      {c.name ?? `Categoría ${c.id}`}
                    </span>
                    {(c.countFights != null || c.countFighters != null) && (
                      <span className="block text-xs text-[var(--color-muted-foreground)]">
                        {c.countFights != null ? `${c.countFights} peleas` : ""}
                        {c.countFights != null && c.countFighters != null ? " · " : ""}
                        {c.countFighters != null ? `${c.countFighters} atletas` : ""}
                      </span>
                    )}
                  </span>
                  <ChevronRight
                    className={cn(
                      "size-4 shrink-0 transition-transform",
                      isSel
                        ? "text-[var(--color-primary)]"
                        : "text-[var(--color-muted-foreground)] group-hover:translate-x-0.5",
                    )}
                    aria-hidden
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
