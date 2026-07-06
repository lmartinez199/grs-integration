import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  CheckCheck,
  ListChecks,
  Activity,
  ChevronRight,
  Users,
  Trophy,
  Loader2,
  Search,
  Send,
  Layers,
} from "lucide-react";

import {
  getStartListDetails,
  manualSyncMapped,
  type AthSchedule,
} from "@/api/ath";
import { genderLabel } from "@/lib/domain/ath-start-list";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { StartList } from "./StartList";
import { ResultsDisplay } from "./ResultsDisplay";

const yes = (v: string) => v?.toUpperCase() === "S";

/** Una fila genera unit propia (enviable) cuando su rol es 'own' o no tiene rol. */
const ownsUnit = (s: AthSchedule) => !s.unitRole || s.unitRole === "own";

/** Clave estable de una fila del horario (para marcar enviadas en esta sesión). */
const rowKey = (s: AthSchedule) =>
  `${s.TestId}-${s.PhaseId}-${s.StageId}-${s.Time}`;

/** Cuerpo de la petición de sync para una fila. */
const syncBody = (s: AthSchedule) => ({
  date: s.Date?.slice(0, 10),
  time: s.Time,
  testId: s.TestId,
  stageId: s.StageId,
});

// ---- Estado "enviado" compartido (en memoria, por sesión) ----------------

interface SentState {
  /** rowKey -> hora "HH:MM" en que se envió a GRS. */
  sent: Map<string, string>;
  isSent: (s: AthSchedule) => boolean;
  markSent: (s: AthSchedule) => void;
}

const SentContext = createContext<SentState | null>(null);
const useSent = () => {
  const ctx = useContext(SentContext);
  if (!ctx) throw new Error("useSent fuera de SentContext");
  return ctx;
};

