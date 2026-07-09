import { formatDateTime, humanizeKey, looksLikeDate } from "@/lib/utils";

const HIDDEN_KEYS = new Set(["__v", "_id", "id", "createdAt", "updatedAt"]);

/* Clases compartidas para tablas de datos, incluidas las ad-hoc
   (ArcoMonitor, SportTechPage), para que no diverjan entre paneles. */
export const tableClass = "w-full text-sm";
export const theadRowClass =
  "border-b border-(--color-border) text-left text-xs uppercase tracking-wide text-(--color-muted-foreground)";
export const thClass = "py-1.5 pr-3 font-medium last:pr-0";
export const tbodyRowClass = "border-b border-(--color-border)/50 last:border-0";
export const tdClass = "py-1.5 pr-3 align-top last:pr-0";

function cellValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string")
    return looksLikeDate(value) ? formatDateTime(value) : value;
  if (Array.isArray(value)) return `[${value.length}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, v]) => v !== null && typeof v !== "object",
    );
    return entries.map(([, v]) => String(v)).join(" · ") || "{…}";
  }
  return String(value);
}

/**
 * Renderiza un array de objetos como tabla compacta.
 * Extrae columnas de las claves del primer item; omite IDs técnicos.
 */
export function TableView({ data }: { data: Record<string, unknown>[] }) {
  if (!data.length) return <p className="text-sm text-(--color-muted-foreground)">Sin registros.</p>;

  const cols = Object.keys(data[0]).filter((k) => !HIDDEN_KEYS.has(k));

  return (
    <table className={tableClass}>
      <thead>
        <tr className={theadRowClass}>
          {cols.map((col) => (
            <th key={col} className={thClass}>
              {humanizeKey(col)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i} className={tbodyRowClass}>
            {cols.map((col) => (
              <td key={col} className={tdClass}>
                {cellValue(row[col])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
