import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Play,
  Square,
  RefreshCw,
  Timer,
  Database,
  Layers,
  CalendarClock,
} from "lucide-react";

import * as ath from "@/api/ath";
import type { AthActionResult } from "@/api/ath";
import { formatDateTime } from "@/lib/utils";
import { useAthStore } from "@/stores/ath.store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { ActionButton } from "@/components/ui/action-button";
import { RetryNotice } from "@/components/ui/retry-notice";
import { DataView } from "@/components/ui/data-view";
import {
  SetupSteps,
  type SetupStep,
  type StepRunResult,
} from "@/components/integration/setup-steps";
import { ScheduleList } from "./ScheduleList";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AthPage() {
  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">ATH (atletismo)</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Control de sincronización, setup en GRS y consulta de datos del CBAT.
        </p>
      </header>

      <LoopSection />
      <AthSetupSteps />
      <ReadSection />
    </div>
  );
}

// ---- Loop de sincronización ----------------------------------------------

function LoopSection() {
  const qc = useQueryClient();
  const status = useQuery({
    queryKey: ["ath", "status-jobs"],
    queryFn: ath.getJobsStatus,
    refetchInterval: 15_000,
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["ath", "status-jobs"] });

  const start = useMutation({
    mutationFn: ath.startSyncData,
    onSuccess: () => { toast.success("Loop de sincronización iniciado"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const stop = useMutation({
    mutationFn: ath.stopSyncData,
    onSuccess: () => { toast.success("Loop detenido"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  // Filtros opcionales para el sync manual (vacío = defaults del backend).
  const [date, setDate] = useState("");
  const [hour, setHour] = useState("");
  const dateValid = date.trim() === "" || /^\d{4}-\d{2}-\d{2}$/.test(date.trim());
  const hourValid = hour.trim() === "" || /^\d{1,2}:\d{2}$/.test(hour.trim());
  const filtersValid = dateValid && hourValid;
  const filters = () => {
    const body: Record<string, unknown> = {};
    if (date.trim()) body.date = date.trim();
    if (hour.trim()) body.hour = hour.trim();
    return body;
  };

  const data = status.data;
  const active = data?.active === true;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Timer className="size-4 text-[var(--color-primary)]" />
          Loop de sincronización
        </CardTitle>
        {status.isLoading ? (
          <Loader2 className="size-4 animate-spin text-[var(--color-muted-foreground)]" />
        ) : status.isError ? (
          <Badge variant="destructive">sin conexión</Badge>
        ) : active ? (
          <Badge variant="success">sincronizando</Badge>
        ) : (
          <Badge variant="secondary">inactivo</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {status.isError ? (
          <RetryNotice
            message="No se pudo conectar con el servicio de atletismo."
            onRetry={() => status.refetch()}
            isRetrying={status.isFetching}
          />
        ) : (
          <>
            {active && (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <Row label="Fecha" value={data?.date ?? "—"} />
                <Row label="Hora" value={data?.hour || "todas"} />
                <Row label="Iniciado" value={formatDateTime(data?.startedAt)} />
                <Row label="Última sync" value={formatDateTime(data?.lastSyncAt)} />
              </dl>
            )}
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Fecha (opcional)</Label>
                <Input
                  className="w-36"
                  placeholder="AAAA-MM-DD"
                  value={date}
                  aria-invalid={!dateValid}
                  onChange={(e) => setDate(e.target.value)}
                />
                {!dateValid && (
                  <p role="alert" className="text-xs text-[var(--color-destructive)]">
                    Formato AAAA-MM-DD
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Hora (opcional)</Label>
                <Input
                  className="w-24"
                  placeholder="08:30"
                  value={hour}
                  aria-invalid={!hourValid}
                  onChange={(e) => setHour(e.target.value)}
                />
                {!hourValid && (
                  <p role="alert" className="text-xs text-[var(--color-destructive)]">
                    Formato HH:MM
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => start.mutate()} disabled={active || start.isPending}>
                <Play className="size-4" /> Iniciar
              </Button>
              <Button size="sm" variant="outline" onClick={() => stop.mutate()} disabled={!active || stop.isPending}>
                <Square className="size-4" /> Detener
              </Button>
              <ActionButton
                label="Sincronización manual"
                icon={<RefreshCw className="size-4" />}
                disabled={!filtersValid}
                action={() => ath.manualSync(filters())}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Setup en GRS (estructura + entidades) -------------------------------

const n = (v: unknown): number => (typeof v === "number" ? v : 0);

/** Convierte una respuesta plana de ath en el resumen unificado de pasos. */
function summary(
  raw: AthActionResult,
  created: number,
  processed: number,
  skipped: number,
): StepRunResult {
  const list = Array.isArray(raw.errors) ? raw.errors.map(String) : [];
  const failed = n(raw.failed);
  const errors = list.length === 0 && failed > 0 ? [`${failed} con error`] : list;
  return { kind: "summary", data: { created, processed, skipped, errors } };
}

/**
 * Pasos de ATH. La estructura es granular (el ath-microservice expone un
 * endpoint por nivel) y «Ejecutar todo» del grupo los corre en orden de
 * dependencia: categorías → competiciones → fases → unidades.
 */
const ATH_STEPS: SetupStep<Record<string, never>>[] = [
  {
    key: "categories",
    badge: "1",
    label: "Categorías",
    desc: "Crea el catálogo de categorías de edad en GRS.",
    group: "estructura",
    run: async () => {
      const r = await ath.setupCategories();
      return summary(r, n(r.created), n(r.processed), 0);
    },
  },
  {
    key: "competitions",
    badge: "2",
    label: "Competiciones",
    desc: "Crea las competiciones (eventos) en GRS desde el CBAT.",
    group: "estructura",
    run: async () => {
      const r = await ath.setup();
      return summary(r, n(r.created), n(r.processed), n(r.skipped));
    },
  },
  {
    key: "phases",
    badge: "3",
    label: "Fases",
    desc: "Crea los phase codes y las fases (series) de cada competición.",
    group: "estructura",
    run: async () => {
      const r = await ath.setupPhases();
      return summary(
        r,
        n(r.phaseCodesCreated) + n(r.phasesCreated),
        n(r.processed),
        n(r.phaseCodesUpdated),
      );
    },
  },
  {
    key: "units",
    badge: "4",
    label: "Unidades",
    desc: "Envía las unidades (series) al GRS y elimina las huérfanas.",
    group: "estructura",
    run: async () => {
      const r = await ath.setupUnits();
      return summary(r, 0, n(r.unitsProcessed), n(r.unitsDeleted));
    },
  },
  {
    key: "organisations",
    badge: "1",
    label: "Organizaciones",
    desc: "Sincroniza clubes / UFs / delegaciones.",
    group: "entidades",
    run: async () => {
      const r = await ath.syncOrganisations();
      return summary(r, n(r.created), n(r.total), n(r.existed));
    },
  },
  {
    key: "participants",
    badge: "2",
    label: "Participantes",
    desc: "Sincroniza los atletas del CBAT.",
    group: "entidades",
    run: async () => {
      const r = await ath.syncParticipants();
      return summary(
        r,
        n(r.created),
        n(r.total),
        n(r.matchedByCode) + n(r.matchedByFallback),
      );
    },
  },
  {
    key: "groups",
    badge: "3",
    label: "Grupos (relevos)",
    desc: "Crea los equipos de relevo. Requiere participantes sincronizados.",
    group: "entidades",
    run: async () => {
      const r = await ath.syncGroups();
      return summary(r, n(r.created), n(r.total), n(r.updated));
    },
  },
  {
    key: "medals",
    badge: "4",
    label: "Medallas",
    desc: "Genera las medallas (oro/plata/bronce) de las finales individuales.",
    group: "entidades",
    run: async () => {
      const r = await ath.syncMedals();
      return summary(r, n(r.created), n(r.total), 0);
    },
  },
];

const ATH_CTX: Record<string, never> = {};

function AthSetupSteps() {
  const results = useAthStore((s) => s.stepResults);
  const setStepResult = useAthStore((s) => s.setStepResult);
  return (
    <SetupSteps<Record<string, never>>
      title="Setup en GRS"
      icon={<Database className="size-4 text-[var(--color-primary)]" />}
      description="Prepara la estructura del evento y envía los datos del CBAT al GRS."
      steps={ATH_STEPS}
      ctx={ATH_CTX}
      results={results}
      onResult={setStepResult}
    />
  );
}

// ---- Lectura (CBAT) ------------------------------------------------------

function ReadSection() {
  return (
    <div className="space-y-6">
      <div className="lg:max-w-sm">
        <LazyReadCard
          title="Categorías del evento"
          icon={<Layers className="size-4 text-[var(--color-primary)]" />}
          queryKey={["ath", "event-categories"]}
          queryFn={ath.getEventCategories}
        />
      </div>
      <SchedulesCard />
    </div>
  );
}

function LazyReadCard({
  title,
  icon,
  queryKey,
  queryFn,
}: {
  title: string;
  icon: React.ReactNode;
  queryKey: unknown[];
  queryFn: () => Promise<unknown>;
}) {
  const q = useQuery({ queryKey, queryFn, enabled: false });
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">{icon}{title}</CardTitle>
        <Button size="sm" variant="outline" onClick={() => q.refetch()} disabled={q.isFetching}>
          {q.isFetching ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Cargar
        </Button>
      </CardHeader>
      <CardContent>
        {q.isError ? (
          <p className="text-sm text-[var(--color-destructive)]">No se pudo cargar.</p>
        ) : q.data !== undefined ? (
          <div className="max-h-72 overflow-auto">
            <DataView data={q.data} />
          </div>
        ) : (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Pulsa “Cargar” para consultar.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

const dateOptionFmt = new Intl.DateTimeFormat("es-MX", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

function formatDateOption(key: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(key);
  if (!m) return key;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return dateOptionFmt.format(d);
}

function SchedulesCard() {
  const [selectedDate, setSelectedDate] = useState("");
  const q = useQuery({
    queryKey: ["ath", "schedules"],
    queryFn: () => ath.getCompetitionSchedules({}),
    enabled: false,
  });

  const all = q.data ?? [];
  const dates = Array.from(
    new Set(all.map((s) => s.Date?.slice(0, 10)).filter(Boolean) as string[]),
  ).sort();
  const filtered = selectedDate
    ? all.filter((s) => s.Date?.slice(0, 10) === selectedDate)
    : all;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="size-4 text-[var(--color-primary)]" />
          Horarios de competición
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-2">
          {dates.length > 0 && (
            <div className="flex w-64 max-w-full flex-col gap-1">
              <Label className="text-xs">Filtrar por fecha</Label>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex h-9 w-full rounded-md border bg-[var(--color-background)] px-3 text-sm text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              >
                <option value="">Todas las fechas ({all.length})</option>
                {dates.map((d) => (
                  <option key={d} value={d}>
                    {formatDateOption(d)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Button size="sm" variant="outline" onClick={() => q.refetch()} disabled={q.isFetching}>
            {q.isFetching ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            {q.data !== undefined ? "Recargar" : "Cargar"}
          </Button>
        </div>
        {q.isError ? (
          <p className="text-sm text-[var(--color-destructive)]">No se pudo cargar.</p>
        ) : q.data !== undefined ? (
          <div className="max-h-[40rem] overflow-auto pr-1">
            <ScheduleList schedules={filtered} />
          </div>
        ) : (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Pulsa “Cargar” para ver los horarios.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-[var(--color-muted-foreground)]">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}
