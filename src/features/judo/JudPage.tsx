import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, ChevronRight, Activity } from "lucide-react";

import { listSchedules, startSchedule, stopSchedule } from "@/api/zempo";
import { getJudoCategories, getJudoFights, type JudoCategory } from "@/api/grs/judo";
import { getZempoPreview } from "@/api/grs/zempo-sync";
import { useJudoStore } from "@/stores/judo.store";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { RetryNotice } from "@/components/ui/retry-notice";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { JudoFightCard } from "./JudoFightCard";
import { ZempoSetupCard } from "./ZempoSetupCard";
import { OrdemLutasCard } from "./OrdemLutasCard";
import { ResultadosCard } from "./ResultadosCard";

const TABS: TabItem[] = [
  { value: "config", label: "Configuración" },
  { value: "lutas", label: "Lutas" },
  { value: "orden", label: "Orden de lutas" },
  { value: "resultados", label: "Resultados" },
];

export function JudPage() {
  const codigo = useJudoStore((s) => s.codigo);
  const setCodigo = useJudoStore((s) => s.setCodigo);
  const tab = useJudoStore((s) => s.tab);
  const setTab = useJudoStore((s) => s.setTab);
  const [selected, setSelected] = useState<JudoCategory | null>(null);

  const categories = useQuery({ queryKey: ["judo", "categories"], queryFn: getJudoCategories });
  const fights = useQuery({
    queryKey: ["judo", "fights", selected?.sportEvent, selected?.gender, selected?.category],
    queryFn: () => getJudoFights(selected!.sportEvent, selected!.gender, selected!.category),
    enabled: selected != null,
  });

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">JUD (judo)</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Control de sincronización (zempo) y lutas sincronizadas en el GRS.
        </p>
      </header>

      <CompeticionBar codigo={codigo} setCodigo={setCodigo} />

      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === "config" && (
        <div className="space-y-6">
          <ZempoSetupCard codigo={codigo} />
          <ScheduleControl />
        </div>
      )}

      {tab === "lutas" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.6fr]">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Categorías</CardTitle>
              {categories.data && <Badge variant="secondary">{categories.data.length}</Badge>}
            </CardHeader>
            <CardContent>
              {categories.isLoading ? (
                <Loader2 className="size-5 animate-spin text-[var(--color-muted-foreground)]" aria-hidden />
              ) : categories.isError ? (
                <p role="alert" className="text-sm text-[var(--color-destructive)]">
                  Error al cargar categorías de judo.
                </p>
              ) : (categories.data ?? []).length === 0 ? (
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  No hay lutas de judo sincronizadas todavía.
                </p>
              ) : (
                <ul className="max-h-[26rem] space-y-1 overflow-auto pr-1">
                  {(categories.data ?? []).map((c) => {
                    const isSel =
                      selected?.sportEvent === c.sportEvent &&
                      selected?.gender === c.gender &&
                      selected?.category === c.category;
                    return (
                      <li key={`${c.sportEvent}|${c.gender}|${c.category}`}>
                        <button
                          onClick={() => setSelected(c)}
                          aria-current={isSel}
                          className={cn(
                            "flex w-full items-center justify-between gap-2 rounded-md border border-transparent px-3 py-2 text-left transition-colors",
                            isSel
                              ? "border-[var(--color-primary)] bg-[var(--color-primary)]/12"
                              : "hover:bg-[var(--color-muted)]",
                          )}
                        >
                          <span
                            className={cn(
                              "truncate text-sm font-medium",
                              isSel && "text-[var(--color-primary)]",
                            )}
                          >
                            {c.name}
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            <span className="text-xs text-[var(--color-muted-foreground)]">
                              {c.countCompleted}/{c.countFights}
                            </span>
                            <ChevronRight className="size-4" aria-hidden />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>
                Lutas
                {selected ? (
                  <span className="ml-2 text-sm font-normal text-[var(--color-muted-foreground)]">
                    {selected.name}
                  </span>
                ) : null}
              </CardTitle>
              {fights.data && <Badge variant="secondary">{fights.data.length}</Badge>}
            </CardHeader>
            <CardContent>
              {selected == null ? (
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  Selecciona una categoría para ver sus lutas.
                </p>
              ) : fights.isLoading ? (
                <Loader2 className="size-5 animate-spin text-[var(--color-muted-foreground)]" aria-hidden />
              ) : fights.isError ? (
                <p role="alert" className="text-sm text-[var(--color-destructive)]">
                  Error al cargar lutas.
                </p>
              ) : fights.data && fights.data.length > 0 ? (
                <div className="max-h-[34rem] space-y-2 overflow-auto pr-1">
                  {fights.data.map((f) => (
                    <JudoFightCard key={f.id} fight={f} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  Esta categoría no tiene lutas.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "orden" && <OrdemLutasCard codigo={codigo} />}

      {tab === "resultados" && <ResultadosCard codigo={codigo} />}
    </div>
  );
}

// ---- Barra de competición compartida + preview ---------------------------

function CompeticionBar({
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

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-3 sm:flex-row sm:items-center">
      <label className="flex items-center gap-2">
        <span className="text-sm font-medium">Competición</span>
        <Input
          className="max-w-[12rem]"
          placeholder="código (ej. jj25)"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
        />
      </label>
      <div className="min-h-5 text-sm sm:ml-2">
        {debounced.length < 3 ? null : preview.isLoading ? (
          <span className="flex items-center gap-1.5 text-[var(--color-muted-foreground)]">
            <Loader2 className="size-3.5 animate-spin" aria-hidden /> Validando…
          </span>
        ) : preview.isError ? (
          <span className="text-[var(--color-destructive)]">No se pudo validar el código.</span>
        ) : preview.data && preview.data.competicaoNome ? (
          <span>
            <span className="font-semibold">{preview.data.competicaoNome}</span>
            <span className="text-[var(--color-muted-foreground)]">
              {" · "}
              {preview.data.totalCategorias} categorías ({preview.data.sorteadas} sorteadas) ·{" "}
              {preview.data.totalInscritos} inscritos
            </span>
          </span>
        ) : preview.data ? (
          <span className="text-[var(--color-warning)]">
            Código sin categorías o no encontrado en Zempo.
          </span>
        ) : null}
      </div>
    </div>
  );
}

// ---- Control de sincronización (zempo) -----------------------------------

function ScheduleControl() {
  const qc = useQueryClient();
  const [codigo, setCodigo] = useState("");

  const schedules = useQuery({
    queryKey: ["zempo", "schedules"],
    queryFn: listSchedules,
    refetchInterval: 15_000,
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["zempo", "schedules"] });

  const start = useMutation({
    mutationFn: (c: string) => startSchedule(c),
    onSuccess: () => {
      toast.success("Sincronización de judo activada");
      setCodigo("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const stop = useMutation({
    mutationFn: (c: string) => stopSchedule(c),
    onSuccess: () => {
      toast.success("Sincronización detenida");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = (Array.isArray(schedules.data) ? schedules.data : []).filter(
    (s) => String(s.competicaoCodigo ?? "").trim() !== "",
  );

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-4 text-[var(--color-primary)]" aria-hidden />
            Sincronización (zempo)
          </CardTitle>
          <CardDescription>
            Activa/detén la sincronización periódica de una competición de judo (cada 15s).
          </CardDescription>
        </div>
        {schedules.isLoading ? (
          <Loader2 className="size-4 animate-spin text-[var(--color-muted-foreground)]" aria-hidden />
        ) : schedules.isError ? (
          <Badge variant="destructive">sin conexión</Badge>
        ) : (
          <Badge variant="secondary">{list.length} activas</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {schedules.isError && (
          <RetryNotice
            message="No se pudo conectar con el servicio de judo (zempo)."
            onRetry={() => schedules.refetch()}
            isRetrying={schedules.isFetching}
          />
        )}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (codigo.trim()) start.mutate(codigo.trim());
          }}
        >
          <Input
            className="max-w-xs"
            placeholder="Código de competición"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />
          <Button type="submit" size="sm" disabled={start.isPending}>
            {start.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Plus className="size-4" aria-hidden />
            )}
            Agregar
          </Button>
        </form>

        <ul className="space-y-1">
          {list.length === 0 ? (
            <li className="text-sm text-[var(--color-muted-foreground)]">
              Sin competiciones en sincronización.
            </li>
          ) : (
            list.map((s) => {
              const code = String(s.competicaoCodigo ?? "");
              return (
                <li
                  key={code}
                  className="flex items-center justify-between rounded-md bg-[var(--color-muted)] px-3 py-1.5 text-sm"
                >
                  <span className="font-medium">{code}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => stop.mutate(code)}
                    disabled={stop.isPending}
                    aria-label={`Detener sincronización de ${code}`}
                  >
                    <Trash2 className="size-4 text-[var(--color-destructive)]" aria-hidden />
                  </Button>
                </li>
              );
            })
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
