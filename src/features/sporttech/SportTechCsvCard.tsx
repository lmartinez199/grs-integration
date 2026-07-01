import { useRef, useState } from "react";
import { CheckCircle2, FileUp } from "lucide-react";

import {
  sportTechSyncCsv,
  type SportTechEventSyncSummary,
} from "@/api/grs/sporttech";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Ingesta por CSV (export del proveedor) — vía alternativa al pull OVS. Sube el
 * archivo y corre el pipeline completo; la disciplina (artística/rítmica) la
 * detecta el backend del propio CSV, así que el mismo control sirve para las dos
 * disciplinas. `eventId` (el activo) es solo traza; si no hay, se usa el provider.
 */
/** Disciplina esperada según el provider de la página (sporttech-gar → GAR). */
function expectedDiscipline(provider: string): "GAR" | "GRY" | "" {
  if (provider.endsWith("gar")) return "GAR";
  if (provider.endsWith("gry")) return "GRY";
  return "";
}

export function SportTechCsvCard({
  eventId,
  provider,
}: {
  eventId: string;
  provider: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<SportTechEventSyncSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const traceId = eventId || provider;

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setSummary(null);
    try {
      setSummary(await sportTechSyncCsv(traceId, file));
    } catch (e) {
      setError((e as Error)?.message ?? "Error al procesar el CSV.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileUp className="size-4 text-(--color-primary)" />
          Ingesta por CSV
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-(--color-muted-foreground)">
          Vía alternativa al pull OVS: subí el CSV de export del proveedor
          (artística o rítmica). La disciplina se detecta del propio archivo. Corre
          el pipeline completo (estructura → participantes → grupos → start-lists →
          resultados). Idempotente.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setSummary(null);
              setError(null);
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            Elegir archivo…
          </Button>
          <span className="max-w-[20rem] truncate text-sm text-(--color-muted-foreground)">
            {file ? file.name : "Ningún archivo seleccionado"}
          </span>
          <Button size="sm" onClick={run} disabled={!file} loading={busy}>
            Procesar CSV
          </Button>
        </div>

        {error && (
          <p role="alert" className="text-sm text-(--color-destructive)">
            {error}
          </p>
        )}

        {summary?.discipline &&
          expectedDiscipline(provider) &&
          summary.discipline !== expectedDiscipline(provider) && (
            <p
              role="alert"
              className="rounded-md border border-(--color-warning)/40 bg-(--color-warning)/5 p-2 text-sm text-(--color-warning)"
            >
              El CSV es de <strong>{summary.discipline}</strong>, pero estás en la
              página de <strong>{expectedDiscipline(provider)}</strong>. Se procesó
              como {summary.discipline} y quedó registrado en esa disciplina, no en
              esta.
            </p>
          )}

        {summary && <CsvSummaryView summary={summary} />}
      </CardContent>
    </Card>
  );
}

/** Resumen del procesamiento del CSV: contadores + avisos. */
function CsvSummaryView({ summary }: { summary: SportTechEventSyncSummary }) {
  // Orden = el del pipeline (start-lists antes que resultados).
  const stats: [string, number | undefined][] = [
    ["competiciones", summary.competitions],
    ["units", summary.units],
    ["atletas", summary.athletes],
    ["grupos", summary.groups],
    ["start-lists", summary.startLists],
    ["resultados", summary.results],
    ["medallas", summary.awards],
  ];
  const ok = summary.errors.length === 0;
  return (
    <div className="space-y-3 rounded-md border border-(--color-border) p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        {ok ? (
          <>
            <CheckCircle2 className="size-4 text-(--color-success)" />
            Procesado sin errores
          </>
        ) : (
          <span className="text-(--color-warning)">
            Procesado con {summary.errors.length} aviso(s)
          </span>
        )}
        {summary.discipline && (
          <span className="text-(--color-muted-foreground)">
            · disciplina detectada: {summary.discipline}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-(--color-muted-foreground)">
        {stats
          .filter(([, v]) => v !== undefined)
          .map(([label, v]) => (
            <span key={label}>
              <strong className="text-(--color-foreground)">{v}</strong> {label}
            </span>
          ))}
      </div>
      {!ok && (
        <ul className="list-disc space-y-0.5 pl-5 text-xs text-(--color-muted-foreground)">
          {summary.errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
