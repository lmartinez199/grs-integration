import { useState } from "react";
import { Check, Loader2, Play, ListChecks } from "lucide-react";

import {
  zempoSetup,
  zempoSyncParticipants,
  zempoSyncStartList,
  zempoSyncTeamGroups,
  zempoSyncResults,
  zempoSyncRankings,
  zempoSyncStaff,
  zempoSyncFederacoes,
} from "@/api/grs/zempo-sync";
import { useJudoStore, type StepResult } from "@/stores/judo.store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** Lo que devuelve cada paso (éxito). El error se añade en el catch de runStep. */
type StepRunResult = Extract<StepResult, { kind: "summary" | "queued" }>;

interface StepCtx {
  cod: string;
  eventCode: string;
  category: string;
}

interface Step {
  key: string;
  n: string;
  label: string;
  desc: string;
  /** El paso necesita el código de evento (eventCode) además del de competición. */
  needsEventCode?: boolean;
  /** El paso no usa el código de competición (p. ej. federaciones es global). */
  global?: boolean;
  run: (ctx: StepCtx) => Promise<StepRunResult>;
}

const STEPS: Step[] = [
  {
    key: "setup",
    n: "1",
    label: "Crear competición",
    desc: "Crea competiciones, fases y units desde las categorías de Zempo.",
    needsEventCode: true,
    run: async ({ cod, eventCode }) => ({
      kind: "summary",
      data: await zempoSetup(cod, { eventCode }),
    }),
  },
  {
    key: "participants",
    n: "2",
    label: "Participantes",
    desc: "Sincroniza los participantes inscritos.",
    run: async ({ cod }) => ({
      kind: "summary",
      data: await zempoSyncParticipants(cod),
    }),
  },
  {
    key: "start-list",
    n: "2b",
    label: "Start list",
    desc: "Asigna participantes a sus units de luta.",
    run: async ({ cod }) => ({
      kind: "summary",
      data: await zempoSyncStartList(cod),
    }),
  },
  {
    key: "team-groups",
    n: "3",
    label: "Equipos / grupos",
    desc: "Crea o actualiza los grupos (equipos) en GRS. Categoría opcional.",
    run: async ({ cod, category }) => ({
      kind: "summary",
      data: await zempoSyncTeamGroups(cod, category ? { category } : {}),
    }),
  },
  {
    key: "results",
    n: "4",
    label: "Resultados",
    desc: "Encola la sincronización de resultados de luchas (asíncrono).",
    run: async ({ cod }) => ({
      kind: "queued",
      data: await zempoSyncResults(cod),
    }),
  },
  {
    key: "rankings",
    n: "5",
    label: "Rankings",
    desc: "Sincroniza el ranking final.",
    run: async ({ cod }) => ({
      kind: "summary",
      data: await zempoSyncRankings(cod),
    }),
  },
  {
    key: "staff",
    n: "+",
    label: "Staff",
    desc: "Sincroniza técnicos y árbitros.",
    run: async ({ cod }) => ({
      kind: "summary",
      data: await zempoSyncStaff(cod),
    }),
  },
  {
    key: "federacoes",
    n: "+",
    label: "Federaciones",
    desc: "Sincroniza federaciones como organizaciones en GRS (global).",
    global: true,
    run: async () => ({
      kind: "summary",
      data: await zempoSyncFederacoes(),
    }),
  },
];

function stepStatus(r: StepResult | undefined): "ok" | "error" | "idle" {
  if (!r) return "idle";
  if (r.kind === "error") return "error";
  if (r.kind === "summary") return r.data.errors.length > 0 ? "error" : "ok";
  return "ok";
}

