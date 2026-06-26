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
                {run.status}
              </Badge>
              {run.counts && Object.keys(run.counts).length > 0 && (
                <span className="text-(--color-muted-foreground)">
                  {Object.entries(run.counts)
                    .map(([k, v]) => `${humanizeKey(k)} ${v}`)
                    .join(" · ")}
                </span>
              )}
            </div>
            {run.errorCount > 0 && run.errors?.length ? (
              <ul className="mt-0.5 list-disc pl-4 text-(--color-destructive)">
                {run.errors.map((e, j) => (
                  <li key={j}>{e}</li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
