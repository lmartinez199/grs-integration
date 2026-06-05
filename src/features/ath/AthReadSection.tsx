import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw, Layers, CalendarClock } from "lucide-react";

import * as ath from "@/api/ath";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DataView } from "@/components/ui/data-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScheduleList } from "./ScheduleList";

export function AthReadSection() {
  return (
    <div className="space-y-6">
      <div className="lg:max-w-sm">
        <LazyReadCard
          title="Categorías del evento"
          icon={<Layers className="size-4 text-(--color-primary)" />}
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
          <p className="text-sm text-(--color-destructive)">No se pudo cargar.</p>
        ) : q.data !== undefined ? (
          <div className="max-h-72 overflow-auto">
            <DataView data={q.data} />
          </div>
        ) : (
          <p className="text-sm text-(--color-muted-foreground)">
            Pulsa "Cargar" para consultar.
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
  const dateFilterId = useId();
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
          <CalendarClock className="size-4 text-(--color-primary)" />
          Horarios de competición
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-2">
          {dates.length > 0 && (
            <div className="flex w-64 max-w-full flex-col gap-1">
              <Label htmlFor={dateFilterId} className="text-xs">Filtrar por fecha</Label>
              <select
                id={dateFilterId}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex h-9 w-full rounded-md border bg-(--color-background) px-3 text-sm text-(--color-foreground) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-ring)"
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
          <p className="text-sm text-(--color-destructive)">No se pudo cargar.</p>
        ) : q.data !== undefined ? (
          <div className="max-h-[40rem] overflow-auto pr-1">
            <ScheduleList schedules={filtered} />
          </div>
        ) : (
          <p className="text-sm text-(--color-muted-foreground)">
            Pulsa "Cargar" para ver los horarios.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
