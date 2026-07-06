import type {
  IntegrationRun,
  IntegrationRunStatus,
} from "@/api/grs/integrations";
import { formatDateTime, humanizeKey } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/** Color del badge según el estado de la corrida (ok=verde, skipped=gris, error=rojo). */
export function runStatusVariant(
  status?: IntegrationRunStatus,
): "success" | "secondary" | "destructive" {
  return status === "ok"
    ? "success"
    : status === "skipped"
      ? "secondary"
      : "destructive";
}

/** Estado de la corrida en español para mostrar en el badge. */
export function runStatusLabel(status: IntegrationRunStatus): string {
  return status === "skipped" ? "omitido" : status;
}

/** Claves de contadores conocidas del backend → etiqueta en español. */
const COUNT_LABELS: Record<string, string> = {
  created: "Creados",
  updated: "Actualizados",
  skipped: "Omitidos",
  processed: "Procesados",
  results: "Resultados",
  events: "Pruebas",
  groups: "Grupos",
  athletes: "Atletas",
  clubs: "Clubes",
};

interface ErrorGroup {
  cause: string;
  subjects: string[];
}

/**
 * Agrupa errores "sujeto: causa" por causa. Los syncs por categoría fallan en
 * ráfaga por la misma razón (Arena caída, fechas fuera de rango…) y el
 * historial repetía el mismo mensaje N veces, una pared de texto ilegible.
 */
function groupErrors(errors: string[]): ErrorGroup[] {
  const groups = new Map<string, string[]>();
  for (const raw of errors) {
    const e = raw.trim();
    const i = e.indexOf(": ");
    const subject = i > 0 ? e.slice(0, i) : "";
    const cause = i > 0 ? e.slice(i + 2) : e;
    groups.set(cause, [...(groups.get(cause) ?? []), subject]);
  }
  return [...groups.entries()].map(([cause, subjects]) => ({
    cause,
    subjects: subjects.filter(Boolean),
  }));
}

/**
 * Errores de sync compactos: una línea por causa con contador; los elementos
 * afectados quedan colapsados en un <details>.
 */
export function SyncErrorList({
  errors,
  totalCount,
}: {
  errors: string[];
  /** errorCount del backend, por si supera a los errores listados. */
  totalCount?: number;
}) {
  const groups = groupErrors(errors);
  const extra = Math.max(0, (totalCount ?? errors.length) - errors.length);
  return (
    <div className="space-y-0.5 text-xs text-(--color-destructive)">
      {groups.map((g, i) =>
        g.subjects.length > 1 ? (
          <details key={i}>
            <summary className="cursor-pointer [overflow-wrap:anywhere] marker:text-(--color-muted-foreground)">
              <span className="font-semibold">{g.subjects.length}×</span> {g.cause}
            </summary>
            <p className="pt-0.5 pl-4 text-(--color-muted-foreground) [overflow-wrap:anywhere]">
              Afecta: {g.subjects.join(" · ")}
            </p>
          </details>
        ) : (
          <p key={i} className="[overflow-wrap:anywhere]">
            {g.subjects[0] ? `${g.subjects[0]}: ` : ""}
            {g.cause}
          </p>
        ),
      )}
      {extra > 0 && (
        <p className="text-(--color-muted-foreground)">…y {extra} errores más</p>
      )}
    </div>
  );
}

/** Línea de tiempo de las últimas corridas (más reciente arriba). */
export function RunHistory({ runs }: { runs?: IntegrationRun[] }) {
  if (!runs?.length) return null;
  const recent = [...runs].reverse();
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-(--color-muted-foreground)">
        Historial ({recent.length})
      </p>
      <ul className="space-y-1">
        {recent.map((run, i) => (
          <li
            key={i}
            className="rounded-md border border-(--color-border) px-2 py-1 text-xs"
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-(--color-muted-foreground)">
                {formatDateTime(run.at)}
              </span>
              <span className="font-medium">{run.stage}</span>
              <Badge
                variant={runStatusVariant(run.status)}
                className="text-[10px]"
              >
                {runStatusLabel(run.status)}
              </Badge>
              {run.counts && Object.keys(run.counts).length > 0 && (
                <span className="text-(--color-muted-foreground)">
                  {Object.entries(run.counts)
                    .map(([k, v]) => `${COUNT_LABELS[k] ?? humanizeKey(k)} ${v}`)
                    .join(" · ")}
                </span>
              )}
            </div>
            {run.errorCount > 0 && run.errors?.length ? (
              <div className="mt-0.5">
                <SyncErrorList errors={run.errors} totalCount={run.errorCount} />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