export function ZempoSetupCard({ codigo }: { codigo: string }) {
  const eventCode = useJudoStore((s) => s.eventCode);
  const setEventCode = useJudoStore((s) => s.setEventCode);
  const category = useJudoStore((s) => s.category);
  const setCategory = useJudoStore((s) => s.setCategory);
  const results = useJudoStore((s) => s.stepResults);
  const setStepResult = useJudoStore((s) => s.setStepResult);
  const [running, setRunning] = useState<string | null>(null);

  async function runStep(step: Step) {
    if (!step.global && !codigo.trim()) {
      toast.error("Indica el código de competición");
      return;
    }
    if (step.needsEventCode && !eventCode.trim()) {
      toast.error("Indica el código de evento (eventCode)");
      return;
    }

    setRunning(step.key);
    try {
      const res = await step.run({
        cod: codigo.trim(),
        eventCode: eventCode.trim(),
        category: category.trim(),
      });
      setStepResult(step.key, res);

      if (res.kind === "summary") {
        const s = res.data;
        if (s.errors.length > 0) {
          toast.error(`${step.label}: ${s.errors.length} con error`);
        } else {
          toast.success(
            `${step.label}: ${s.created} creados · ${s.processed} procesados · ${s.skipped} omitidos`,
          );
        }
      } else {
        toast.success(
          `${step.label}: encolado${res.data.jobId ? ` (job ${res.data.jobId})` : ""}`,
        );
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error desconocido";
      setStepResult(step.key, { kind: "error", message });
      toast.error(`${step.label}: ${message}`);
    } finally {
      setRunning(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="size-4 text-[var(--color-primary)]" aria-hidden />
          Configuración de la competición (setup)
        </CardTitle>
        <CardDescription>
          Ejecuta el flujo de sincronización por fases desde Zempo hacia el GRS.
          Cada paso usa tu sesión (JWT); no requiere API key.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs text-[var(--color-muted-foreground)]">
              Código de evento (eventCode)
            </span>
            <Input
              placeholder="requerido para el paso 1"
              value={eventCode}
              onChange={(e) => setEventCode(e.target.value)}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-[var(--color-muted-foreground)]">
              Categoría (equipos, opcional)
            </span>
            <Input
              placeholder="ej. GENERAL"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </label>
        </div>

        <ul className="space-y-1.5">
          {STEPS.map((step) => {
            const res = results[step.key];
            const status = stepStatus(res);
            const isRunning = running === step.key;
            return (
              <li
                key={step.key}
                className={cn(
                  "flex items-center gap-3 rounded-md border px-3 py-2 transition-colors",
                  status === "ok"
                    ? "border-[var(--color-success)]/40 bg-[var(--color-success)]/5"
                    : status === "error"
                      ? "border-[var(--color-destructive)]/40"
                      : "border-[var(--color-border)]",
                )}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    status === "ok"
                      ? "bg-[var(--color-success)] text-[var(--color-success-foreground)]"
                      : status === "error"
                        ? "bg-[var(--color-destructive)] text-[var(--color-destructive-foreground)]"
                        : "bg-[var(--color-muted)]",
                  )}
                >
                  {status === "ok" ? (
                    <Check className="size-4" aria-hidden />
                  ) : (
                    step.n
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{step.label}</p>
                  <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                    {step.desc}
                  </p>
                  {res ? <StepResultLine result={res} /> : null}
                </div>
                <Button
                  size="sm"
                  variant={status === "ok" ? "ghost" : "outline"}
                  disabled={running !== null}
                  onClick={() => runStep(step)}
                  aria-label={`Ejecutar ${step.label}`}
                >
                  {isRunning ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Play className="size-4" aria-hidden />
                  )}
                  {status === "ok" ? "Re-ejecutar" : "Ejecutar"}
                </Button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function StepResultLine({ result }: { result: StepResult }) {
  if (result.kind === "error") {
    return (
      <p className="mt-0.5 text-xs text-[var(--color-destructive)]">
        {result.message}
      </p>
    );
  }
  if (result.kind === "queued") {
    return (
      <p className="mt-0.5 text-xs text-[var(--color-success)]">
        Encolado
        {result.data.jobId ? ` · job ${result.data.jobId}` : ""}
      </p>
    );
  }
  const s = result.data;
  const hasError = s.errors.length > 0;
  return (
    <p
      className={cn(
        "mt-0.5 text-xs",
        hasError
          ? "text-[var(--color-destructive)]"
          : "text-[var(--color-success)]",
      )}
    >
      {s.created} creados · {s.processed} procesados · {s.skipped} omitidos
      {hasError ? ` · ${s.errors.length} con error` : ""}
    </p>
  );
}
