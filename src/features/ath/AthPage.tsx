import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Play,
  Square,
  RefreshCw,
  Timer,
  Database,
  Building2,
  Users,
  UsersRound,
  Medal,
  Layers,
  ListOrdered,
  CalendarClock,
} from "lucide-react";

import * as ath from "@/api/ath";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { ActionButton } from "@/components/ui/action-button";
import { RetryNotice } from "@/components/ui/retry-notice";
import { DataView } from "@/components/ui/data-view";
import { ScheduleList } from "./ScheduleList";
import {
  Card,
  CardContent,
  CardDescription,
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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SetupSection />
        <EntitiesSection />
      </div>
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

// ---- Setup en GRS --------------------------------------------------------

function SetupSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="size-4 text-[var(--color-primary)]" />
          Setup en GRS
        </CardTitle>
        <CardDescription>Prepara la estructura del evento en el GRS.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <ActionButton label="Setup completo" icon={<Database className="size-4" />} action={ath.setup} />
          <ActionButton label="Categorías" icon={<Layers className="size-4" />} action={ath.setupCategories} />
          <ActionButton label="Fases" icon={<ListOrdered className="size-4" />} action={ath.setupPhases} />
          <ActionButton label="Unidades" icon={<Layers className="size-4" />} action={ath.setupUnits} />
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Sincronización de entidades -----------------------------------------

function EntitiesSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="size-4 text-[var(--color-primary)]" />
          Sincronización de entidades
        </CardTitle>
        <CardDescription>Envía datos del CBAT al GRS.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <ActionButton label="Organizaciones" icon={<Building2 className="size-4" />} action={ath.syncOrganisations} />
          <ActionButton label="Participantes" icon={<Users className="size-4" />} action={ath.syncParticipants} />
          <ActionButton label="Grupos (relevos)" icon={<UsersRound className="size-4" />} action={ath.syncGroups} />
          <ActionButton label="Medallas" icon={<Medal className="size-4" />} action={ath.syncMedals} />
        </div>
      </CardContent>
    </Card>
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
