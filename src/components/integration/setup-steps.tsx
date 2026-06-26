import { useState, type ReactNode } from "react";
import { Check, Loader2, Play, ListChecks, PlayCircle, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Setup por pasos con estado, compartido entre disciplinas (ath, judo/zempo).
 * El concepto es el mismo en todas: grupos fijos —«estructura» (crea el esqueleto
 * del evento en GRS), «entidades» (empuja los datos de la carga inicial) y
 * «resultados» (marcas/medallero, durante/después de la competencia)— renderizados
 * como una lista de pasos con su resultado y opción de re-ejecutar. Lo que cambia
 * por disciplina es solo la lista de pasos (datos), no la UI.
 */

export type StepGroup = "estructura" | "entidades" | "resultados";

/** Resumen estándar de un paso (created/processed/skipped + errores). */
export interface StepSummary {
  processed: number;
  created: number;
  /** Actualizados (opcional; lo usan syncs que distinguen crear de actualizar). */
  updated?: number;
  skipped: number;
  errors: string[];
  /**
   * Resumen legible que REEMPLAZA la línea genérica de conteos (cuando el sync
   * tiene métricas propias, p. ej. gimnasia: "14 units · 7 conjuntos · 24 medallas").
   */
  label?: string;
}

/** Lo que devuelve `run` en caso de éxito. El error lo añade el catch interno. */
export type StepRunResult =
  | { kind: "summary"; data: StepSummary }
  | { kind: "queued"; data: { jobId?: string } }
  /** Éxito sin conteos (p. ej. Arena devuelve solo { ok: true }). */
  | { kind: "ok" };

/** Resultado persistido de un paso (éxito, encolado, ok o error). */
export type StepResult =
  | { kind: "summary"; data: StepSummary }
  | { kind: "queued"; data: { jobId?: string } }
  | { kind: "ok" }
  | { kind: "error"; message: string };

export interface SetupStep<Ctx> {
  key: string;
  label: string;
  desc: string;
  group: StepGroup;
  /** Sello a la izquierda; si falta, se autonumera dentro del grupo. */
  badge?: string;
  /** Valida el contexto antes de correr; devuelve un mensaje de error o null. */
  requires?: (ctx: Ctx) => string | null;
  run: (ctx: Ctx) => Promise<StepRunResult>;
}

interface SetupStepsProps<Ctx> {
  title?: string;
  description?: ReactNode;
  icon?: ReactNode;
  steps: SetupStep<Ctx>[];
  ctx: Ctx;
  results: Record<string, StepResult>;
  onResult: (key: string, result: StepResult) => void;
  /** Cabecera opcional (inputs de contexto, p. ej. eventCode). */
  header?: ReactNode;
}

const GROUP_META: Record<StepGroup, { title: string; desc: string }> = {
  estructura: {
    title: "Estructura del evento",
    desc: "Crea el esqueleto en GRS: competiciones, fases y unidades.",
  },
  entidades: {
    title: "Entidades y datos",
    desc: "Carga inicial del evento: organizaciones, participantes…",
  },
  resultados: {
    title: "Resultados",
    desc: "Marcas, estado y medallero — se disparan durante/después de la competencia, no en la carga inicial.",
  },
};

const GROUP_ORDER: StepGroup[] = ["estructura", "entidades", "resultados"];

function stepStatus(r: StepResult | undefined): "ok" | "error" | "idle" {
  if (!r) return "idle";
  if (r.kind === "error") return "error";
  if (r.kind === "summary") return r.data.errors.length > 0 ? "error" : "ok";
  return "ok";
}

export function SetupSteps<Ctx>({
  title = "Setup del evento",
  description,
  icon,
  steps,
  ctx,
  results,
  onResult,
  header,
}: SetupStepsProps<Ctx>) {
  const [running, setRunning] = useState<string | null>(null);

  /** Ejecuta un paso. Devuelve true si terminó sin error (para el «ejecutar todo»). */
  async function runStep(step: SetupStep<Ctx>): Promise<boolean> {
    const reqError = step.requires?.(ctx);
    if (reqError) {
      toast.error(reqError);
      return false;
    }

    setRunning(step.key);
    try {
      const res = await step.run(ctx);
      onResult(step.key, res);

      if (res.kind === "summary") {
        const s = res.data;
        if (s.errors.length > 0) {
          toast.error(`${step.label}: ${s.errors.length} con error`);
          return false;
        }
        toast.success(
          s.label
            ? `${step.label}: ${s.label}`
            : `${step.label}: ${s.created} creados${s.updated ? ` · ${s.updated} actualizados` : ""} · ${s.processed} procesados${s.skipped ? ` · ${s.skipped} omitidos` : ""}`,
        );
      } else if (res.kind === "queued") {
        toast.success(
          `${step.label}: encolado${res.data.jobId ? ` (job ${res.data.jobId})` : ""}`,
        );
      } else {
        toast.success(`${step.label}: hecho`);
      }
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error desconocido";
      onResult(step.key, { kind: "error", message });
      toast.error(`${step.label}: ${message}`);
      return false;
    } finally {
      setRunning(null);
    }
  }

  /** Ejecuta en orden todos los pasos de un grupo, deteniéndose ante el primer error. */
  async function runGroup(group: StepGroup) {
    const groupSteps = steps.filter((s) => s.group === group);
    for (const step of groupSteps) {
      const ok = await runStep(step);
      if (!ok) {
        toast.error(`Secuencia detenida en «${step.label}».`);
        return;
      }
    }
    toast.success(`${GROUP_META[group].title}: secuencia completada.`);
  }

  const busy = running !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon ?? <ListChecks className="size-4 text-(--color-primary)" aria-hidden />}
          {title}
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {header}

        {GROUP_ORDER.map((group) => {
          const groupSteps = steps.filter((s) => s.group === group);
          if (groupSteps.length === 0) return null;
          const meta = GROUP_META[group];
          return (
            <section key={group} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">{meta.title}</h3>
                  <p className="text-xs text-(--color-muted-foreground)">{meta.desc}</p>
                </div>
                {groupSteps.length >= 2 && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => runGroup(group)}
                  >
                    <PlayCircle className="size-4" aria-hidden />
                    Ejecutar todo
                  </Button>
                )}
              </div>

              <ul className="space-y-1.5">
                {groupSteps.map((step, i) => {
                  const res = results[step.key];
                  const status = stepStatus(res);
                  const isRunning = running === step.key;
                  const badge = step.badge ?? String(i + 1);
                  return (
                    <li
                      key={step.key}
                      className={cn(
                        "flex items-center gap-3 rounded-md border px-3 py-2 transition-colors",
                        status === "ok"
                          ? "border-(--color-success)/40 bg-(--color-success)/5"
                          : status === "error"
                            ? "border-(--color-destructive)/40"
                            : "border-(--color-border)",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                          status === "ok"
                            ? "bg-(--color-success) text-(--color-success-foreground)"
                            : status === "error"
                              ? "bg-(--color-destructive) text-(--color-destructive-foreground)"
                              : "bg-(--color-muted)",
                        )}
                      >
                        {status === "ok" ? <Check className="size-4" aria-hidden /> : badge}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{step.label}</p>
                        <p className="truncate text-xs text-(--color-muted-foreground)">
                          {step.desc}
                        </p>
                        {res ? <StepResultLine result={res} /> : null}
                      </div>
                      <Button
                        size="sm"
                        variant={status === "ok" ? "ghost" : "outline"}
                        disabled={busy}
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
            </section>
          );
        })}
      </CardContent>
    </Card>
  );
}

/** Cuántos mensajes de error se listan antes de resumir el resto con «y N más». */
const MAX_ERRORS_SHOWN = 5;

function StepResultLine({ result }: { result: StepResult }) {
  const [showErrors, setShowErrors] = useState(false);
  const [showAll, setShowAll] = useState(false);

  if (result.kind === "error") {
    return (
      <p className="mt-0.5 text-xs text-(--color-destructive)">{result.message}</p>
    );
  }
  if (result.kind === "queued") {
    return (
      <p className="mt-0.5 text-xs text-(--color-success)">
        Encolado{result.data.jobId ? ` · job ${result.data.jobId}` : ""}
      </p>
    );
  }
  if (result.kind === "ok") {
    return <p className="mt-0.5 text-xs text-(--color-success)">Hecho ✓</p>;
  }

  const s = result.data;
  const hasError = s.errors.length > 0;
  const visible = showAll ? s.errors : s.errors.slice(0, MAX_ERRORS_SHOWN);
  const rest = s.errors.length - visible.length;
  const collapsible = s.errors.length > MAX_ERRORS_SHOWN;

  return (
    <div className="mt-0.5 space-y-1">
      <p
        className={cn(
          "text-xs",
          hasError ? "text-(--color-destructive)" : "text-(--color-success)",
        )}
      >
        {s.label ??
          `${s.created} creados${s.updated ? ` · ${s.updated} actualizados` : ""} · ${s.processed} procesados${s.skipped ? ` · ${s.skipped} omitidos` : ""}`}
        {hasError ? ` · ${s.errors.length} con error` : ""}
      </p>

      {hasError ? (
        <div className="text-xs">
          <button
            type="button"
            onClick={() => setShowErrors((v) => !v)}
            className="inline-flex items-center gap-1 text-(--color-destructive) hover:underline"
            aria-expanded={showErrors}
          >
            <ChevronRight
              className={cn("size-3 transition-transform", showErrors && "rotate-90")}
              aria-hidden
            />
            {showErrors ? "Ocultar errores" : `Ver errores (${s.errors.length})`}
          </button>
          {showErrors ? (
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-(--color-muted-foreground)">
              {visible.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
              {collapsible ? (
                <li className="list-none">
                  <button
                    type="button"
                    onClick={() => setShowAll((v) => !v)}
                    className="italic text-(--color-destructive) hover:underline"
                  >
                    {showAll ? "Ver menos" : `Ver ${rest} más…`}
                  </button>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