function nowHm(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

// ---- Item ----------------------------------------------------------------

function ScheduleItem({ s }: { s: AthSchedule }) {
  const qc = useQueryClient();
  const { sent: sentMap, isSent, markSent } = useSent();
  const [showStartList, setShowStartList] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const startList = useQuery({
    queryKey: ["ath", "start-list", s.TestId, s.Time, s.StageId],
    queryFn: () => getStartListDetails(s.TestId, s.Time, s.StageId),
    enabled: showStartList,
  });
  // Los resultados salen de la misma fuente que la start list (marcas ya pobladas).
  const results = useQuery({
    queryKey: ["ath", "start-list", s.TestId, s.Time, s.StageId],
    queryFn: () => getStartListDetails(s.TestId, s.Time, s.StageId),
    enabled: showResults,
  });
  const hasResults = yes(s.HasResult) || yes(s.Andamento);

  const sync = useMutation({
    mutationFn: () => manualSyncMapped(syncBody(s)),
    onSuccess: (res) => {
      const total = (res as { totalUnits?: number })?.totalUnits;
      toast.success(
        res?.message ?? "Enviado a GRS",
        total != null ? `Unidades: ${total}` : undefined,
      );
      markSent(s);
      qc.invalidateQueries({ queryKey: ["ath", "schedules"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const owns = ownsUnit(s);
  const sent = isSent(s);
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
        {owns ? (
          <>
            {sent && (
              <Badge variant="success" className="gap-1">
                <CheckCheck className="size-3" /> enviado · {sentMap.get(rowKey(s))}
              </Badge>
            )}
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
          <span
            className="inline-flex items-center gap-1 text-xs text-(--color-muted-foreground)"
            title="Esta fila del programa no genera una unit propia en GRS (va dentro de otra o no es un evento)."
          >
            <Layers className="size-3" /> {roleLabel}
          </span>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {owns && (
            <Button
              size="sm"
              variant={sent ? "ghost" : "outline"}
              className="h-7 px-2"
              onClick={() => sync.mutate()}
              icon={<Send />}
              loading={sync.isPending}
              title="Sincronizar esta prueba al GRS"
            >
              {sent ? "Reenviar" : "Enviar a GRS"}
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
          {hasResults && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={() => setShowResults((v) => !v)}
            >
              <Trophy className="size-3.5" />
              {showResults ? "Ocultar resultados" : "Ver resultados"}
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
            <ErrorBoundary label="start list">
              <StartList entries={startList.data ?? []} />
            </ErrorBoundary>
          )}
        </div>
      )}

      {showResults && (
        <div className="mt-2 border-t border-(--color-border) pt-2">
          {results.isLoading ? (
            <Loader2 className="size-4 animate-spin text-(--color-muted-foreground)" />
          ) : results.isError ? (
            <p className="text-sm text-(--color-destructive)">
              No se pudieron cargar los resultados.
            </p>
          ) : (
            <ErrorBoundary label="resultados">
              <ResultsDisplay
                entries={results.data ?? []}
                live={!yes(s.HasResult) && yes(s.Andamento)}
              />
            </ErrorBoundary>
          )}
        </div>
      )}
    </li>
  );
}

// ---- Fecha ----------------------------------------------------------------

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

// ---- Filtros --------------------------------------------------------------

type StatusFilter = "all" | "withList" | "pending" | "live";
type GenderFilter = "all" | "M" | "F";

const selectClass =
  "flex h-9 rounded-md border bg-(--color-background) px-3 text-sm text-(--color-foreground) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-ring)";

function FilterBar({
  search,
  setSearch,
  status,
  setStatus,
  gender,
  setGender,
  total,
  shown,
}: {
  search: string;
  setSearch: (v: string) => void;
  status: StatusFilter;
  setStatus: (v: StatusFilter) => void;
  gender: GenderFilter;
  setGender: (v: GenderFilter) => void;
  total: number;
  shown: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-48 flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-(--color-muted-foreground)" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar prueba…"
          className="h-9 pl-8"
        />
      </div>
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as StatusFilter)}
        className={selectClass}
        aria-label="Filtrar por estado"
      >
        <option value="all">Todos los estados</option>
        <option value="withList">Con start list</option>
        <option value="pending">Pendientes de enviar</option>
        <option value="live">En curso</option>
      </select>
      <select
        value={gender}
        onChange={(e) => setGender(e.target.value as GenderFilter)}
        className={selectClass}
        aria-label="Filtrar por sexo"
      >
        <option value="all">Ambos sexos</option>
        <option value="M">Masculino</option>
        <option value="F">Femenino</option>
      </select>
      <span className="ml-auto text-xs text-(--color-muted-foreground)">
        {shown === total ? `${total} pruebas` : `${shown} de ${total}`}
      </span>
    </div>
  );
}

// ---- Lista ----------------------------------------------------------------

export function ScheduleList({ schedules }: { schedules: AthSchedule[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [gender, setGender] = useState<GenderFilter>("all");
  const [sent, setSent] = useState<Map<string, string>>(() => new Map());

  const sentState = useMemo<SentState>(
    () => ({
      sent,
      isSent: (s) => sent.has(rowKey(s)),
      markSent: (s) =>
        setSent((prev) => {
          const next = new Map(prev);
          next.set(rowKey(s), nowHm());
          return next;
        }),
    }),
    [sent],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return schedules.filter((s) => {
      if (q && !s.TestName?.toLowerCase().includes(q)) return false;
      if (gender !== "all" && s.Gender?.toUpperCase() !== gender) return false;
      if (status === "withList" && !yes(s.HasInitialList)) return false;
      if (status === "live" && !yes(s.Andamento)) return false;
      if (status === "pending" && (!ownsUnit(s) || sent.has(rowKey(s)))) return false;
      return true;
    });
  }, [schedules, search, gender, status, sent]);

  if (!schedules.length) {
    return (
      <p className="text-sm text-(--color-muted-foreground)">
        Sin horarios para los filtros seleccionados.
      </p>
    );
  }

  // Agrupar por día, preservando el orden de llegada.
  const groups: { key: string; label: string; items: AthSchedule[] }[] = [];
  for (const s of filtered) {
    const key = dateKey(s.Date);
    let group = groups.find((g) => g.key === key);
    if (!group) {
      group = { key, label: formatDateLabel(s.Date), items: [] };
      groups.push(group);
    }
    group.items.push(s);
  }

  return (
    <SentContext.Provider value={sentState}>
      <div className="space-y-3">
        <FilterBar
          search={search}
          setSearch={setSearch}
          status={status}
          setStatus={setStatus}
          gender={gender}
          setGender={setGender}
          total={schedules.length}
          shown={filtered.length}
        />
        {groups.length ? (
          <ScheduleGroups groups={groups} />
        ) : (
          <p className="text-sm text-(--color-muted-foreground)">
            Ninguna prueba coincide con los filtros.
          </p>
        )}
      </div>
    </SentContext.Provider>
  );
}

/** Contadores de una jornada para la cabecera. */
function dayCounts(items: AthSchedule[]) {
  let withList = 0;
  let withResult = 0;
  let live = 0;
  for (const s of items) {
    if (yes(s.HasInitialList)) withList++;
    if (yes(s.HasResult)) withResult++;
    if (yes(s.Andamento)) live++;
  }
  return { withList, withResult, live };
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
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="space-y-2">
      {groups.map((group, idx) => (
        <DayGroup
          key={group.key}
          group={group}
          panelId={`${baseId}-${idx}`}
          isOpen={open.has(group.key)}
          onToggle={() => toggle(group.key)}
        />
      ))}
    </div>
  );
}

function DayGroup({
  group,
  panelId,
  isOpen,
  onToggle,
}: {
  group: { key: string; label: string; items: AthSchedule[] };
  panelId: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const qc = useQueryClient();
  const { isSent, markSent } = useSent();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );

  const counts = dayCounts(group.items);
  // Pruebas enviables aún no enviadas en esta jornada.
  const pending = group.items.filter((s) => ownsUnit(s) && !isSent(s));

  async function sendDay() {
    const targets = pending;
    if (!targets.length) return;
    setProgress({ done: 0, total: targets.length });
    let ok = 0;
    let fail = 0;
    for (let i = 0; i < targets.length; i++) {
      const s = targets[i];
      try {
        await manualSyncMapped(syncBody(s));
        markSent(s);
        ok++;
      } catch {
        fail++;
      }
      setProgress({ done: i + 1, total: targets.length });
    }
    setProgress(null);
    qc.invalidateQueries({ queryKey: ["ath", "schedules"] });
    if (fail === 0) toast.success(`Jornada enviada a GRS`, `${ok} pruebas`);
    else toast.error(`Enviadas ${ok} · ${fail} con error`);
  }

  return (
    <div className="rounded-md border">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 rounded-t-md border-b bg-(--color-background) px-3 py-2">
        <button
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <ChevronRight
            className={cn(
              "size-4 shrink-0 text-(--color-muted-foreground) transition-transform",
              isOpen && "rotate-90",
            )}
          />
          <span className="truncate text-sm font-semibold text-(--color-primary)">
            {group.label}
          </span>
          <span className="ml-1 flex shrink-0 items-center gap-1.5 text-xs text-(--color-muted-foreground)">
            <Badge variant="secondary">{group.items.length}</Badge>
            {counts.withList > 0 && (
              <span className="hidden items-center gap-0.5 sm:inline-flex">
                <ListChecks className="size-3" /> {counts.withList}
              </span>
            )}
            {counts.withResult > 0 && (
              <span className="hidden items-center gap-0.5 text-(--color-success) sm:inline-flex">
                <CheckCircle2 className="size-3" /> {counts.withResult}
              </span>
            )}
            {counts.live > 0 && (
              <span className="inline-flex items-center gap-0.5 text-(--color-warning)">
                <Activity className="size-3" /> {counts.live}
              </span>
            )}
          </span>
        </button>
        {pending.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 shrink-0 px-2"
            onClick={sendDay}
            disabled={!!progress}
            title="Enviar a GRS todas las pruebas enviables de esta jornada que aún no se han enviado"
          >
            {progress ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> {progress.done}/
                {progress.total}
              </>
            ) : (
              <>
                <Send className="size-3.5" /> Enviar el día ({pending.length})
              </>
            )}
          </Button>
        )}
      </div>

      {isOpen && (
        <ul id={panelId} className="space-y-2 p-3">
          {group.items.map((s, i) => (
            <ScheduleItem key={`${rowKey(s)}-${i}`} s={s} />
          ))}
        </ul>
      )}
    </div>
  );
}
