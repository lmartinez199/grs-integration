import { formatDateTime, humanizeKey, looksLikeDate } from "@/lib/utils";

const HIDDEN_KEYS = new Set(["__v", "_id", "id", "createdAt", "updatedAt"]);

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
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-(--color-border)">
          {cols.map((col) => (
            <th
              key={col}
              className="pb-2 pr-4 text-left text-xs font-medium uppercase tracking-wide text-(--color-muted-foreground) last:pr-0"
            >
              {humanizeKey(col)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i} className="border-b border-(--color-border)/50 last:border-0">
            {cols.map((col) => (
              <td key={col} className="py-2 pr-4 align-top last:pr-0">
                {cellValue(row[col])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
