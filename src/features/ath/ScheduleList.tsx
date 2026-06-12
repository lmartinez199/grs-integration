import { useEffect, useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ListChecks,
  Activity,
  ChevronRight,
  Users,
  Loader2,
  Send,
  Layers,
} from "lucide-react";

import { getStartListDetails, manualSyncMapped, type AthSchedule } from "@/api/ath";
import { genderLabel } from "@/lib/domain/ath-start-list";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { StartList } from "./StartList";

function ScheduleItem({ s }: { s: AthSchedule }) {
  const qc = useQueryClient();
  const [showStartList, setShowStartList] = useState(false);
  const startList = useQuery({
    queryKey: ["ath", "start-list", s.TestId, s.Time, s.StageId],
    queryFn: () => getStartListDetails(s.TestId, s.Time, s.StageId),
    enabled: showStartList,
  });

  const sync = useMutation({
    mutationFn: () =>
      manualSyncMapped({
        date: s.Date?.slice(0, 10),
        time: s.Time,
        testId: s.TestId,
        stageId: s.StageId,
      }),
    onSuccess: (res) => {
      const total = (res as { totalUnits?: number })?.totalUnits;
      toast.success(
        res?.message ?? "Enviado a GRS",
        total != null ? `Unidades: ${total}` : undefined,
      );
      qc.invalidateQueries({ queryKey: ["ath", "schedules"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ownsUnit = !s.unitRole || s.unitRole === "own";
  const roleLabel =
    s.unitRole === "partial"
      ? `parcial · ${s.PhaseName}`
      : s.unitRole === "merged"
        ? "consolidada · va en la Final por Tempo"
        : "no genera unit";

  return (
    <li className="rounded-md border bg-(--color-muted)/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tabular-nums">{s.Time}</span>
            <span className="truncate text-sm font-medium">{s.TestName}</span>
          </div>
          <p className="mt-0.5 text-xs text-(--color-muted-foreground)">
            {[s.TestType, s.PhaseName, genderLabel(s.Gender)].filter(Boolean).join(" · ")}
          </p>
        </div>
        {yes(s.Andamento) && <Badge variant="warning">en curso</Badge>}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {ownsUnit ? (
          <>
            {yes(s.HasInitialList) && (
              <Badge variant="secondary" className="gap-1">
                <ListChecks className="size-3" /> lista
              </Badge>
            )}
            {yes(s.HasResult) && (
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="size-3" /> resultados
              </Badge>
            )}
            {!yes(s.HasInitialList) && !yes(s.HasResult) && !yes(s.Andamento) && (
              <Badge variant="outline" className="gap-1">
                <Activity className="size-3" /> programada
              </Badge>
            )}
          </>
        ) : (
          <Badge
            variant="outline"
            className="gap-1 text-(--color-muted-foreground)"
            title="Esta fila del programa no genera una unit propia en GRS (va dentro de otra o no es un evento)."
          >
            <Layers className="size-3" /> {roleLabel}
          </Badge>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {ownsUnit && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2"
              onClick={() => sync.mutate()}
              disabled={sync.isPending}
              title="Sincronizar esta prueba al GRS"
            >
              {sync.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              Enviar a GRS
            </Button>
          )}
          {yes(s.HasInitialList) && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={() => setShowStartList((v) => !v)}
            >
              <Users className="size-3.5" />
              {showStartList ? "Ocultar start list" : "Ver start list"}
            </Button>
          )}
        </div>
      </div>

      {showStartList && (
        <div className="mt-2 border-t border-(--color-border) pt-2">
          {startList.isLoading ? (
            <Loader2 className="size-4 animate-spin text-(--color-muted-foreground)" />
          ) : startList.isError ? (
            <p className="text-sm text-(--color-destructive)">
              No se pudo cargar la start list.
            </p>
          ) : (
            <StartList entries={startList.data ?? []} />
          )}
        </div>
      )}
    </li>
  );
}

const yes = (v: string) => v?.toUpperCase() === "S";

const dateFmt = new Intl.DateTimeFormat("es-MX", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** Formatea solo la parte de fecha (YYYY-MM-DD) evitando corrimientos por zona horaria. */
function formatDateLabel(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!m) return iso || "Sin fecha";
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const label = dateFmt.format(d);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function dateKey(iso: string): string {
  return (iso ?? "").slice(0, 10);
}

export function ScheduleList({ schedules }: { schedules: AthSchedule[] }) {
  if (!schedules.length) {
    return (
      <p className="text-sm text-(--color-muted-foreground)">
        Sin horarios para los filtros seleccionados.
      </p>
    );
  }

  // Agrupar por día, preservando el orden de llegada.
  const groups: { key: string; label: string; items: AthSchedule[] }[] = [];
  for (const s of schedules) {
    const key = dateKey(s.Date);
    let group = groups.find((g) => g.key === key);
    if (!group) {
      group = { key, label: formatDateLabel(s.Date), items: [] };
      groups.push(group);
    }
    group.items.push(s);
  }

  return <ScheduleGroups groups={groups} />;
}

function ScheduleGroups({
  groups,
}: {
  groups: { key: string; label: string; items: AthSchedule[] }[];
}) {
  const baseId = useId();
  // Por defecto solo el primer día abierto; el resto colapsado para escanear fácil.
  const [open, setOpen] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setOpen(new Set(groups.slice(0, 1).map((g) => g.key)));
    // Re-inicializar cuando cambian los grupos (nueva carga/filtro).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups.map((g) => g.key).join("|")]);

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  return (
    <div className="space-y-2">
      {groups.map((group, idx) => {
        const isOpen = open.has(group.key);
        const panelId = `${baseId}-${idx}`;
        return (
          <div key={group.key} className="rounded-md border">
            <button
              onClick={() => toggle(group.key)}
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
                />
                <span className="text-sm font-semibold capitalize text-(--color-primary)">
                  {group.label}
                </span>
              </span>
              <Badge variant="secondary">{group.items.length} pruebas</Badge>
            </button>

            {isOpen && (
              <ul id={panelId} className="space-y-2 p-3 pt-0">
                {group.items.map((s, i) => (
                  <ScheduleItem key={`${s.TestId}-${s.PhaseId}-${i}`} s={s} />
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
