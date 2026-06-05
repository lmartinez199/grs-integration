import { cn, formatDateTime, humanizeKey, looksLikeDate } from "@/lib/utils";

/** Renderiza un valor primitivo de forma amigable (sin llaves ni comillas). */
function formatPrimitive(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return looksLikeDate(value) ? formatDateTime(value) : value;
  return String(value);
}

/** Claves técnicas que normalmente no aportan nada al usuario final. */
const HIDDEN_KEYS = new Set(["__v", "_id", "id", "createdAt", "updatedAt"]);

interface DataViewProps {
  data: unknown;
  className?: string;
  /** Mostrar claves técnicas (id, _id, etc.). Por defecto se ocultan. */
  showTechnical?: boolean;
}

/**
 * Muestra cualquier objeto/array JSON de forma legible para usuarios no técnicos:
 * objetos como lista etiqueta→valor, arrays como conteo + tarjetas. Evita por
 * completo el JSON crudo con llaves y comillas.
 */
export function DataView({ data, className, showTechnical = false }: DataViewProps) {
  if (data === null || data === undefined) {
    return <p className={cn("text-sm text-(--color-muted-foreground)", className)}>Sin datos.</p>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return (
        <p className={cn("text-sm text-(--color-muted-foreground)", className)}>
          Sin elementos.
        </p>
      );
    }
    return (
      <div className={cn("space-y-2", className)}>
        {data.map((item, i) => (
          <div key={i} className="rounded-md border bg-(--color-muted)/40 p-3">
            <DataView data={item} showTechnical={showTechnical} />
          </div>
        ))}
      </div>
    );
  }

  if (typeof data === "object") {
    const entries = Object.entries(data as Record<string, unknown>).filter(
      ([k]) => showTechnical || !HIDDEN_KEYS.has(k),
    );
    if (entries.length === 0) {
      return <p className="text-sm text-(--color-muted-foreground)">—</p>;
    }
    return (
      <dl className={cn("grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2", className)}>
        {entries.map(([key, value]) => {
          const nested = value !== null && typeof value === "object";
          return (
            <div key={key} className={cn("flex flex-col gap-0.5", nested && "sm:col-span-2")}>
              <dt className="text-xs uppercase tracking-wide text-(--color-muted-foreground)">
                {humanizeKey(key)}
              </dt>
              <dd className="text-sm">
                {nested ? (
                  <div className="mt-1 border-l-2 border-(--color-border) pl-3">
                    <DataView data={value} showTechnical={showTechnical} />
                  </div>
                ) : (
                  <span className="font-medium">{formatPrimitive(value)}</span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    );
  }

  // Primitivo suelto.
  return <span className={cn("text-sm font-medium", className)}>{formatPrimitive(data)}</span>;
}
