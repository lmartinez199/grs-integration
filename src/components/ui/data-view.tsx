import { cn, formatDateTime, humanizeKey, looksLikeDate } from "@/lib/utils";

/** Renderiza un valor primitivo de forma amigable (sin llaves ni comillas). */
function formatPrimitive(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  // ponytail: heurística — enteros de 13 dígitos son epoch ms en estos payloads
  // (TIMESTAMP de las entregas de webhook); los de 10 dígitos (segundos) se
  // dejan crudos para no confundirlos con IDs.
  if (typeof value === "number")
    return value > 1e12 && value < 4e12
      ? formatDateTime(new Date(value).toISOString())
      : String(value);
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
  /** Items del array son colapsables con <details>. */
  collapsible?: boolean;
}

/** Claves que identifican al item (nombre, título…) — van primero en el resumen. */
const NAME_LIKE = /name|nombre|nome|title|label/i;

/** Genera un resumen de un objeto para el <summary> del item colapsable. */
function summarize(item: unknown): string {
  if (item === null || item === undefined) return "—";
  if (typeof item !== "object" || Array.isArray(item)) return String(item);
  const obj = item as Record<string, unknown>;
  // Sin vacíos (mostraban "Coach: —") y con los campos de nombre al frente,
  // para que un atleta se reconozca por su nombre y no por "External ID: 1".
  const flat = Object.entries(obj).filter(
    ([k, v]) => !HIDDEN_KEYS.has(k) && v !== null && v !== "" && typeof v !== "object",
  );
  const named = flat.filter(([k]) => NAME_LIKE.test(k));
  const rest = flat.filter(([k]) => !NAME_LIKE.test(k));
  return (
    [...named, ...rest]
      .slice(0, 4)
      .map(([k, v]) => `${humanizeKey(k)}: ${formatPrimitive(v)}`)
      .join(" · ") || "—"
  );
}

/**
 * Muestra cualquier objeto/array JSON de forma legible para usuarios no técnicos:
 * objetos como lista etiqueta→valor, arrays como conteo + tarjetas. Evita por
 * completo el JSON crudo con llaves y comillas.
 */
export function DataView({ data, className, showTechnical = false, collapsible = false }: DataViewProps) {
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
        {data.map((item, i) =>
          collapsible ? (
            <details key={i} className="rounded-md border bg-(--color-muted)/40">
              <summary className="cursor-pointer px-3 py-2 text-sm font-medium marker:text-(--color-muted-foreground)">
                {summarize(item)}
              </summary>
              <div className="border-t border-(--color-border) p-3">
                <DataView data={item} showTechnical={showTechnical} />
              </div>
            </details>
          ) : (
            <div key={i} className="rounded-md border bg-(--color-muted)/40 p-3">
              <DataView data={item} showTechnical={showTechnical} />
            </div>
          ),
        )}
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
            <div
              key={key}
              className={cn("flex min-w-0 flex-col gap-0.5", nested && "sm:col-span-2")}
            >
              <dt className="text-xs uppercase tracking-wide text-(--color-muted-foreground)">
                {humanizeKey(key)}
              </dt>
              <dd className="text-sm [overflow-wrap:anywhere]">
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
